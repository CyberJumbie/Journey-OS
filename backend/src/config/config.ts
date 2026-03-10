import { z } from 'zod';

const envSchema = z.object({
  // Neo4j Aura
  NEO4J_URI: z.string().min(1),
  NEO4J_USER: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI Services
  ANTHROPIC_API_KEY: z.string().min(1),
  VOYAGE_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  LLAMAPARSE_API_KEY: z.string().optional(),

  // Embedding config
  EMBEDDING_PROVIDERS: z.string().default('voyage'),
  EMBEDDING_SEARCH_PROVIDER: z.enum(['voyage', 'openai']).default('voyage'),

  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const config: EnvConfig = envSchema.parse(process.env);
