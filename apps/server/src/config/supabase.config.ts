import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { envConfig } from "./env.config";

/**
 * Singleton Supabase client for server-side operations.
 * Uses service role key for full database access (bypasses RLS).
 * [CODE_STANDARDS SS 3.1] — private fields, public getter, constructor DI pattern.
 */
export class SupabaseClientConfig {
  static #instance: SupabaseClientConfig | null = null;
  readonly #client: SupabaseClient;

  private constructor() {
    this.#client = createClient(
      envConfig.SUPABASE_URL,
      envConfig.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  static getInstance(): SupabaseClientConfig {
    if (!SupabaseClientConfig.#instance) {
      SupabaseClientConfig.#instance = new SupabaseClientConfig();
    }
    return SupabaseClientConfig.#instance;
  }

  get client(): SupabaseClient {
    return this.#client;
  }

  /** For testing: reset singleton. */
  static resetInstance(): void {
    SupabaseClientConfig.#instance = null;
  }
}

export function getSupabaseClient(): SupabaseClient {
  return SupabaseClientConfig.getInstance().client;
}
