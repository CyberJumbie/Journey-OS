import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type {
  FAQCategoryId,
  FAQEntry,
  FAQListResponse,
} from "@journey-os/types";
import { FAQ_CATEGORIES, FAQ_ENTRIES } from "@web/content/help/faq-data";

const VALID_CATEGORIES: ReadonlySet<string> = new Set<string>([
  "getting-started",
  "generation",
  "review",
  "templates",
  "item-bank",
  "analytics",
]);

interface ScoredEntry {
  readonly entry: FAQEntry;
  readonly score: number;
}

/**
 * Scores an FAQ entry against a search query.
 * question match = 1.0, tag match = 0.8, answer match = 0.5
 */
function scoreEntry(entry: FAQEntry, query: string): number {
  const lowerQuery = query.toLowerCase();
  let maxScore = 0;

  if (entry.question.toLowerCase().includes(lowerQuery)) {
    maxScore = Math.max(maxScore, 1.0);
  }

  if (entry.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
    maxScore = Math.max(maxScore, 0.8);
  }

  if (entry.answer.toLowerCase().includes(lowerQuery)) {
    maxScore = Math.max(maxScore, 0.5);
  }

  return maxScore;
}

/**
 * GET /api/help/faq
 *
 * Query params:
 *   - search?: string — full-text search across question, answer, tags
 *   - category?: FAQCategoryId — filter by category
 *
 * Returns FAQListResponse with filtered/scored entries.
 * 400 for invalid category parameter.
 */
export function GET(
  request: NextRequest,
): NextResponse<FAQListResponse | { error: string }> {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";

  // Validate category if provided
  if (category && !VALID_CATEGORIES.has(category)) {
    return NextResponse.json(
      {
        error: `Invalid category: '${category}'. Valid categories are: ${[...VALID_CATEGORIES].join(", ")}`,
      },
      { status: 400 },
    );
  }

  const validCategory = category as FAQCategoryId | "";

  // Filter by category
  let filtered: readonly FAQEntry[] = FAQ_ENTRIES;
  if (validCategory) {
    filtered = filtered.filter((e) => e.category === validCategory);
  }

  // Search and score
  if (search.length > 0) {
    const scored: ScoredEntry[] = [];
    for (const entry of filtered) {
      const score = scoreEntry(entry, search);
      if (score > 0) {
        scored.push({ entry, score });
      }
    }

    // Sort by score desc, then sortOrder asc
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.sortOrder - b.entry.sortOrder;
    });

    filtered = scored.map((s) => s.entry);
  } else {
    // No search — sort by sortOrder
    filtered = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const response: FAQListResponse = {
    entries: filtered,
    categories: FAQ_CATEGORIES,
    totalCount: filtered.length,
  };

  return NextResponse.json(response);
}
