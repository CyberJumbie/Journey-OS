/**
 * ILO (Institutional Learning Objective) types.
 * [STORY-IA-4] Institution-scoped graduate competencies.
 */

import type {
  BloomLevel,
  ObjectiveStatus,
  SyncStatus,
} from "./objective-common.types";

export interface ILO {
  readonly id: string;
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

export interface CreateILORequest {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly bloom_level: BloomLevel;
}

export interface UpdateILORequest {
  readonly title?: string;
  readonly description?: string;
  readonly bloom_level?: BloomLevel;
  readonly status?: ObjectiveStatus;
}

export interface ILOListQuery {
  readonly institution_id: string;
  readonly status?: ObjectiveStatus;
  readonly bloom_level?: BloomLevel;
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface ILOListResponse {
  readonly objectives: readonly ILO[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
