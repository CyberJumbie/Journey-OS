import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Creates a Supabase client suitable for Next.js middleware.
 * Bridges request/response cookies so session refresh tokens
 * are properly persisted across requests.
 *
 * Returns both the Supabase client and a NextResponse that
 * must be returned from the middleware to apply cookie changes.
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Apply cookies to the request (for downstream handlers)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Create fresh response to capture cookie changes
          response = NextResponse.next({ request });
          // Apply cookies to the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return { supabase, response: () => response };
}
