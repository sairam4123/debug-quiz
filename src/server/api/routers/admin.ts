import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@mce-quiz/server/api/trpc";
import { ee, EVENTS } from "@mce-quiz/server/events";

export const adminRouter = createTRPCRouter({
    createSession: protectedProcedure
        .input(z.object({ quizId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Create a new game session
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            return ctx.db.gameSession.create({
                data: {
                    quizId: input.quizId,
                    code,
                    status: "WAITING",
                },
            });
        }),

    startSession: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Update session status to ACTIVE
            const session = await ctx.db.gameSession.update({
                where: { id: input.sessionId },
                data: { status: "ACTIVE", startTime: new Date() },
            });

            ee.emit(EVENTS.SESSION_UPDATE, {
                sessionId: input.sessionId,
                type: "STATUS_CHANGE",
                payload: { status: "ACTIVE" }
            });

            return session;
        }),

    nextQuestion: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Move to next question
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
                    data: { currentQuestionId: nextQuestion.id }
                });

                ee.emit(EVENTS.SESSION_UPDATE, {
                    sessionId: input.sessionId,
                    type: "NEW_QUESTION",
                    payload: { question: nextQuestion }
                });

                return { success: true, nextQuestionId: nextQuestion.id };
            } else {
                // No more questions, end session?
                return { success: false, message: "No more questions" };
            }
        }),

    endSession: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.gameSession.update({
                where: { id: input.sessionId },
                data: { status: "ENDED", endTime: new Date() }
            });
        }),

    getDashboardStats: protectedProcedure
        .query(async ({ ctx }) => {
            const [totalQuizzes, activeSessions, totalPlayers] = await Promise.all([
                ctx.db.quiz.count(),
                ctx.db.gameSession.count({ where: { status: "ACTIVE" } }),
                ctx.db.player.count(),
            ]);

            return {
                totalQuizzes,
                activeSessions,
                totalPlayers,
            };
        }),
});
