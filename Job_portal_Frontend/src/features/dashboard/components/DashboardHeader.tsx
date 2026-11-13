import { useEffect, useState } from "react";
import { Bell, FileUp, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { GlobalSearch } from "../../../components/common/GlobalSearch";
import { ThemeToggle } from "../../../components/common/ThemeToggle";
import { api } from "../../../services/api";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const loadUnread = () => {
      api
        .get("/api/v1/notifications/unread-count")
        .then(({ data }) => {
          if (active) setUnreadCount(data.unread_count);
        })
        .catch(() => {});
    };

    void loadUnread();
    const interval = window.setInterval(loadUnread, 45000);
    window.addEventListener("jobs-notifications-updated", loadUnread);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("jobs-notifications-updated", loadUnread);
    };
  }, []);

  const firstName = userName ? userName.split(" ")[0] : "Candidate";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
      {/* Welcome Section */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6C3BEB] dark:text-purple-400 mb-1">
          <Sparkles size={14} />
          <span>Candidate Workspace</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {`Welcome back, ${firstName}.`} <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Here is what is happening with your job applications and recruiter views today.
        </p>
      </div>

      {/* Actions: Search, Theme, Notifications, Post Resume */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Global Search Bar */}
        <div className="w-full sm:w-64 md:w-72">
          <GlobalSearch />
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center">
          <ThemeToggle />
        </div>

        {/* Notifications Icon with Badge */}
        <Link
          to="/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-[#6C3BEB] transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E85B68] px-1 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-slate-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Post Resume Button */}
        <Link
          to="/resume-analyzer"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all"
        >
          <FileUp size={16} />
          <span>Post Resume</span>
        </Link>
      </div>
    </div>
  );
}
