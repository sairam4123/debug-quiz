import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@mce-quiz/server/api/trpc";
import { ee, EVENTS } from "@mce-quiz/server/events";
import { TRPCError } from "@trpc/server";

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
                    currentQuestionStartTime: new Date(Date.now() + 2500),
                },
            });

            ee.emit(EVENTS.SESSION_UPDATE, {
                sessionId: input.sessionId,
                type: "STATUS_CHANGE",
                payload: { status: "ACTIVE", currentQuestion: firstQuestion }
            });

            return updatedSession;
        }),

    next: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.gameSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: { quiz: { include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } } } }
            });

            let nextQuestion = null;
            if (!session.currentQuestionId) {
                nextQuestion = session.quiz.questions[0];
            } else {
                const currentIndex = session.quiz.questions.findIndex(q => q.id === session.currentQuestionId);
                if (currentIndex < session.quiz.questions.length - 1) {
                    nextQuestion = session.quiz.questions[currentIndex + 1];
                }
            }

            if (nextQuestion) {
                await ctx.db.gameSession.update({
                    where: { id: input.sessionId },
                    data: {
                        currentQuestionId: nextQuestion.id,
                        currentQuestionStartTime: new Date(Date.now() + 2500),
                    }
                });

                ee.emit(EVENTS.SESSION_UPDATE, {
                    sessionId: input.sessionId,
                    type: "NEW_QUESTION",
                    payload: { question: nextQuestion }
                });

                return { success: true, nextQuestionId: nextQuestion.id };
            } else {
                await ctx.db.gameSession.update({
                    where: { id: input.sessionId },
                    data: { status: "ENDED", endTime: new Date() }
                });

                ee.emit(EVENTS.SESSION_UPDATE, {
                    sessionId: input.sessionId,
                    type: "STATUS_CHANGE",
                    payload: { status: "ENDED" }
                });

                return { success: false, ended: true };
            }
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
            return ctx.db.gameSession.findUniqueOrThrow({
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
        }),
});
