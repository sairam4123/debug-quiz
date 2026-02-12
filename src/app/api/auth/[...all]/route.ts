import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@mce-quiz/server/better-auth";

export const { GET, POST } = toNextJsHandler(auth.handler);
