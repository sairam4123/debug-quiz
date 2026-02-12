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
            // Get the quiz to find the first question
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
                    currentQuestionId: firstQuestion.id,
                    currentQuestionStartTime: new Date(Date.now() + 2500), // Add 2.5s buffer for client splash screen
                },
            });

            ee.emit(EVENTS.SESSION_UPDATE, {
                sessionId: input.sessionId,
                type: "STATUS_CHANGE",
                payload: { status: "ACTIVE", currentQuestion: firstQuestion }
            });

            return updatedSession;
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
                    data: {
                        currentQuestionId: nextQuestion.id,
                        currentQuestionStartTime: new Date(Date.now() + 2500), // Add 2.5s buffer for splash screen
                    }
                });

                ee.emit(EVENTS.SESSION_UPDATE, {
                    sessionId: input.sessionId,
                    type: "NEW_QUESTION",
                    payload: { question: nextQuestion }
                });

                return { success: true, nextQuestionId: nextQuestion.id };
            } else {
                // No more questions — auto-end the session
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

    endSession: protectedProcedure
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

    getQuizzes: protectedProcedure
        .query(async ({ ctx }) => {
            return ctx.db.quiz.findMany({
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: { questions: true }
                    }
                }
            });
        }),

    getQuiz: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.quiz.findUniqueOrThrow({
                where: { id: input.id },
                include: {
                    questions: {
                        include: { options: true },
                        orderBy: { order: "asc" }
                    }
                }
            });
        }),

    updateQuiz: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().min(1),
            description: z.string().optional(),
            questions: z.array(z.object({
                id: z.string().optional(),
                text: z.string().min(1),
                type: z.enum(["KNOWLEDGE", "PROGRAM_OUTPUT", "CODE_CORRECTION"]),
                codeSnippet: z.string().optional(),
                language: z.string().optional(),
                timeLimit: z.number().optional(),
                baseScore: z.number().optional(),
                options: z.array(z.object({
                    id: z.string().optional(),
                    text: z.string().min(1),
                    isCorrect: z.boolean()
                })).min(2)
            })).min(1)
        }))
        .mutation(async ({ ctx, input }) => {
            // Transaction to handle updates
            return ctx.db.$transaction(async (tx) => {
                // 1. Update Quiz basic info
                const quiz = await tx.quiz.update({
                    where: { id: input.id },
                    data: {
                        title: input.title,
                        description: input.description,
                    }
                });

                // 2. Fetch existing questions to determine what to delete/update
                const existingQuestions = await tx.question.findMany({
                    where: { quizId: input.id },
                    select: { id: true }
                });
                const existingQuestionIds = new Set(existingQuestions.map(q => q.id));

                const inputQuestionIds = new Set(
                    input.questions
                        .map(q => q.id)
                        .filter((id): id is string => !!id)
                );

                // 3. Identify questions to delete (existing but not in input)
                const questionsToDelete = existingQuestions.filter(q => !inputQuestionIds.has(q.id));

                // 4. Handle Deletions: Clean up dependencies first!
                if (questionsToDelete.length > 0) {
                    const deleteIds = questionsToDelete.map(q => q.id);

                    // A. Delete dependent Answers
                    await tx.answer.deleteMany({
                        where: { questionId: { in: deleteIds } }
                    });

                    // B. Unlink from GameSessions (set currentQuestionId to null if it points to a deleted question)
                    // We need to update sessions that are currently on one of these questions.
                    await tx.gameSession.updateMany({
                        where: { currentQuestionId: { in: deleteIds } },
                        data: { currentQuestionId: null, currentQuestionStartTime: null }
                    });

                    // C. Delete the Questions (cascades to Options)
                    await tx.question.deleteMany({
                        where: { id: { in: deleteIds } }
                    });
                }

                // 5. Handle Updates and Creates
                for (const [index, q] of input.questions.entries()) {
                    if (q.id && existingQuestionIds.has(q.id)) {
                        // UPDATE existing question
                        // We will wipe options and recreate them to keep it simple and avoid ID mismatches
                        await tx.option.deleteMany({ where: { questionId: q.id } });

                        await tx.question.update({
                            where: { id: q.id },
                            data: {
                                text: q.text,
                                type: q.type,
                                codeSnippet: q.codeSnippet,
                                language: q.language || "python",
                                timeLimit: q.timeLimit || 10,
                                baseScore: q.baseScore || 1000,
                                order: index, // Update order
                                options: {
                                    create: q.options.map(o => ({
                                        text: o.text,
                                        isCorrect: o.isCorrect
                                    }))
                                }
                            }
                        });
                    } else {
                        // CREATE new question
                        await tx.question.create({
                            data: {
                                quizId: input.id,
                                text: q.text,
                                type: q.type,
                                codeSnippet: q.codeSnippet,
                                language: q.language || "python",
                                timeLimit: q.timeLimit || 10,
                                baseScore: q.baseScore || 1000,
                                order: index,
                                options: {
                                    create: q.options.map(o => ({
                                        text: o.text,
                                        isCorrect: o.isCorrect
                                    }))
                                }
                            }
                        });
                    }
                }

                return quiz;
            });
        }),

    getSessions: protectedProcedure
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

    getSession: protectedProcedure
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
