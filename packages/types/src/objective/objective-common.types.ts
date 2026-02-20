/**
 * Shared objective types for ILO and SLO domains.
 * [STORY-IA-4] Created here; IA-2 (SLO) will import from this file.
 */

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export const VALID_BLOOM_LEVELS: readonly BloomLevel[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
] as const;

export type ObjectiveStatus = "draft" | "active" | "archived";

export type SyncStatus = "pending" | "synced" | "failed";
