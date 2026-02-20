"use client";

import type { FAQCategory } from "@journey-os/types";

interface HelpCategoryBadgeProps {
  readonly category: FAQCategory;
  readonly count: number;
  readonly isActive: boolean;
  readonly onClick: () => void;
}

/**
 * Category pill with icon, label, and count badge.
 * Active state uses parchment background.
 */
export function HelpCategoryBadge({
  category,
  count,
  isActive,
  onClick,
}: HelpCategoryBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        isActive
          ? "bg-[var(--parchment)] font-semibold text-[var(--ink)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--parchment)] hover:text-[var(--ink)]",
      ].join(" ")}
      aria-current={isActive ? "true" : undefined}
    >
      <span className="flex-shrink-0 text-base" aria-hidden="true">
        {category.icon}
      </span>
      <span className="flex-1 truncate font-sans text-sm">
        {category.label}
      </span>
      <span
        className={[
          "flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
          isActive
            ? "bg-[var(--blue-mid)] text-white"
            : "bg-[var(--cream)] text-[var(--text-muted)]",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}
