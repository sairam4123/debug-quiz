import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { db } from "@mce-quiz/server/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql", // or "sqlite" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://192.168.56.1:3000", "http://127.0.0.1:3000"]
    : [],
});

export type Session = typeof auth.$Infer.Session;
