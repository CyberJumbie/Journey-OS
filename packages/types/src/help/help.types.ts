/**
 * FAQ category identifiers. Each maps to a sidebar navigation item
 * and a collapsible section in the FAQ accordion.
 */
export type FAQCategoryId =
  | "getting-started"
  | "generation"
  | "review"
  | "templates"
  | "item-bank"
  | "analytics";

/**
 * A single FAQ entry with question, answer, and metadata.
 * Answer supports Markdown for rich formatting (bold, code, links).
 */
export interface FAQEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category: FAQCategoryId;
  readonly tags: readonly string[];
  readonly relatedLinks?: readonly RelatedLink[];
  readonly sortOrder: number;
}

/**
 * A category grouping for FAQ entries, displayed as a sidebar nav item
 * and as an accordion section header.
 */
export interface FAQCategory {
  readonly id: FAQCategoryId;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly sortOrder: number;
}

/**
 * A help documentation section (long-form content).
 * Used on the main help page for categorized documentation blocks.
 */
export interface HelpSection {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly category: FAQCategoryId;
  readonly content: string;
  readonly sortOrder: number;
}

/** Search result with highlighted match context. */
export interface HelpSearchResult {
  readonly entry: FAQEntry;
  readonly matchField: "question" | "answer" | "tags";
  readonly matchScore: number;
}

/** Related link for cross-referencing between FAQ entries and help sections. */
export interface RelatedLink {
  readonly label: string;
  readonly href: string;
}

/** API response shape for FAQ endpoints. */
export interface FAQListResponse {
  readonly entries: readonly FAQEntry[];
  readonly categories: readonly FAQCategory[];
  readonly totalCount: number;
}

/** API query parameters for FAQ filtering. */
export interface FAQQueryParams {
  readonly search?: string;
  readonly category?: FAQCategoryId;
}
