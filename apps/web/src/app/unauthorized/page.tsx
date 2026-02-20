import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Denied — Journey OS",
  description: "You do not have permission to access this page.",
};

// Next.js App Router requires default export for pages
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="text-center">
        <h1 className="mb-4 font-serif text-3xl font-semibold text-navy-deep">
          Access Denied
        </h1>
        <p className="mb-6 text-text-secondary">
          You do not have permission to access this page.
        </p>
        <a
          href="/login"
          className="rounded-lg bg-navy-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue"
        >
          Back to Sign In
        </a>
      </div>
    </div>
  );
}
