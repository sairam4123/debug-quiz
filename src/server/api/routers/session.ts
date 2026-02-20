import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@mce-quiz/server/api/trpc";
import { ee, EVENTS } from "@mce-quiz/server/events";
import { TRPCError } from "@trpc/server";
import { pusher } from "@/server/pusher";
import { getSessionGameState } from "./game";

export const sessionRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({ quizId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            return ctx.db.gameSession.create({
                data: {
                    quizId: input.quizId,
                    code,
                    status: "WAITING",
                },
            });
        }),

    start: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.gameSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } }
            });

            if (session.quiz.questions.length === 0) {
                throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Quiz has no questions!" });
            }

            const firstQuestion = session.quiz.questions[0];

            const updatedSession = await ctx.db.gameSession.update({
                where: { id: input.sessionId },
                data: {
                    status: "ACTIVE",
                    startTime: new Date(),
                    currentQuestionId: firstQuestion?.id,
                    currentQuestionStartTime: new Date(),
                    highestQuestionOrder: firstQuestion?.order ?? 0,
                },
            });

            ee.emit(EVENTS.SESSION_UPDATE, {
                sessionId: input.sessionId,
                type: "STATUS_CHANGE",
                payload: { status: "ACTIVE", currentQuestion: firstQuestion }
            });

            // Trigger Pusher update
            const state = await getSessionGameState(ctx.db, input.sessionId);
            await pusher.trigger(`session-${input.sessionId}`, "update", state);

            return updatedSession;
        }),

    next: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.gameSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: { quiz: { include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } } } }
            });
            const now = Date.now();

            // Intermission Logic
            // If currently ACTIVE and stats enabled -> switch to INTERMISSION
            if (session.status === "ACTIVE" && session.quiz.showIntermediateStats) {
                await ctx.db.gameSession.update({
                    where: { id: input.sessionId },
                    data: {
                        status: "INTERMISSION"
                    }
                });

                ee.emit(EVENTS.SESSION_UPDATE, {
                    sessionId: input.sessionId,
                    type: "STATUS_CHANGE",
                    payload: { status: "INTERMISSION" }
                });

                const state = await getSessionGameState(ctx.db, input.sessionId);
                await pusher.trigger(`session-${input.sessionId}`, "update", state);

                return { success: true, status: "INTERMISSION" };
            }

            // If INTERMISSION or (ACTIVE and stats disabled) -> Move to Next Question
            // (Existing logic follows)

            const currentQ = await ctx.db.question.findUnique({
                where: { id: session.currentQuestionId ?? "" }
            });

            // Find current index
            let currentIndex = -1;
            if (currentQ) {
                currentIndex = session.quiz.questions.findIndex(q => q.id === currentQ.id);
            }

            const targetIndex = currentIndex + 1;
            const questions = session.quiz.questions;

            if (targetIndex >= questions.length) {
                // End Session
                await ctx.db.gameSession.update({
                    where: { id: input.sessionId },
                    data: { status: "ENDED", endTime: new Date() }
                });

                ee.emit(EVENTS.SESSION_UPDATE, {
                    sessionId: input.sessionId,
                    type: "STATUS_CHANGE",
                    payload: { status: "ENDED" }
                });

                const state = await getSessionGameState(ctx.db, input.sessionId);
                await pusher.trigger(`session-${input.sessionId}`, "update", state);

                return { success: false, ended: true };
            }

            const targetQuestion = questions[targetIndex]!;

            // Update DB
            await ctx.db.gameSession.update({
                where: { id: input.sessionId },
                data: {
                    status: "ACTIVE", // Force active (in case coming from intermission)
                    currentQuestionId: targetQuestion.id,
                    currentQuestionStartTime: new Date(),

                    // Only update highest reached if we are moving forward past previous max
                    highestQuestionOrder: {
                        set: Math.max(session.highestQuestionOrder, targetQuestion.order)
                    }
                }
            });

            // Trigger Pusher
            const state = await getSessionGameState(ctx.db, input.sessionId);
            await pusher.trigger(`session-${input.sessionId}`, "update", state);

            return { success: true, nextQuestionId: targetQuestion.id };
        }),

    previous: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.gameSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } }
            });

            if (session.mode !== "CLASSROOM") {
                throw new TRPCError({ code: "FORBIDDEN", message: "Rewind only available in Classroom mode" });
            }

            const currentQ = await ctx.db.question.findUnique({
                where: { id: session.currentQuestionId ?? "" }
            });

            let currentIndex = -1;
            if (currentQ) {
                currentIndex = session.quiz.questions.findIndex(q => q.id === currentQ.id);
            }

            if (currentIndex === -1) {
                // If not found, maybe end of quiz? default to last
                currentIndex = session.quiz.questions.length;
            }

            const targetIndex = Math.max(0, currentIndex - 1);
            const targetQuestion = session.quiz.questions[targetIndex];

            // Update DB - DO NOT update highestQuestionOrder if rewinding
            await ctx.db.gameSession.update({
                where: { id: input.sessionId },
                data: {
                    currentQuestionId: targetQuestion?.id,
                    currentQuestionStartTime: new Date(),
                    status: "ACTIVE" // Ensure active if it was ended
                }
            });

            // Trigger Pusher
            const state = await getSessionGameState(ctx.db, input.sessionId);
            await pusher.trigger(`session-${input.sessionId}`, "update", state);

            return { success: true, targetIndex };
        }),

    end: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.gameSession.update({
                where: { id: input.sessionId },
                data: { status: "ENDED", endTime: new Date() }
            });

            ee.emit(EVENTS.SESSION_UPDATE, {
                sessionId: input.sessionId,
                type: "STATUS_CHANGE",
                payload: { status: "ENDED" }
            });

            // Trigger Pusher update
            const state = await getSessionGameState(ctx.db, input.sessionId);
            await pusher.trigger(`session-${input.sessionId}`, "update", state);

            return session;
        }),

    getAll: protectedProcedure
        .query(async ({ ctx }) => {
            return ctx.db.gameSession.findMany({
                orderBy: { createdAt: "desc" },
                include: {
                    quiz: {
                        select: { title: true }
                    },
                    players: {
                        select: { id: true }
                    },
                    _count: {
                        select: { players: true }
                    }
                }
            });
        }),

    getById: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .query(async ({ ctx, input }) => {


            // use Session from game.ts
            const session = await getSessionGameState(ctx.db, input.sessionId);

            const dbSession = await ctx.db.gameSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: {
                    quiz: {
                        include: {
                            questions: {
                                orderBy: { order: 'asc' },
                                select: { id: true, text: true, timeLimit: true, order: true, codeSnippet: true, language: true }
                            }
                        }
                    },
                    players: {
                        orderBy: { score: 'desc' },
                        include: {
                            answers: {
                                select: {
                                    questionId: true,
                                    isCorrect: true,
                                    timeTaken: true,
                                    score: true,
                                }
                            }
                        }
                    },
                    currentQuestion: {
                        select: { id: true, text: true, timeLimit: true, order: true, codeSnippet: true, language: true }
                    }
                }
            });

            const finalSession = { ...(session.status !== "ENDED" ? session : {}) } as any;

            if (finalSession.players && dbSession.players) {
                // Merge answers into the session players
                finalSession.players = finalSession.players.map((p: any) => {
                    const dbPlayer = dbSession.players.find(dP => dP.id === (p.playerId || p.id));
                    return {
                        ...p,
                        answers: dbPlayer?.answers || []
                    };
                });
            }

            return { ...dbSession, ...finalSession };

        }),
});
