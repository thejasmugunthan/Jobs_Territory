import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Briefcase,
  AlertCircle,
  Info,
  Trash2,
  ExternalLink,
  RotateCw,
  Search,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../services/api";
import {
  notificationsService,
  type NotificationItem,
} from "./services/notifications.service";

type FilterTab = "all" | "unread" | "applications" | "alerts";

/**
 * formatRelativeTime:
 * Formats an ISO date string into a friendly relative time (e.g. "Just now", "15m ago", "2h ago", "Yesterday").
 */
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * getNotificationMeta:
 * Returns category metadata (icon, human-readable label, badge colors) based on notification type.
 */
function getNotificationMeta(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("offer") || normalized.includes("selected")) {
    return {
      label: "Job Offer",
      icon: CheckCircle2,
      badgeClass:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
      iconBg:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    };
  }

  if (normalized.includes("interview")) {
    return {
      label: "Interview Invite",
      icon: Calendar,
      badgeClass:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
      iconBg:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    };
  }

  if (normalized.includes("shortlist")) {
    return {
      label: "Shortlisted",
      icon: Sparkles,
      badgeClass:
        "bg-purple-50 text-[#6C3BEB] border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50",
      iconBg:
        "bg-purple-100 text-[#6C3BEB] dark:bg-purple-900/40 dark:text-purple-300",
    };
  }

  if (normalized.includes("alert")) {
    return {
      label: "Job Alert Match",
      icon: Bell,
      badgeClass:
        "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50",
      iconBg:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
    };
  }

  if (normalized.includes("reject")) {
    return {
      label: "Application Update",
      icon: AlertCircle,
      badgeClass:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50",
      iconBg:
        "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
    };
  }

  if (normalized.includes("application")) {
    return {
      label: "Application Status",
      icon: Briefcase,
      badgeClass:
        "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50",
      iconBg:
        "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    };
  }

  return {
    label: normalized.replace(/_/g, " "),
    icon: Info,
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    iconBg:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
}

/**
 * NotificationsPage:
 * Modern candidate notification hub for tracking application milestones, interview calls, and alert matches.
 */
export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * notifyApp:
   * Dispatches the global jobs-notifications-updated event to update navigation badges.
   */
  const notifyApp = () => {
    window.dispatchEvent(new Event("jobs-notifications-updated"));
  };

  /**
   * loadNotifications:
   * Fetches latest candidate notifications from the API.
   */
  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await notificationsService.list({ unreadOnly: false, limit: 100 });
      setItems(data.items);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load notifications."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /**
   * handleMarkRead:
   * Marks a specific notification as read and updates UI state immediately.
   */
  const handleMarkRead = async (id: string) => {
    try {
      await notificationsService.markRead(id);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
      notifyApp();
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update notification"));
    }
  };

  /**
   * handleMarkAllRead:
   * Marks all unread candidate notifications as read in a single batch.
   */
  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsService.markAllRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      notifyApp();
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not mark all as read"));
    } finally {
      setMarkingAll(false);
    }
  };

  /**
   * handleDelete:
   * Deletes a notification by ID and updates local state.
   */
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await notificationsService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      notifyApp();
      toast.success("Notification deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete notification"));
    } finally {
      setDeletingId(null);
    }
  };

  // Filter tab statistics
  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);
  const appTypes = useMemo(
    () => ["selected", "offer", "shortlisted", "interview_scheduled", "rejected", "application_status"],
    []
  );
  const applicationCount = useMemo(
    () => items.filter((n) => appTypes.some((t) => n.type.toLowerCase().includes(t))).length,
    [items, appTypes]
  );
  const alertCount = useMemo(
    () => items.filter((n) => n.type.toLowerCase().includes("alert")).length,
    [items]
  );

  // Filtered notifications list
  const filteredItems = useMemo(() => {
    let result = items;

    if (activeTab === "unread") {
      result = result.filter((n) => !n.is_read);
    } else if (activeTab === "applications") {
      result = result.filter((n) => appTypes.some((t) => n.type.toLowerCase().includes(t)));
    } else if (activeTab === "alerts") {
      result = result.filter((n) => n.type.toLowerCase().includes("alert"));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, activeTab, searchQuery, appTypes]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6C3BEB] dark:text-purple-400 mb-1">
              <Sparkles size={14} />
              <span>Candidate Updates</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-[#E85B68] px-2.5 py-0.5 text-xs font-extrabold text-white">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time updates regarding your applications, interview invites, and matching job alerts.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadNotifications(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all disabled:opacity-50"
              title="Refresh notifications"
            >
              <RotateCw size={14} className={refreshing ? "animate-spin text-[#6C3BEB]" : ""} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={markingAll}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all disabled:opacity-50"
              >
                <CheckCheck size={15} />
                <span>{markingAll ? "Marking..." : "Mark all as read"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeTab === "all"
                  ? "bg-[#6C3BEB] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span>All</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "all" ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeTab === "unread"
                  ? "bg-[#6C3BEB] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#E85B68] px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("applications")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeTab === "applications"
                  ? "bg-[#6C3BEB] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span>Applications</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "applications"
                    ? "bg-white/25 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {applicationCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("alerts")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeTab === "alerts"
                  ? "bg-[#6C3BEB] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span>Job Alerts</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "alerts"
                    ? "bg-white/25 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {alertCount}
              </span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#6C3BEB] focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:placeholder-slate-500 dark:focus:border-purple-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-[#6C3BEB] dark:bg-purple-950/40 dark:text-purple-300 mb-4">
            <Bell size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {searchQuery
              ? "No matching notifications"
              : activeTab === "unread"
              ? "You're completely caught up!"
              : "No notifications yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {searchQuery
              ? `No notifications found matching "${searchQuery}". Try different keywords.`
              : activeTab === "unread"
              ? "Great job! All of your alerts and application updates have been reviewed."
              : "When employers review your profile, schedule interviews, or extend offers, you will see notifications here."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                Clear Search
              </button>
            ) : (
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all"
              >
                <span>Browse Recommended Jobs</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((n) => {
            const meta = getNotificationMeta(n.type);
            const Icon = meta.icon;
            const isDeleting = deletingId === n.id;

            return (
              <article
                key={n.id}
                className={`relative rounded-2xl border p-5 transition-all shadow-sm ${
                  !n.is_read
                    ? "border-l-4 border-l-[#6C3BEB] border-slate-200 bg-purple-50/30 dark:bg-purple-950/15 dark:border-slate-800 dark:border-l-[#6C3BEB]"
                    : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Category icon */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg}`}
                  >
                    <Icon size={20} />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Category Badge */}
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>

                      {/* Unread Pill */}
                      {!n.is_read && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E85B68]/10 text-[#E85B68] px-2 py-0.5 text-[10px] font-extrabold border border-[#E85B68]/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E85B68]" />
                          <span>Unread</span>
                        </span>
                      )}

                      {/* Time */}
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                        <Clock size={12} />
                        <span>{formatRelativeTime(n.created_at)}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {n.title}
                    </h2>

                    {/* Message */}
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {n.message}
                    </p>

                    {/* Actions Row */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      {n.job_id && (
                        <Link
                          to={`/jobs/${n.job_id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span>View Job</span>
                        </Link>
                      )}

                      {n.application_id && (
                        <Link
                          to="/applications"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors"
                        >
                          <Briefcase size={13} />
                          <span>View Application</span>
                        </Link>
                      )}

                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(n.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-[#6C3BEB] hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors"
                        >
                          <Check size={13} />
                          <span>Mark as read</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleDelete(n.id)}
                        disabled={isDeleting}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                        title="Delete notification"
                      >
                        <Trash2 size={13} />
                        <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
