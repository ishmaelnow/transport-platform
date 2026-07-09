import { z } from "zod";

export const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

export function parseAppEnv(source: NodeJS.ProcessEnv): AppEnv {
  return appEnvSchema.parse(source);
}

export function getPublicSupabaseConfig(source: NodeJS.ProcessEnv = process.env) {
  const env = parseAppEnv(source);

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
