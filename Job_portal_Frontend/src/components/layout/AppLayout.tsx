import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, TopNavbar } from "./Sidebar";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/recommended-jobs": "Recommended jobs",
  "/job-alerts": "Job alerts",
  "/notifications": "Notifications",
  "/application-insights": "Application insights",
  "/compare-jobs": "Compare jobs",
  "/jobs": "Find your next opportunity",
  "/applications": "My applications",
  "/saved-jobs": "Saved jobs",
  "/interviews": "Interview schedule",
  "/profile": "My profile",
  "/onboarding": "Candidate onboarding",
  "/settings": "Settings",
  "/help-support": "Help & Support",
};

export function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-shell ${collapsed ? "app-shell-collapsed" : ""}`}>
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      <div className="app-main">
        <TopNavbar
          title={
            titles[location.pathname] ??
            (location.pathname.startsWith("/jobs/")
              ? "Job details"
              : location.pathname.startsWith("/applications/")
              ? "Application details"
              : "Jobs Territory")
          }
          onMenu={() => setMobileOpen(true)}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
