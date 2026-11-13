import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
  X,
  FileSearch,
  Sparkles,
  ChartNoAxesCombined,
  Columns3,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { Brand } from "./Brand";
import { api } from "../../services/api";
import { GlobalSearch } from "../common/GlobalSearch";
import { ThemeToggle } from "../common/ThemeToggle";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Job Listings", to: "/jobs", icon: Search },
  { label: "My Applications", to: "/applications", icon: BriefcaseBusiness },
  { label: "Saved Jobs", to: "/saved-jobs", icon: Bookmark },
  { label: "Resume Analyzer", to: "/resume-analyzer", icon: FileSearch },
  { label: "Recommended Jobs", to: "/recommended-jobs", icon: Sparkles },
  { label: "Job Alerts", to: "/job-alerts", icon: Bell },
  { label: "Application Insights", to: "/application-insights", icon: ChartNoAxesCombined },
  { label: "Compare Jobs", to: "/compare-jobs", icon: Columns3 },
  { label: "Interview Schedule", to: "/interviews", icon: CalendarDays },
];

export function Sidebar({
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const initials =
    user?.full_name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "JT";

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("You’ve been signed out");
    } catch {
      toast.error("We couldn’t reach the server, but your local session was cleared");
    } finally {
      navigate("/", { replace: true });
    }
  };

  return (
    <>
      {mobileOpen && (
        <button
          className="drawer-scrim"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? "sidebar-open" : ""} ${
          collapsed ? "sidebar-collapsed" : ""
        }`}
      >
        <div className="sidebar-brand-row">
          <Brand />
          <button
            className="icon-button sidebar-collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={18} />
          </button>
          <button
            className="icon-button mobile-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="nav-label">Main menu</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {!collapsed && (
          <div className="sidebar-promo">
            <div className="promo-sparkle">✦</div>
            <p className="promo-eyebrow">A little progress adds up</p>
            <h3>Make your profile stand out.</h3>
            <p className="promo-copy">
              A complete profile helps you present your experience with confidence.
            </p>
            <NavLink className="promo-link" to="/profile" onClick={onClose}>
              Improve profile <span>→</span>
            </NavLink>
            <div className="promo-orbit promo-orbit-one" />
            <div className="promo-orbit promo-orbit-two" />
          </div>
        )}
        <div className="nav-label other-label">Other</div>
        <nav className="side-nav" aria-label="Support navigation">
          <NavLink
            to="/help-support"
            onClick={onClose}
            title={collapsed ? "Help & Support" : undefined}
            className={({ isActive }) =>
              `nav-link ${isActive ? "nav-link-active" : ""}`
            }
          >
            <CircleHelp size={18} />
            <span>Help &amp; Support</span>
          </NavLink>
          <NavLink
            to="/settings"
            onClick={onClose}
            title={collapsed ? "Settings" : undefined}
            className={({ isActive }) =>
              `nav-link ${isActive ? "nav-link-active" : ""}`
            }
          >
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>
        <div className="sidebar-spacer" />
        <div
          className={`account-menu ${profileOpen ? "account-menu-open" : ""}`}
        >
          {profileOpen && (
            <div className="account-dropdown">
              <NavLink
                to="/profile"
                onClick={() => {
                  setProfileOpen(false);
                  onClose();
                }}
              >
                <UserRound size={16} /> My profile
              </NavLink>
              <NavLink
                to="/settings"
                onClick={() => {
                  setProfileOpen(false);
                  onClose();
                }}
              >
                <Settings size={16} /> Settings
              </NavLink>
              <button onClick={handleLogout}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
          <button
            className="account-button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
          >
            <span className="avatar">{initials}</span>
            <span className="account-info">
              <strong>{user?.full_name ?? "Candidate"}</strong>
              <small>{user?.email ?? "Your account"}</small>
            </span>
            <ChevronDown size={16} className="account-chevron" />
          </button>
        </div>
      </aside>
    </>
  );
}

export function TopNavbar({
  title,
  onMenu,
}: {
  title: string;
  onMenu: () => void;
}) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get("/api/v1/notifications/unread-count")
        .then(({ data }) => active && setUnread(data.unread_count))
        .catch(() => {});
    void load();
    const timer = window.setInterval(load, 60000);
    window.addEventListener("jobs-notifications-updated", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("jobs-notifications-updated", load);
    };
  }, []);

  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <div className="topbar-title">
        <span className="breadcrumb">Workspace</span>
        <h1>{title}</h1>
      </div>

      <div className="topbar-search flex-1 max-w-md mx-2 sm:mx-4">
        <GlobalSearch />
      </div>

      <div className="topbar-actions">
        <ThemeToggle />

        <div className="notification-wrap">
          <Link
            className="icon-button notification-button"
            to="/notifications"
            aria-label={`Notifications, ${unread} unread`}
          >
            <Bell size={19} />
            {unread > 0 && <span className="notification-dot" />}
          </Link>
        </div>

        <Link className="top-user" to="/profile" aria-label="Open your profile">
          <span className="avatar avatar-small">
            {user?.full_name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase() || "JT"}
          </span>
          <ChevronDown size={15} />
        </Link>
      </div>
    </header>
  );
}
