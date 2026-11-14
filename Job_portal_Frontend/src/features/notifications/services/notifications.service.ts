import { api } from "../../../services/api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  job_id: string | null;
  application_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsListResponse {
  items: NotificationItem[];
  total: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

/**
 * notificationsService:
 * API endpoints for fetching, marking read, and deleting user notifications.
 */
export const notificationsService = {
  /** list: Retrieves candidate notifications with unread filtering, limit, and offset */
  async list(
    params: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
    signal?: AbortSignal,
  ): Promise<NotificationsListResponse> {
    const query = new URLSearchParams();
    if (params.unreadOnly !== undefined) query.set("unread_only", String(params.unreadOnly));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    const { data } = await api.get<NotificationsListResponse>(
      `/api/v1/notifications${query.toString() ? `?${query.toString()}` : ""}`,
      { signal },
    );
    return data;
  },

  /** unreadCount: Fetches the total number of unread notifications for badge counters */
  async unreadCount(signal?: AbortSignal): Promise<number> {
    const { data } = await api.get<UnreadCountResponse>("/api/v1/notifications/unread-count", { signal });
    return data.unread_count;
  },

  /** markRead: Marks an individual notification as read by ID */
  async markRead(id: string): Promise<NotificationItem> {
    const { data } = await api.patch<NotificationItem>(`/api/v1/notifications/${encodeURIComponent(id)}/read`);
    return data;
  },

  /** markAllRead: Marks all unread notifications as read in a single batch */
  async markAllRead(): Promise<number> {
    const { data } = await api.patch<{ updated: number }>("/api/v1/notifications/read-all");
    return data.updated;
  },

  /** delete: Permanently deletes a notification by ID */
  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/notifications/${encodeURIComponent(id)}`);
  },
};
