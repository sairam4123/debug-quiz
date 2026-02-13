import { z } from "zod";
import {
    createTRPCRouter,
    publicProcedure,
    protectedProcedure,
} from "@mce-quiz/server/api/trpc";

import { TRPCError } from "@trpc/server";
import { ee, EVENTS } from "@mce-quiz/server/events";
import { pusher } from "@/server/pusher";
import type { Player, PrismaClient } from "generated/prisma";

// Helper: fetch full game state for a session
export async function getSessionGameState(db: PrismaClient, sessionId: string) {
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
                select: { id: true, name: true, class: true, score: true, lastActive: true },
            },

            currentQuestion: {
                include: {
                    options: true
                }
            }
        },
    });

    let currentQuestion = null;
    let questionIndex = 0;
    const totalQuestions = session.quiz.questions.length;
    let status = session.status;
    let effectiveStartTime = session.startTime?.toISOString() ?? null;

    // Simplified Logic: State is driven by explicit DB updates, not time
    if (session.status === "ACTIVE") {
        currentQuestion = session.currentQuestion;
        if (currentQuestion) {
            questionIndex = currentQuestion.order + 1; // Assuming order is 0-based index
            // If order is distinct from index, we might need to find index in array
            const idx = session.quiz.questions.findIndex((q: { id: string }) => q.id === currentQuestion!.id);
            if (idx !== -1) questionIndex = idx + 1;

            effectiveStartTime = session.currentQuestionStartTime?.toISOString() ?? new Date().toISOString();
        } else {
            // Should not happen in ACTIVE unless waiting for first Q? 
            // Stick to what DB says.
        }
    } else if (session.status === "WAITING") {
        currentQuestion = null;
        questionIndex = 0;
    } else {
        // ENDED
        currentQuestion = null;
        questionIndex = 0;
    }

    // Build leaderboard
    const leaderboard = session.players.map((p, i) => ({
        rank: i + 1,
        name: p.name,
        class: p.class,
        score: p.score,
        playerId: p.id,
        lastActive: p.lastActive ? p.lastActive.toISOString() : null,
    }));

    // Calculate History Mode
    // We are in history mode if currently active question is BEFORE the highest reached
    // But now we just move currentQuestionId, so "History" might just be "we rewound".
    // Let's keep the flag: if currentQuestion.order < highestQuestionOrder
    const isHistory = currentQuestion && currentQuestion.order < (session.highestQuestionOrder || 0);

    // Calculate Answer Distribution (Only needed for INTERMISSION)
    let answerDistribution: Record<string, number> | null = null;
    let correctAnswerId: string | null = null;

    if (session.status === "INTERMISSION" && currentQuestion) {
        // Find correct option for current question
        const correctOption = session.quiz.questions
            .find(q => q.id === currentQuestion!.id)
            ?.options.find(o => o.isCorrect);

        correctAnswerId = correctOption?.id ?? null;

        // Aggregate answers
        const answers = await db.answer.groupBy({
            by: ['selectedOptionId'],
            where: {
                questionId: currentQuestion.id,
                playerId: { in: session.players.map(p => p.id) } // Only current session players
            },
            _count: {
                selectedOptionId: true
            }
        });

        answerDistribution = {};
        answers.forEach((a: { selectedOptionId: string; _count: { selectedOptionId: number; }; }) => {
            if (a.selectedOptionId) {
                answerDistribution![a.selectedOptionId] = a._count.selectedOptionId;
            }
        });
    }

    return {
        status: status as string,
        currentQuestion,
        questionStartTime: effectiveStartTime,
        timeLimit: (currentQuestion?.timeLimit ?? 10) as number,
        questionIndex,
        totalQuestions,
        leaderboard,
        mode: session.mode,
        today: true, // Placeholder or logic for "today"
        isHistory: !!isHistory,
        serverTime: new Date().toISOString(),
        highestQuestionOrder: session.highestQuestionOrder ?? 0,
        answerDistribution,
        correctAnswerId
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

            console.log(`Player joined: ${player.name} (${player.id}) to session ${session.id} status ${session.status} `);

            // Trigger Pusher update
            const state = await getSessionGameState(ctx.db, session.id);
            try {
                await pusher.trigger(`session - ${session.id} `, "update", state);
            } catch (e) {
                console.error("Failed to trigger Pusher update:", e);
            }

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
            console.log(`[SUBSCRIPTION - START] sessionId = ${input.sessionId} time = ${new Date().toISOString()} `);
            let initialState: any;
            try {
                initialState = await getSessionGameState(ctx.db, input.sessionId);
                yield initialState;
            } catch (e) {
                console.error("Error in onSessionUpdate initial yield:", e);
                // If initial fetch fails, maybe wait and try once more or just return to let client handle retry (delayed)
                // But client retries immediately -> spam.
                // Let's yield null or something? No, type safety.
                // Throwing here causes the close.
                throw e;
            }

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

                    // Dynamic Polling: 3s for ACTIVE, 10s for others to save resources
                    const currentPollInterval = lastStatus === "ACTIVE" ? 3000 : 10000;

                    const now = Date.now();
                    const msUntilNextSlot = currentPollInterval - (now % currentPollInterval);
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
                    } catch (e) {
                        console.error("Error in onSessionUpdate poll:", e);
                    }
                }
            } finally {
                ee.off(EVENTS.SESSION_UPDATE, onEvent);
                console.log(`[SUBSCRIPTION - END] sessionId = ${input.sessionId} time = ${new Date().toISOString()} `);
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

            // Fetch session with ALL questions to calculate offsets
            const session = await ctx.db.gameSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: {
                    quiz: {
                        include: {
                            questions: {
                                include: { options: true },
                                orderBy: { order: 'asc' }
                            }
                        }
                    }
                }
            });

            const question = session.quiz.questions.find((q: { id: string; }) => q.id === input.questionId);
            if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

            const existingAnswer = await ctx.db.answer.findFirst({
                where: { playerId: input.playerId, questionId: input.questionId }
            });
            if (existingAnswer) {
                return existingAnswer;
            }

            const option = question.options.find((o: { id: string; }) => o.id === input.optionId);
            if (!option) throw new TRPCError({ code: "NOT_FOUND", message: "Option not found" });

            // History Mode Check
            if (question.order < (session.highestQuestionOrder || 0)) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Cannot submit answer in History/Review mode."
                });
            }

            // Update High-Water Mark Logic
            if (question.order > (session.highestQuestionOrder || 0)) {
                await ctx.db.gameSession.update({
                    where: { id: input.sessionId },
                    data: { highestQuestionOrder: question.order }
                });
            }

            // Verify answering the CURRENT question to ensure timing is correct
            if (session.currentQuestionId && session.currentQuestionId !== question.id) {
                // Changing this to just log or ignore might be safer, but for scoring we need accuracy.
                // If they are answering a different question, we can't score based on currentQuestionStartTime.
                // But generally clients only show current question.
            }

            const questionStartTime = session.currentQuestionStartTime ? new Date(session.currentQuestionStartTime).getTime() : now;

            const timeTakenMs = Math.max(0, now - questionStartTime);
            const timeLimitMs = (question.timeLimit || 10) * 1000;

            const isCorrect = option.isCorrect;
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
            void getSessionGameState(ctx.db, input.sessionId).then(async (state) => {
                try {
                    await pusher.trigger(`session - ${input.sessionId} `, "update", state);
                } catch (e) {
                    console.error("Failed to trigger Pusher update:", e);
                }
            });

            return answer;
        }),

    keepAlive: publicProcedure
        .input(z.object({ playerId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const player = await ctx.db.player.findUnique({
                where: { id: input.playerId },
                select: { lastActive: true }
            });

            if (player) {
                const now = new Date();
                const lastActive = player.lastActive ? player.lastActive.getTime() : 0;
                if (now.getTime() - lastActive > 30000) {
                    await ctx.db.player.update({
                        where: { id: input.playerId },
                        data: { lastActive: now }
                    });
                }
            }
            return { success: true };
        }),

    getGameState: publicProcedure
        .input(z.object({ playerId: z.string() }))
        .query(async ({ ctx, input }) => {
            const player = await ctx.db.player.findUnique({
                where: { id: input.playerId },
                select: { sessionId: true, lastActive: true },
            });

            if (!player) return null;

            // Update lastActive on poll (Throttled to 30s)
            const now = new Date();
            const lastActive = player.lastActive ? player.lastActive.getTime() : 0;
            if (now.getTime() - lastActive > 30000) {
                await ctx.db.player.update({
                    where: { id: input.playerId },
                    data: { lastActive: now }
                }).catch(() => { }); // Ignore errors
            }

            return getSessionGameState(ctx.db, player.sessionId);
        }),
});
