import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

/**
 * Create Supabase client for use in Client Components.
 * Uses cookie-based session persistence via @supabase/ssr.
 * Session survives page refresh (AC-8).
 */
export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
