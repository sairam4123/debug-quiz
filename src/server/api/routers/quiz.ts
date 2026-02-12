import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@mce-quiz/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { ee, EVENTS } from "@mce-quiz/server/events";
import { on } from "events";

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
                        timeLimit: z.number().min(10).optional(),
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
                        create: input.questions.map((q) => ({
                            text: q.text,
                            type: q.type,
                            codeSnippet: q.codeSnippet,
                            timeLimit: q.timeLimit,
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

    joinSession: publicProcedure
        .input(z.object({ code: z.string(), name: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.gameSession.findUnique({
                where: { code: input.code },
            });

            if (!session) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
            }

            if (session.status !== "WAITING") {
                throw new TRPCError({ code: "FORBIDDEN", message: "Session is not open for joining" });
            }

            // Check if player already exists in this session with same name
            const existingPlayer = await ctx.db.player.findUnique({
                where: {
                    sessionId_name: {
                        sessionId: session.id,
                        name: input.name
                    }
                }
            });

            if (existingPlayer) {
                // Allow rejoin? For now, yes, return the existing player
                return { token: existingPlayer.id, playerId: existingPlayer.id, sessionId: session.id };
            }

            const player = await ctx.db.player.create({
                data: {
                    name: input.name,
                    session: { connect: { id: session.id } },
                },
            });

            return { token: player.id, playerId: player.id, sessionId: session.id };
        }),

    onSessionUpdate: publicProcedure
        .input(z.object({ sessionId: z.string() }))
        .subscription(async function* ({ input }) {
            // Listen for updates to this session
            // yield current state first?
            // For now just event stream

            for await (const [data] of on(ee, EVENTS.SESSION_UPDATE)) {
                const update = data as { sessionId: string, type: string, payload: any };
                if (update.sessionId === input.sessionId) {
                    yield update;
                }
            }
        }),

    submitAnswer: publicProcedure
        .input(z.object({
            sessionId: z.string(),
            playerId: z.string(),
            questionId: z.string(),
            optionId: z.string(),
            timeTaken: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            // Validate session/player/question?
            // For MVP, just create answer
            // Check if correct
            const option = await ctx.db.option.findUnique({
                where: { id: input.optionId }
            });

            if (!option) throw new TRPCError({ code: "NOT_FOUND", message: "Option not found" });

            return ctx.db.answer.create({
                data: {
                    playerId: input.playerId,
                    questionId: input.questionId,
                    selectedOptionId: input.optionId,
                    isCorrect: option.isCorrect,
                    timeTaken: input.timeTaken
                }
            });
        }),
});
