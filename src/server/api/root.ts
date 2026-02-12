import { postRouter } from "@mce-quiz/server/api/routers/post";
import { quizRouter } from "@mce-quiz/server/api/routers/quiz";
import { adminRouter } from "@mce-quiz/server/api/routers/admin";
import {
  createCallerFactory,
  createTRPCRouter,
} from "@mce-quiz/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  quiz: quizRouter,
  admin: adminRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
