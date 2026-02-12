import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@mce-quiz/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { ee, EVENTS } from "@mce-quiz/server/events";
import { on } from "events";

// Shared helper: fetch full game state for a session (used by both polling query and SSE subscription)
async function getSessionGameState(db: any, sessionId: string) {
    const session = await db.gameSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: {
            quiz: {
                include: {
                    questions: {
                        include: { options: true },
                        orderBy: { order: "asc" },
                    },
                },
            },
            players: {
                orderBy: { score: "desc" },
                select: { id: true, name: true, class: true, score: true },
            },
        },
    });

    let currentQuestion = null;
    let questionIndex = 0;
    const totalQuestions = session.quiz.questions.length;

    if (session.currentQuestionId) {
        const idx = session.quiz.questions.findIndex(
            (q: any) => q.id === session.currentQuestionId
        );
        if (idx !== -1) {
            currentQuestion = session.quiz.questions[idx];
            questionIndex = idx + 1;
        }
    }

    // Build leaderboard (always include so players can see rankings)
    const leaderboard = session.players.map((p: any, i: number) => ({
        rank: i + 1,
        name: p.name as string,
        class: p.class as string,
        score: p.score as number,
        playerId: p.id as string,
    }));

    return {
        status: session.status as string,
        currentQuestion,
        questionStartTime: session.currentQuestionStartTime?.toISOString() ?? null,
        timeLimit: (currentQuestion?.timeLimit ?? 10) as number,
        questionIndex,
        totalQuestions,
        leaderboard,
    };
}

export const quizRouter = createTRPCRouter({
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1),
                description: z.string().optional(),
                questions: z.array(
                    z.object({
                        text: z.string().min(1),
                        type: z.enum(["PROGRAM_OUTPUT", "CODE_CORRECTION", "KNOWLEDGE"]),
                        codeSnippet: z.string().optional(),
                        timeLimit: z.number().min(5).optional(),
                        baseScore: z.number().min(100).optional(),
                        options: z.array(
                            z.object({
                                text: z.string(),
                                isCorrect: z.boolean(),
                            })
                        ),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Create quiz with questions and options
            // This will fail type check until prisma format is run
            return ctx.db.quiz.create({
                data: {
                    title: input.title,
                    description: input.description,
                    createdBy: { connect: { id: ctx.session.user.id } },
                    questions: {
                        create: input.questions.map((q, index) => ({
                            text: q.text,
                            type: q.type,
                            codeSnippet: q.codeSnippet,
                            timeLimit: q.timeLimit ?? 10,
                            baseScore: q.baseScore ?? 1000,
                            order: index,
                            options: {
                                create: q.options,
                            },
                        })),
                    },
                },
            });
        }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.quiz.findMany({
            where: { createdBy: { id: ctx.session.user.id } },
            include: { _count: { select: { questions: true } } }
        });
    }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.quiz.findUnique({
                where: { id: input.id },
                include: { questions: { include: { options: true } } },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.quiz.delete({
                where: { id: input.id },
            });
        }),

    joinSession: publicProcedure
        .input(z.object({
            code: z.string(),
            name: z.string(),
            class: z.enum(["E27", "E29", "E37A", "E37B"])
        }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.gameSession.findUnique({
                where: { code: input.code },
                include: {
                    quiz: {
                        include: {
                            questions: {
                                include: { options: true }
                            }
                        }
                    }
                }
            });

            if (!session) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
            }

            if (session.status !== "WAITING" && session.status !== "ACTIVE") {
                // Allow joining active sessions too (late joiners)
                throw new TRPCError({ code: "FORBIDDEN", message: "Session is closed" });
            }

            let player = await ctx.db.player.findUnique({
                where: {
                    sessionId_name: {
                        sessionId: session.id,
                        name: input.name
                    }
                }
            });

            if (!player) {
                player = await ctx.db.player.create({
                    data: {
                        name: input.name,
                        class: input.class,
                        session: { connect: { id: session.id } },
                    },
                });
            } else {
                // Update class if re-joining? Or just keep existing? 
                // Let's update it in case they picked wrong one first time (if they manage to rejoin)
                if (player.class !== input.class) {
                    player = await ctx.db.player.update({
                        where: { id: player.id },
                        data: { class: input.class }
                    });
                }
            }

            console.log(`Player joined: ${player.name} (${player.id}) to session ${session.id} status ${session.status}`);

            let currentQuestion = null;
            if (session.currentQuestionId) {
                currentQuestion = session.quiz.questions.find(q => q.id === session.currentQuestionId);
            }

            return {
                token: player.id,
                playerId: player.id,
                sessionId: session.id,
                status: session.status,
                currentQuestion: currentQuestion
            };
        }),

    onSessionUpdate: publicProcedure
        .input(z.object({ sessionId: z.string() }))
        .subscription(async function* ({ ctx, input }) {
            // Yield the current state immediately on connect
            yield await getSessionGameState(ctx.db, input.sessionId);

            // Then listen for updates and yield fresh state
            for await (const [data] of on(ee, EVENTS.SESSION_UPDATE)) {
                const update = data as { sessionId: string };
                if (update.sessionId === input.sessionId) {
                    yield await getSessionGameState(ctx.db, input.sessionId);
                }
            }
        }),

    submitAnswer: publicProcedure
        .input(z.object({
            sessionId: z.string(),
            playerId: z.string(),
            questionId: z.string(),
            optionId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const now = Date.now();

            // Get session with currentQuestionStartTime and the question's timeLimit
            const session = await ctx.db.gameSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: {
                    quiz: {
                        include: {
                            questions: {
                                where: { id: input.questionId },
                                include: { options: true }
                            }
                        }
                    }
                }
            });

            const question = session.quiz.questions[0];
            if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

            // Check if already answered this question
            const existingAnswer = await ctx.db.answer.findFirst({
                where: { playerId: input.playerId, questionId: input.questionId }
            });
            if (existingAnswer) {
                return existingAnswer; // Already answered, return existing
            }

            const option = question.options.find(o => o.id === input.optionId);
            if (!option) throw new TRPCError({ code: "NOT_FOUND", message: "Option not found" });

            const isCorrect = option.isCorrect;

            // Server-side time calculation
            const questionStartTime = session.currentQuestionStartTime
                ? new Date(session.currentQuestionStartTime).getTime()
                : now; // fallback

            const timeTakenMs = Math.max(0, now - questionStartTime);
            const timeLimitMs = (question.timeLimit || 10) * 1000;

            // Score calculation: 60% base + 40% time bonus (using per-question baseScore)
            let score = 0;
            if (isCorrect) {
                const baseScore = question.baseScore || 1000;
                const timeRatio = Math.min(1, timeTakenMs / timeLimitMs);
                score = Math.round(baseScore * 0.6 + baseScore * 0.4 * (1 - timeRatio));
            }

            // Create answer record with score
            const answer = await ctx.db.answer.create({
                data: {
                    playerId: input.playerId,
                    questionId: input.questionId,
                    selectedOptionId: input.optionId,
                    isCorrect,
                    timeTaken: Math.round(timeTakenMs),
                    score,
                }
            });

            // Update player total score
            if (score > 0) {
                await ctx.db.player.update({
                    where: { id: input.playerId },
                    data: { score: { increment: score } }
                });
            }

            return answer;
        }),

    getGameState: publicProcedure
        .input(z.object({ playerId: z.string() }))
        .query(async ({ ctx, input }) => {
            const player = await ctx.db.player.findUnique({
                where: { id: input.playerId },
                select: { sessionId: true },
            });

            if (!player) return null;

            return getSessionGameState(ctx.db, player.sessionId);
        }),
});
