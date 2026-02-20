"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { FAQCategoryId, FAQEntry } from "@journey-os/types";
import { FAQ_CATEGORIES, FAQ_ENTRIES } from "@web/content/help/faq-data";
import { HelpSidebar } from "@web/components/help/HelpSidebar";
import { HelpSearch } from "@web/components/help/HelpSearch";
import { HelpCategoryBadge } from "@web/components/help/HelpCategoryBadge";
import { FAQAccordion } from "@web/components/help/FAQAccordion";
import { NoResults } from "@web/components/help/NoResults";

const VALID_CATEGORIES: ReadonlySet<string> = new Set<string>([
  "getting-started",
  "generation",
  "review",
  "templates",
  "item-bank",
  "analytics",
]);

function isValidCategory(value: string): value is FAQCategoryId {
  return VALID_CATEGORIES.has(value);
}

function filterEntries(
  entries: readonly FAQEntry[],
  category: FAQCategoryId | undefined,
  search: string,
): readonly FAQEntry[] {
  let filtered = [...entries];

  if (category) {
    filtered = filtered.filter((e) => e.category === category);
  }

  if (search.length > 0) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.question.toLowerCase().includes(query) ||
        e.answer.toLowerCase().includes(query) ||
        e.tags.some((t) => t.toLowerCase().includes(query)),
    );
  }

  return filtered;
}

/**
 * FAQ page with sidebar navigation, search, and accordion.
 * Reads ?category= and ?search= from URL search params.
 */
// Next.js App Router requires default export for page.tsx
export default function FAQPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryParam = searchParams.get("category") ?? "";
  const initialCategory = isValidCategory(categoryParam)
    ? categoryParam
    : undefined;

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") ?? "",
  );
  const [activeCategory, setActiveCategory] = useState<
    FAQCategoryId | undefined
  >(initialCategory);

  const filteredEntries = useMemo(
    () => filterEntries(FAQ_ENTRIES, activeCategory, searchQuery),
    [activeCategory, searchQuery],
  );

  const entryCounts = useMemo(() => {
    const counts = {} as Record<FAQCategoryId, number>;
    for (const cat of FAQ_CATEGORIES) {
      counts[cat.id] = FAQ_ENTRIES.filter((e) => e.category === cat.id).length;
    }
    return counts;
  }, []);

  const handleCategorySelect = useCallback(
    (category: FAQCategoryId | undefined) => {
      setActiveCategory(category);
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (searchQuery) params.set("search", searchQuery);
      const qs = params.toString();
      router.replace(`/help/faq${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchQuery],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      const params = new URLSearchParams();
      if (activeCategory) params.set("category", activeCategory);
      if (value) params.set("search", value);
      const qs = params.toString();
      router.replace(`/help/faq${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, activeCategory],
  );

  const handleClearSearch = useCallback(() => {
    handleSearchChange("");
  }, [handleSearchChange]);

  return (
    <div className="flex min-h-[60vh]">
      {/* Desktop sidebar */}
      <HelpSidebar
        categories={FAQ_CATEGORIES}
        entryCounts={entryCounts}
        activeCategory={activeCategory}
        onCategorySelect={handleCategorySelect}
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Main content */}
      <div className="flex-1 px-0 lg:px-6">
        {/* Page header */}
        <div className="mb-6">
          <h1
            className="font-serif font-bold text-[var(--ink)]"
            style={{ fontSize: "22px" }}
          >
            Frequently Asked Questions
          </h1>
          <p className="mt-1 font-sans text-sm text-[var(--text-secondary)]">
            {filteredEntries.length} of {FAQ_ENTRIES.length} questions
            {activeCategory
              ? ` in ${FAQ_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? activeCategory}`
              : ""}
          </p>
        </div>

        {/* Mobile/tablet search and category pills (hidden on desktop) */}
        <div className="mb-4 lg:hidden">
          <HelpSearch
            value={searchQuery}
            onChange={handleSearchChange}
            resultCount={
              searchQuery.length > 0 ? filteredEntries.length : undefined
            }
            className="mb-3"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategorySelect(undefined)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeCategory === undefined
                  ? "bg-[var(--blue-mid)] text-white"
                  : "bg-[var(--cream)] text-[var(--text-secondary)] hover:bg-[var(--parchment)]",
              ].join(" ")}
            >
              All
            </button>
            {FAQ_CATEGORIES.map((cat) => (
              <HelpCategoryBadge
                key={cat.id}
                category={cat}
                count={entryCounts[cat.id] ?? 0}
                isActive={activeCategory === cat.id}
                onClick={() => handleCategorySelect(cat.id)}
              />
            ))}
          </div>
        </div>

        {/* FAQ content */}
        {filteredEntries.length > 0 ? (
          <FAQAccordion
            entries={filteredEntries}
            categories={FAQ_CATEGORIES}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
          />
        ) : (
          <NoResults
            searchQuery={searchQuery}
            onClearSearch={handleClearSearch}
          />
        )}
      </div>
    </div>
  );
}
