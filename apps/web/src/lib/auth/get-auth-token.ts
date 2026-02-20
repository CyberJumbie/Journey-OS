import { createBrowserClient } from "@web/lib/supabase";

/**
 * Gets the current Supabase access token for API requests.
 * Returns empty string if no session exists.
 */
export async function getAuthToken(): Promise<string> {
  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}
