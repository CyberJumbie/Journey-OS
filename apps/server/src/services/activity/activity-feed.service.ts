/**
 * Activity Feed Service — business logic layer.
 * [STORY-F-6] Pagination defaults, cap enforcement, and response shaping.
 */

import type {
  ActivityFeedQuery,
  ActivityFeedResponse,
} from "@journey-os/types";
import type { ActivityFeedRepository } from "../../repositories/activity.repository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DEFAULT_OFFSET = 0;

export class ActivityFeedService {
  readonly #repository: ActivityFeedRepository;

  constructor(repository: ActivityFeedRepository) {
    this.#repository = repository;
  }

  async list(query: ActivityFeedQuery): Promise<ActivityFeedResponse> {
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const offset = Math.max(query.offset ?? DEFAULT_OFFSET, 0);

    const { events, total } = await this.#repository.findByUser({
      ...query,
      limit,
      offset,
    });

    const has_more = offset + limit < total;

    return {
      events,
      meta: {
        limit,
        offset,
        total,
        has_more,
      },
    };
  }
}
