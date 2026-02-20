"use client";

import type { FAQCategory, FAQCategoryId } from "@journey-os/types";
import { HelpCategoryBadge } from "@web/components/help/HelpCategoryBadge";
import { HelpSearch } from "@web/components/help/HelpSearch";

interface HelpSidebarProps {
  readonly categories: readonly FAQCategory[];
  readonly entryCounts: Readonly<Record<FAQCategoryId, number>>;
  readonly activeCategory?: FAQCategoryId;
  readonly onCategorySelect: (category: FAQCategoryId | undefined) => void;
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
}

/**
 * Desktop-only sidebar for FAQ navigation.
 * Contains search input, "All Categories" button, and category badges.
 * Hidden on mobile/tablet via CSS.
 */
export function HelpSidebar({
  categories,
  entryCounts,
  activeCategory,
  onCategorySelect,
  searchValue,
  onSearchChange,
}: HelpSidebarProps) {
  const sortedCategories = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const totalCount = Object.values(entryCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <aside
      className="hidden lg:block"
      style={{
        width: 240,
        borderRight: "1px solid var(--border-light)",
        backgroundColor: "white",
        position: "sticky",
        top: 0,
        height: "fit-content",
        maxHeight: "100vh",
        overflowY: "auto",
      }}
    >
      <div className="p-4">
        <HelpSearch
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search FAQ..."
          className="mb-4"
        />

        <nav aria-label="FAQ categories">
          <div className="space-y-1">
            {/* All Categories option */}
            <button
              type="button"
              onClick={() => onCategorySelect(undefined)}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                activeCategory === undefined
                  ? "bg-[var(--parchment)] font-semibold text-[var(--ink)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--parchment)] hover:text-[var(--ink)]",
              ].join(" ")}
              aria-current={activeCategory === undefined ? "true" : undefined}
            >
              <span className="flex-1 font-sans text-sm">All Categories</span>
              <span
                className={[
                  "flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  activeCategory === undefined
                    ? "bg-[var(--blue-mid)] text-white"
                    : "bg-[var(--cream)] text-[var(--text-muted)]",
                ].join(" ")}
              >
                {totalCount}
              </span>
            </button>

            {/* Category items */}
            {sortedCategories.map((category) => (
              <HelpCategoryBadge
                key={category.id}
                category={category}
                count={entryCounts[category.id] ?? 0}
                isActive={activeCategory === category.id}
                onClick={() => onCategorySelect(category.id)}
              />
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
