import { z } from "zod";
import { MissingEnvironmentError } from "../errors/auth.errors";

const envSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  SUPABASE_JWT_SECRET: z
    .string()
    .min(32, "SUPABASE_JWT_SECRET must be at least 32 characters"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),

  // Neo4j — optional to avoid breaking Express server and existing tests
  NEO4J_URI: z.string().min(1, "NEO4J_URI is required").optional(),
  NEO4J_USERNAME: z.string().min(1, "NEO4J_USERNAME is required").optional(),
  NEO4J_PASSWORD: z.string().min(1, "NEO4J_PASSWORD is required").optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new MissingEnvironmentError(missing);
  }
  return Object.freeze(result.data);
}

/** Validated, frozen environment config. Fails fast on import if invalid. */
export const envConfig: EnvConfig = validateEnv();
