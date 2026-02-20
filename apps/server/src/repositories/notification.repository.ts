/**
 * Notification Repository — Supabase query layer.
 * [STORY-F-2] CRUD + paginated list, unread count, mark read, batch create, retention cleanup.
 * Supabase-only — no Neo4j dual-write.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NotificationRow,
  Notification,
  CreateNotificationRequest,
  NotificationListQuery,
  NotificationListResponse,
  NotificationType,
} from "@journey-os/types";
import { NotificationNotFoundError } from "../errors";

const TABLE = "notifications";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export class NotificationRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(data: CreateNotificationRequest): Promise<Notification> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .insert({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        action_url: data.action_url ?? null,
        action_label: data.action_label ?? null,
        institution_id: data.institution_id ?? null,
        metadata: data.metadata ?? null,
      })
      .select("*")
      .single();

    if (error || !row) {
      throw new NotificationNotFoundError(
        `Failed to create notification: ${error?.message ?? "No data returned"}`,
      );
    }

    return this.#toNotification(row as unknown as NotificationRow);
  }

  async createBatch(
    data: Omit<CreateNotificationRequest, "user_id"> & {
      readonly user_ids: readonly string[];
    },
  ): Promise<Notification[]> {
    const rows = data.user_ids.map((userId) => ({
      user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      action_url: data.action_url ?? null,
      action_label: data.action_label ?? null,
      institution_id: data.institution_id ?? null,
      metadata: data.metadata ?? null,
    }));

    const { data: inserted, error } = await this.#supabaseClient
      .from(TABLE)
      .insert(rows)
      .select("*");

    if (error || !inserted) {
      throw new NotificationNotFoundError(
        `Failed to create batch notifications: ${error?.message ?? "No data returned"}`,
      );
    }

    return inserted.map((row: Record<string, unknown>) =>
      this.#toNotification(row as unknown as NotificationRow),
    );
  }

  async findByUserId(
    userId: string,
    query: NotificationListQuery,
  ): Promise<NotificationListResponse> {
    const page = Math.max(query.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const offset = (page - 1) * limit;

    let dataQuery = this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("user_id", userId);

    let countQuery = this.#supabaseClient
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (query.unread_only) {
      dataQuery = dataQuery.eq("is_read", false);
      countQuery = countQuery.eq("is_read", false);
    }

    if (query.type) {
      dataQuery = dataQuery.eq("type", query.type);
      countQuery = countQuery.eq("type", query.type);
    }

    const [dataResult, countResult] = await Promise.all([
      dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (dataResult.error) {
      throw new NotificationNotFoundError(
        `Failed to fetch notifications: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const notifications = (dataResult.data ?? []).map(
      (row: Record<string, unknown>) =>
        this.#toNotification(row as unknown as NotificationRow),
    );

    return {
      notifications,
      meta: { page, limit, total, total_pages: totalPages },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.#supabaseClient
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      throw new NotificationNotFoundError(
        `Failed to get unread count: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  async markAsRead(id: string): Promise<Notification> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !row) {
      throw new NotificationNotFoundError(id);
    }

    return this.#toNotification(row as unknown as NotificationRow);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select("id");

    if (error) {
      throw new NotificationNotFoundError(
        `Failed to mark all as read: ${error.message}`,
      );
    }

    return data?.length ?? 0;
  }

  async findById(id: string): Promise<Notification | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new NotificationNotFoundError(id);
    }

    return data
      ? this.#toNotification(data as unknown as NotificationRow)
      : null;
  }

  async deleteOld(): Promise<number> {
    const { data, error } = await this.#supabaseClient.rpc(
      "cleanup_old_notifications",
    );

    if (error) {
      throw new NotificationNotFoundError(
        `Failed to cleanup old notifications: ${error.message}`,
      );
    }

    return (data as number) ?? 0;
  }

  #toNotification(row: NotificationRow): Notification {
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body ?? null,
      action_url: row.action_url ?? null,
      action_label: row.action_label ?? null,
      is_read: row.is_read,
      read_at: row.read_at ?? null,
      created_at: row.created_at,
      institution_id: row.institution_id ?? null,
      metadata: row.metadata ?? null,
    };
  }
}
