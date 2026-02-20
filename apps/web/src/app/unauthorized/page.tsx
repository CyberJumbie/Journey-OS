import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Denied — Journey OS",
  description: "You do not have permission to access this page.",
};

// Next.js App Router requires default export for pages
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1
          className="mb-4 text-3xl font-semibold"
          style={{ fontFamily: "Source Sans 3, sans-serif" }}
        >
          Access Denied
        </h1>
        <p className="mb-6 text-gray-600">
          You do not have permission to access this page.
        </p>
        <a
          href="/login"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#2b71b9" }}
        >
          Back to Sign In
        </a>
      </div>
    </div>
  );
}
