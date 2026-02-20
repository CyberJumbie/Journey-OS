"use client";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@web/lib/supabase";

// Next.js App Router requires default export for pages
export default function FacultyDashboardPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "Source Sans 3, sans-serif" }}
        >
          Faculty Dashboard
        </h1>
        <button
          onClick={handleSignOut}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Sign Out
        </button>
      </div>
      <p className="text-gray-600">Content creation tools coming soon.</p>
    </div>
  );
}
