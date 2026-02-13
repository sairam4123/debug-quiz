import {
    createTRPCRouter,
    protectedProcedure,
} from "@mce-quiz/server/api/trpc";

export const adminRouter = createTRPCRouter({
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
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    _count: {
                        select: { questions: true }
                    }
                }
            });
        }),
});
