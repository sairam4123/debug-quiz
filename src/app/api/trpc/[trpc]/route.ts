import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "@mce-quiz/env";
import { appRouter } from "@mce-quiz/server/api/root";
import { createTRPCContext } from "@mce-quiz/server/api/trpc";

// Extend timeout for SSE connections on Vercel (max 60s on Hobby, 300s on Pro)
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
          );
        }
        : undefined,
  });

export { handler as GET, handler as POST };
