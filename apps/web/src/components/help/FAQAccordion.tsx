"use client";

import { useState } from "react";
import type { FAQCategory, FAQCategoryId, FAQEntry } from "@journey-os/types";

interface FAQAccordionProps {
  readonly entries: readonly FAQEntry[];
  readonly categories: readonly FAQCategory[];
  readonly activeCategory?: FAQCategoryId;
  readonly searchQuery?: string;
  readonly className?: string;
}

/**
 * Renders a simple inline Markdown subset: **bold** and `code`.
 * Returns an array of React nodes.
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-[var(--cream)] px-1 py-0.5 font-mono text-xs text-[var(--navy)]"
        >
          {match[3]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/**
 * FAQ accordion grouped by category.
 * Each category section has a header with a dot marker.
 * Individual items expand/collapse to reveal the answer.
 */
export function FAQAccordion({
  entries,
  categories,
  activeCategory,
  searchQuery,
  className = "",
}: FAQAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredCategories = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  const sortedCategories = [...filteredCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <div className={["space-y-6", className].join(" ")}>
      {sortedCategories.map((category) => {
        const categoryEntries = entries
          .filter((e) => e.category === category.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        if (categoryEntries.length === 0) return null;

        return (
          <div key={category.id}>
            {/* Category header */}
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full bg-[var(--blue-mid)]"
                aria-hidden="true"
              />
              <h3
                className="font-serif text-base font-bold text-[var(--ink)]"
                style={{ fontSize: "16px" }}
              >
                {category.label}
              </h3>
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {categoryEntries.length}{" "}
                {categoryEntries.length === 1 ? "question" : "questions"}
              </span>
            </div>

            {/* Accordion items */}
            <div className="space-y-2">
              {categoryEntries.map((entry) => {
                const isOpen = openItems.has(entry.id);

                return (
                  <div
                    key={entry.id}
                    className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-white"
                    style={{ borderRadius: "12px" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(entry.id)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--parchment)]"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${entry.id}`}
                    >
                      <span
                        className="font-sans font-semibold text-[var(--ink)]"
                        style={{ fontSize: "15px" }}
                      >
                        {searchQuery
                          ? highlightMatch(entry.question, searchQuery)
                          : entry.question}
                      </span>
                      <svg
                        className={[
                          "ml-3 h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform",
                          isOpen ? "rotate-180" : "",
                        ].join(" ")}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {isOpen ? (
                      <div
                        id={`faq-answer-${entry.id}`}
                        className="border-t border-[var(--border-light)] bg-[var(--parchment)] px-5 py-4"
                      >
                        <p
                          className="font-sans leading-relaxed text-[var(--text-secondary)]"
                          style={{ fontSize: "15px" }}
                        >
                          {renderMarkdown(entry.answer)}
                        </p>
                        {entry.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {entry.relatedLinks && entry.relatedLinks.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-3">
                            {entry.relatedLinks.map((link) => (
                              <a
                                key={link.href}
                                href={link.href}
                                className="text-xs font-medium text-[var(--blue-mid)] hover:underline"
                              >
                                {link.label} &rarr;
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Highlights matching text with a mark element.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-[var(--lime)]/30 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
