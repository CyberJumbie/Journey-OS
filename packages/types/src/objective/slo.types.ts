/**
 * SLO (Student Learning Objective) types.
 * [STORY-IA-2] Course-scoped learning objectives.
 */

import type {
  BloomLevel,
  ObjectiveStatus,
  SyncStatus,
} from "./objective-common.types";

/** Student Learning Objective — course-scoped */
export interface SLO {
  readonly id: string;
  readonly course_id: string;
  readonly institution_id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly bloom_level: BloomLevel;
  readonly status: ObjectiveStatus;
  readonly created_by: string;
  readonly graph_node_id: string | null;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Request to create a new SLO */
export interface CreateSLORequest {
  readonly course_id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly bloom_level: BloomLevel;
}

/** Request to update an existing SLO */
export interface UpdateSLORequest {
  readonly title?: string;
  readonly description?: string;
  readonly bloom_level?: BloomLevel;
  readonly status?: ObjectiveStatus;
}

/** Query parameters for SLO list */
export interface SLOListQuery {
  readonly course_id: string;
  readonly status?: ObjectiveStatus;
  readonly bloom_level?: BloomLevel;
  readonly page?: number;
  readonly limit?: number;
}

/** Paginated SLO list response */
export interface SLOListResponse {
  readonly objectives: readonly SLO[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
