/**
 * Notification Service — business logic.
 * [STORY-F-2] Validation, ownership checks, batch create. Supabase-only — no Neo4j.
 */

import type {
  Notification,
  CreateNotificationRequest,
  CreateBatchNotificationRequest,
  NotificationListQuery,
  NotificationListResponse,
} from "@journey-os/types";
import { VALID_NOTIFICATION_TYPES } from "@journey-os/types";
import {
  NotificationNotFoundError,
  NotificationForbiddenError,
  InvalidNotificationTypeError,
} from "../../errors";
import type { NotificationRepository } from "../../repositories/notification.repository";

export class NotificationService {
  readonly #repository: NotificationRepository;

  constructor(repository: NotificationRepository) {
    this.#repository = repository;
  }

  async create(request: CreateNotificationRequest): Promise<Notification> {
    this.#validateRequest(request);
    return this.#repository.create(request);
  }

  async createBatch(
    request: CreateBatchNotificationRequest,
  ): Promise<Notification[]> {
    if (!request.user_ids || request.user_ids.length === 0) {
      throw new InvalidNotificationTypeError(
        "user_ids must be a non-empty array",
      );
    }

    if (!request.title || request.title.trim() === "") {
      throw new InvalidNotificationTypeError("title is required");
    }

    if (!request.type || !VALID_NOTIFICATION_TYPES.includes(request.type)) {
      throw new InvalidNotificationTypeError(request.type ?? "undefined");
    }

    return this.#repository.createBatch({
      user_ids: request.user_ids,
      type: request.type,
      title: request.title,
      body: request.body,
      action_url: request.action_url,
      action_label: request.action_label,
      institution_id: request.institution_id,
      metadata: request.metadata,
    });
  }

  async findByUserId(
    userId: string,
    query: NotificationListQuery,
  ): Promise<NotificationListResponse> {
    return this.#repository.findByUserId(userId, query);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.#repository.getUnreadCount(userId);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.#repository.findById(id);
    if (!notification) {
      throw new NotificationNotFoundError(id);
    }

    if (notification.user_id !== userId) {
      throw new NotificationForbiddenError(id);
    }

    return this.#repository.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.#repository.markAllAsRead(userId);
  }

  async deleteOld(): Promise<number> {
    return this.#repository.deleteOld();
  }

  #validateRequest(request: CreateNotificationRequest): void {
    if (!request.user_id || request.user_id.trim() === "") {
      throw new InvalidNotificationTypeError("user_id is required");
    }

    if (!request.title || request.title.trim() === "") {
      throw new InvalidNotificationTypeError("title is required");
    }

    if (!request.type || !VALID_NOTIFICATION_TYPES.includes(request.type)) {
      throw new InvalidNotificationTypeError(request.type ?? "undefined");
    }
  }
}
