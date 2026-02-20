import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@web/lib/supabase";

/**
 * Auth callback route handler.
 * Exchanges PKCE authorization code for a session.
 * Used by both login (magic link) and password reset flows.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = next;
  redirectUrl.searchParams.delete("code");
  redirectUrl.searchParams.delete("next");

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If no code or exchange failed, redirect to login with error
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(redirectUrl);
}
