import { z } from "zod";
import {
    createTRPCRouter,
    publicProcedure,
    protectedProcedure,
} from "@mce-quiz/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { ee, EVENTS } from "@mce-quiz/server/events";
import { pusher } from "@/server/pusher";

// Helper: fetch full game state for a session
export async function getSessionGameState(db: any, sessionId: string) {
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

    // Build leaderboard
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

export const gameRouter = createTRPCRouter({
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
                if (player.class !== input.class) {
                    player = await ctx.db.player.update({
                        where: { id: player.id },
                        data: { class: input.class }
                    });
                }
            }

            console.log(`Player joined: ${player.name} (${player.id}) to session ${session.id} status ${session.status}`);

            // Trigger Pusher update
            const state = await getSessionGameState(ctx.db, session.id);
            await pusher.trigger(`session-${session.id}`, "update", state);

            return {
                token: player.id,
                playerId: player.id,
                sessionId: session.id,
                status: session.status,
                currentQuestion: state.currentQuestion
            };
        }),

    onSessionUpdate: publicProcedure
        .input(z.object({ sessionId: z.string() }))
        .subscription(async function* ({ ctx, input }) {
            const initialState = await getSessionGameState(ctx.db, input.sessionId);
            yield initialState;

            let lastQuestionId = initialState.currentQuestion?.id ?? null;
            let lastStatus = initialState.status;
            let lastPlayerCount = initialState.leaderboard.length;

            const DB_POLL_INTERVAL = 5000;
            const MAX_LIFETIME = 55000;

            let shouldStop = false;
            const startTime = Date.now();
            let resolveWait: (() => void) | null = null;

            const onEvent = (data: { sessionId: string }) => {
                if (data.sessionId === input.sessionId) {
                    if (resolveWait) {
                        resolveWait();
                        resolveWait = null;
                    }
                }
            };
            ee.on(EVENTS.SESSION_UPDATE, onEvent);

            try {
                while (!shouldStop) {
                    if (Date.now() - startTime > MAX_LIFETIME) {
                        break;
                    }

                    const now = Date.now();
                    const msUntilNextSlot = DB_POLL_INTERVAL - (now % DB_POLL_INTERVAL);
                    await new Promise<void>((resolve) => {
                        resolveWait = resolve;
                        setTimeout(resolve, msUntilNextSlot);
                    });

                    try {
                        const state = await getSessionGameState(ctx.db, input.sessionId);

                        const currentQId = state.currentQuestion?.id ?? null;
                        const hasChanged =
                            currentQId !== lastQuestionId ||
                            state.status !== lastStatus ||
                            state.leaderboard.length !== lastPlayerCount;

                        if (hasChanged) {
                            yield state;
                            lastQuestionId = currentQId;
                            lastStatus = state.status;
                            lastPlayerCount = state.leaderboard.length;
                        }

                        if (state.status === "ENDED") {
                            shouldStop = true;
                        }
                    } catch {
                        // DB error
                    }
                }
            } finally {
                ee.off(EVENTS.SESSION_UPDATE, onEvent);
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

            const existingAnswer = await ctx.db.answer.findFirst({
                where: { playerId: input.playerId, questionId: input.questionId }
            });
            if (existingAnswer) {
                return existingAnswer;
            }

            const option = question.options.find(o => o.id === input.optionId);
            if (!option) throw new TRPCError({ code: "NOT_FOUND", message: "Option not found" });

            const isCorrect = option.isCorrect;
            const questionStartTime = session.currentQuestionStartTime
                ? new Date(session.currentQuestionStartTime).getTime()
                : now;

            const timeTakenMs = Math.max(0, now - questionStartTime);
            const timeLimitMs = (question.timeLimit || 10) * 1000;

            let score = 0;
            if (isCorrect) {
                const baseScore = question.baseScore || 1000;
                const timeRatio = Math.min(1, timeTakenMs / timeLimitMs);
                score = Math.round(baseScore * 0.6 + baseScore * 0.4 * (1 - timeRatio));
            }

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

            if (score > 0) {
                await ctx.db.player.update({
                    where: { id: input.playerId },
                    data: { score: { increment: score } }
                });
            }

            // Trigger Pusher update (async to not block response)
            // We fetch the full state again to broadcast leaderboard changes
            void getSessionGameState(ctx.db, input.sessionId).then(state => {
                void pusher.trigger(`session-${input.sessionId}`, "update", state);
            });

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
