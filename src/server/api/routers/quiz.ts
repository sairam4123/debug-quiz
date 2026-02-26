import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@mce-quiz/server/api/trpc";

export const quizRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        showIntermediateStats: z.boolean().optional(),
        shuffleQuestions: z.boolean().optional(),
        randomizeOptions: z.boolean().optional(),
        antiTabSwitchEnabled: z.boolean().optional(),
        questions: z.array(
          z.object({
            text: z.string().min(1),
            type: z.enum(["PROGRAM_OUTPUT", "CODE_CORRECTION", "KNOWLEDGE"]),
            section: z.string().optional(),
            codeSnippet: z.string().optional(),
            language: z.string().optional(),
            timeLimit: z.number().min(5).optional(),
            baseScore: z.number().min(100).optional(),
            order: z.number().optional(),
            options: z.array(
              z.object({
                text: z.string(),
                isCorrect: z.boolean(),
              }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.quiz.create({
        data: {
          title: input.title,
          description: input.description,
          showIntermediateStats: input.showIntermediateStats ?? true,
          shuffleQuestions: input.shuffleQuestions ?? false,
          randomizeOptions: input.randomizeOptions ?? true,
          antiTabSwitchEnabled: input.antiTabSwitchEnabled ?? false,
          createdBy: { connect: { id: ctx.session.user.id } },
          questions: {
            create: input.questions.map((q, index) => ({
              text: q.text,
              type: q.type,
              section: q.section,
              codeSnippet: q.codeSnippet,
              language: q.language || "python",
              timeLimit: q.timeLimit ?? 10,
              baseScore: q.baseScore ?? 1000,
              order: q.order ?? index,
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
      include: { _count: { select: { questions: true } } },
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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        showIntermediateStats: z.boolean().optional(),
        shuffleQuestions: z.boolean().optional(),
        randomizeOptions: z.boolean().optional(),
        antiTabSwitchEnabled: z.boolean().optional(),
        questions: z
          .array(
            z.object({
              id: z.string().optional(),
              text: z.string().min(1),
              type: z.enum(["KNOWLEDGE", "PROGRAM_OUTPUT", "CODE_CORRECTION"]),
              section: z.string().optional(),
              codeSnippet: z.string().optional(),
              language: z.string().optional(),
              timeLimit: z.number().optional(),
              baseScore: z.number().optional(),
              order: z.number().optional(),
              options: z
                .array(
                  z.object({
                    id: z.string().optional(),
                    text: z.string().min(1),
                    isCorrect: z.boolean(),
                  }),
                )
                .min(2),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(
        async (tx) => {
          const quiz = await tx.quiz.update({
            where: { id: input.id },
            data: {
              title: input.title,
              description: input.description,
              showIntermediateStats: input.showIntermediateStats,
              shuffleQuestions: input.shuffleQuestions,
              randomizeOptions: input.randomizeOptions,
              antiTabSwitchEnabled: input.antiTabSwitchEnabled,
            },
          });

          const existingQuestions = await tx.question.findMany({
            where: { quizId: input.id },
            select: { id: true },
          });
          const existingQuestionIds = new Set(
            existingQuestions.map((q) => q.id),
          );

          const inputQuestionIds = new Set(
            input.questions.map((q) => q.id).filter((id): id is string => !!id),
          );

          const questionsToDelete = existingQuestions.filter(
            (q) => !inputQuestionIds.has(q.id),
          );

          if (questionsToDelete.length > 0) {
            const deleteIds = questionsToDelete.map((q) => q.id);

            await tx.answer.deleteMany({
              where: { questionId: { in: deleteIds } },
            });

            await tx.gameSession.updateMany({
              where: { currentQuestionId: { in: deleteIds } },
              data: { currentQuestionId: null, currentQuestionStartTime: null },
            });

            await tx.question.deleteMany({
              where: { id: { in: deleteIds } },
            });
          }

          const existingInputQuestionIds = input.questions
            .map((q) => q.id)
            .filter((id): id is string => !!id && existingQuestionIds.has(id));

          if (existingInputQuestionIds.length > 0) {
            await tx.option.deleteMany({
              where: { questionId: { in: existingInputQuestionIds } },
            });
          }

          await Promise.all(
            input.questions.map(async (q, index) => {
              if (q.id && existingQuestionIds.has(q.id)) {
                return tx.question.update({
                  where: { id: q.id },
                  data: {
                    text: q.text,
                    type: q.type,
                    section: q.section,
                    codeSnippet: q.codeSnippet,
                    language: q.language || "python",
                    timeLimit: q.timeLimit || 10,
                    baseScore: q.baseScore || 1000,
                    order: q.order ?? index,
                    options: {
                      create: q.options.map((o) => ({
                        text: o.text,
                        isCorrect: o.isCorrect,
                      })),
                    },
                  },
                });
              } else {
                return tx.question.create({
                  data: {
                    quizId: input.id,
                    text: q.text,
                    type: q.type,
                    section: q.section,
                    codeSnippet: q.codeSnippet,
                    language: q.language || "python",
                    timeLimit: q.timeLimit || 10,
                    baseScore: q.baseScore || 1000,
                    order: q.order ?? index,
                    options: {
                      create: q.options.map((o) => ({
                        text: o.text,
                        isCorrect: o.isCorrect,
                      })),
                    },
                  },
                });
              }
            }),
          );

          return quiz;
        },
        {
          maxWait: 10000,
          timeout: 50000,
        },
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.quiz.delete({
        where: { id: input.id },
      });
    }),
});
