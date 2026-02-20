import type { Metadata } from "next";
import { Suspense } from "react";
import { FrameworkList } from "@web/components/framework/framework-list";

export const metadata: Metadata = {
  title: "Frameworks — Journey OS",
  description: "Browse educational frameworks and their hierarchies.",
};

export default function FrameworksPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Educational Frameworks
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Browse the educational frameworks used to structure curriculum and
          assessments.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-lg border border-border bg-warm-gray"
              />
            ))}
          </div>
        }
      >
        <FrameworkList />
      </Suspense>
    </main>
  );
}
