import Link from "next/link";
import { HELP_SECTIONS } from "@web/content/help/help-sections";
import { FAQ_CATEGORIES, FAQ_ENTRIES } from "@web/content/help/faq-data";
import type { FAQCategoryId } from "@journey-os/types";

/**
 * Help Center main page.
 * Displays a grid of help section cards linking to the FAQ page filtered by category.
 */
// Next.js App Router requires default export for page.tsx
export default function HelpPage() {
  const entryCounts = FAQ_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.id] = FAQ_ENTRIES.filter((e) => e.category === cat.id).length;
      return acc;
    },
    {} as Record<FAQCategoryId, number>,
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="font-serif font-bold text-[var(--ink)]"
          style={{ fontSize: "22px" }}
        >
          Help Center
        </h1>
        <p className="mt-1 font-sans text-sm text-[var(--text-secondary)]">
          Find answers to common questions and learn how to use Journey OS
          effectively.
        </p>
      </div>

      {/* Quick link to full FAQ */}
      <div className="mb-6">
        <Link
          href="/help/faq"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-light)] bg-white px-4 py-2.5 font-sans text-sm font-medium text-[var(--blue-mid)] transition-colors hover:bg-[var(--parchment)]"
        >
          Browse all FAQ
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* Help section cards grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={`/help/faq?category=${section.category}`}
            className="group rounded-xl border border-[var(--border-light)] bg-white p-6 transition-shadow hover:shadow-[0_4px_16px_rgba(0,44,118,0.05)]"
            style={{ borderRadius: "12px" }}
          >
            {/* Icon + count badge */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-2xl" aria-hidden="true">
                {section.icon}
              </span>
              <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                {entryCounts[section.category] ?? 0} questions
              </span>
            </div>

            {/* Title */}
            <h2
              className="mb-1 font-serif font-bold text-[var(--ink)] group-hover:text-[var(--blue-mid)]"
              style={{ fontSize: "16px" }}
            >
              {section.title}
            </h2>

            {/* Subtitle */}
            <p
              className="mb-3 font-mono uppercase tracking-wider text-[var(--text-muted)]"
              style={{ fontSize: "10px", fontWeight: 500 }}
            >
              {section.description}
            </p>

            {/* Content preview */}
            <p className="font-sans text-sm leading-relaxed text-[var(--text-secondary)]">
              {section.content}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
