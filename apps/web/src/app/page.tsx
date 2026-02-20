import { redirect } from "next/navigation";
import { createServerClient } from "@web/lib/supabase-server";
import { getDashboardPath } from "@web/lib/auth/dashboard-routes";

/**
 * Root page: redirects to role-specific dashboard or login.
 * Middleware also handles this, but this is a fallback for direct access.
 */
// Next.js App Router requires default export for pages
export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = user.app_metadata?.role as string | undefined;
    const dashboardPath = role ? getDashboardPath(role) : null;
    redirect(dashboardPath ?? "/unauthorized");
  }

  redirect("/login");
}
