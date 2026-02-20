/**
 * Activity Feed Repository — Supabase query layer.
 * [STORY-F-6] Paginated activity event retrieval with optional type filtering.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityEvent,
  ActivityFeedQuery,
  ActivityEventType,
} from "@journey-os/types";
import { ActivityEventNotFoundError } from "../errors/activity.error";

const TABLE = "activity_events";

export class ActivityFeedRepository {
  readonly #supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabase = supabaseClient;
  }

  async findByUser(
    query: ActivityFeedQuery,
  ): Promise<{ events: ActivityEvent[]; total: number }> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    // Build data query — apply all .eq()/.in() filters BEFORE .order()/.range()
    let dataQuery = this.#supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", query.user_id);

    let countQuery = this.#supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", query.user_id);

    if (query.event_types && query.event_types.length > 0) {
      dataQuery = dataQuery.in(
        "event_type",
        query.event_types as unknown as ActivityEventType[],
      );
      countQuery = countQuery.in(
        "event_type",
        query.event_types as unknown as ActivityEventType[],
      );
    }

    const [dataResult, countResult] = await Promise.all([
      dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (dataResult.error) {
      throw new ActivityEventNotFoundError(
        `Failed to fetch activity events: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const events = (dataResult.data ?? []) as unknown as ActivityEvent[];

    return { events, total };
  }
}
