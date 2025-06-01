import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.string().default("development"),
    CLERK_WEBHOOK_SECRET: z.string(),
  },
  experimental__runtimeEnv: process.env,
});
