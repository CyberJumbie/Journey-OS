/**
 * Summary data for a single educational framework.
 * Displayed as a card in the framework list page.
 */
export interface FrameworkSummary {
  readonly framework_key: string;
  readonly name: string;
  readonly description: string;
  readonly node_count: number;
  readonly hierarchy_depth: number;
  readonly icon: string;
}

/**
 * Response shape for GET /api/v1/institution/frameworks.
 */
export interface FrameworkListResponse {
  readonly frameworks: readonly FrameworkSummary[];
}
