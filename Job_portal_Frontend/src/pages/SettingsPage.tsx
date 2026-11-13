import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  KeyRound,
  Bell,
  Sun,
  Moon,
  Laptop,
  Eye,
  EyeOff,
  LogOut,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  Smartphone,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { api, getApiErrorMessage } from "../services/api";

interface ProfileVisibility {
  recruiter_visible: boolean;
  resume_visible: boolean;
  contact_visible: boolean;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Notification Preferences State
  const [emailJobAlerts, setEmailJobAlerts] = useState<boolean>(true);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);

  // Profile Visibility State
  const [visibility, setVisibility] = useState<ProfileVisibility | null>(null);
  const [loadingVis, setLoadingVis] = useState<boolean>(true);
  const [savingVisKey, setSavingVisKey] = useState<string | null>(null);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);

  // Modal / Confirm state for destructive actions
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const userEmail = user?.email;

  // Load account preferences & visibility settings
  useEffect(() => {
    if (!userEmail) return;
    let active = true;

    api
      .get("/api/v1/account/preferences")
      .then(({ data }) => {
        if (!active) return;
        setEmailJobAlerts(data.email_job_alerts ?? true);
      })
      .catch(() => {});

    api
      .get("/api/v1/profile/visibility")
      .then(({ data }) => {
        if (!active) return;
        setVisibility(data);
      })
      .catch(() => {
        if (!active) return;
        setVisibility(null);
      })
      .finally(() => {
        if (active) setLoadingVis(false);
      });

    return () => {
      active = false;
    };
  }, [userEmail]);

  // Update Notification Preferences
  const handleToggleEmailAlerts = async (nextValue: boolean) => {
    setEmailJobAlerts(nextValue);
    setSavingPrefs(true);
    try {
      await api.patch("/api/v1/account/preferences", {
        email_job_alerts: nextValue,
      });
      toast.success(
        nextValue
          ? "Job alert email preference enabled."
          : "Job alert email preference disabled."
      );
    } catch (err) {
      setEmailJobAlerts(!nextValue);
      toast.error(getApiErrorMessage(err));
    } finally {
      setSavingPrefs(false);
    }
  };

  // Update Profile Visibility
  const handleToggleVisibility = async (
    key: keyof ProfileVisibility,
    nextValue: boolean
  ) => {
    if (!visibility) return;
    const prevValue = visibility[key];
    setVisibility({ ...visibility, [key]: nextValue });
    setSavingVisKey(key);

    try {
      await api.patch("/api/v1/profile/visibility", { [key]: nextValue });
      toast.success("Profile visibility setting updated.");
    } catch (err) {
      setVisibility({ ...visibility, [key]: prevValue });
      toast.error(getApiErrorMessage(err));
    } finally {
      setSavingVisKey(null);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("New password must be at least 12 characters long.");
      return;
    }

    setBusyPassword(true);
    try {
      await api.post("/api/v1/account/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password updated successfully. Please sign in with your new password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusyPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("You have been signed out.");
    } catch {
      toast.error("Signed out locally.");
    } finally {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="content-stack space-y-8 max-w-4xl mx-auto pb-12">
      {/* Intro Header */}
      <header className="page-intro">
        <span className="eyebrow">PREFERENCES &amp; SECURITY</span>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          Account Settings
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account credentials, notifications, appearance, and recruiter visibility preferences.
        </p>
      </header>

      {/* 1. Account Information */}
      <section className="card p-6 md:p-7 space-y-6" aria-labelledby="account-info-heading">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <User size={20} />
          </div>
          <div>
            <h3 id="account-info-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Account Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your registered candidate credentials on Jobs Territory
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Full Name
            </span>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {user?.full_name || "Candidate"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Email Address
            </span>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {user?.email || "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <p>
            To update your professional resume details, work history, and contact number, visit your Candidate Profile.
          </p>
          <Link to="/profile" className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400">
            <span>Edit Profile</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>

      {/* 2. Appearance */}
      <section className="card p-6 md:p-7 space-y-6" aria-labelledby="appearance-heading">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <Sun size={20} />
          </div>
          <div>
            <h3 id="appearance-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Appearance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize the look and feel of Jobs Territory
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Theme Preference</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose between clean light mode, high-contrast dark mode, or follow your operating system.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Theme preference"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              role="radio"
              aria-checked={theme === "light"}
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                theme === "light"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sun size={14} className="text-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={theme === "dark"}
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                theme === "dark"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Moon size={14} className="text-purple-500" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={theme === "system"}
              onClick={() => setTheme("system")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                theme === "system"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Laptop size={14} className="text-blue-500" />
              <span>System</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Notifications */}
      <section className="card p-6 md:p-7 space-y-6" aria-labelledby="notifications-heading">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <Bell size={20} />
          </div>
          <div>
            <h3 id="notifications-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Notifications &amp; Alerts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure how you receive job matching updates
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Email Job Alerts</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive email digests when newly published jobs match your active job alerts.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={emailJobAlerts}
                onChange={(e) => handleToggleEmailAlerts(e.target.checked)}
                disabled={savingPrefs}
                className="sr-only peer"
                aria-label="Toggle email job alerts"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-slate-700 peer-checked:bg-purple-600" />
            </label>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Manage your custom keywords, salary filters, and alert criteria in the Job Alerts center.
            </span>
            <Link to="/job-alerts" className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 whitespace-nowrap">
              Manage Job Alerts →
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Profile Visibility Settings (Task 170) */}
      <section className="card p-6 md:p-7 space-y-6" aria-labelledby="visibility-heading">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Eye size={20} />
          </div>
          <div>
            <h3 id="visibility-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Profile Visibility
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Control your visibility to recruiters in candidate discovery
            </p>
          </div>
        </div>

        {loadingVis ? (
          <div className="space-y-3">
            <div className="h-16 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
            <div className="h-16 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
          </div>
        ) : !visibility ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
            Complete your profile onboarding to configure recruiter visibility preferences.
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Recruiter Discovery */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/50">
              <div className="flex gap-3">
                <div className="mt-0.5 text-purple-600 dark:text-purple-400">
                  {visibility.recruiter_visible ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Visible to verified recruiters
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    When enabled, authorized employers searching for talent can discover your headline, experience, and skills. When disabled, your profile is completely hidden from recruiter search queries.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center flex-shrink-0">
                <input
                  type="checkbox"
                  checked={visibility.recruiter_visible}
                  onChange={(e) => handleToggleVisibility("recruiter_visible", e.target.checked)}
                  disabled={savingVisKey === "recruiter_visible"}
                  className="sr-only peer"
                  aria-label="Toggle visible to recruiters"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-slate-700 peer-checked:bg-purple-600" />
              </label>
            </div>

            {/* 2. Contact Information Visibility */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/50">
              <div className="flex gap-3">
                <div className="mt-0.5 text-purple-600 dark:text-purple-400">
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Direct Contact Visibility
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Allow verified recruiters to view your registered email and phone number directly in discovery results without waiting for an application.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center flex-shrink-0">
                <input
                  type="checkbox"
                  checked={visibility.contact_visible}
                  onChange={(e) => handleToggleVisibility("contact_visible", e.target.checked)}
                  disabled={savingVisKey === "contact_visible"}
                  className="sr-only peer"
                  aria-label="Toggle contact visibility"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-slate-700 peer-checked:bg-purple-600" />
              </label>
            </div>

            {/* 3. Resume Visibility Indicator */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/50">
              <div className="flex gap-3">
                <div className="mt-0.5 text-purple-600 dark:text-purple-400">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Indicate Resume Availability
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Shows an indicator to recruiters that you have an uploaded, current resume on file. Your actual resume documents remain privately stored and candidate-owned.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center flex-shrink-0">
                <input
                  type="checkbox"
                  checked={visibility.resume_visible}
                  onChange={(e) => handleToggleVisibility("resume_visible", e.target.checked)}
                  disabled={savingVisKey === "resume_visible"}
                  className="sr-only peer"
                  aria-label="Toggle resume visibility indicator"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-slate-700 peer-checked:bg-purple-600" />
              </label>
            </div>
          </div>
        )}
      </section>

      {/* 5. Security & Password Change */}
      <section className="card p-6 md:p-7 space-y-6" aria-labelledby="security-heading">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Lock size={20} />
          </div>
          <div>
            <h3 id="security-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Security &amp; Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Keep your account credentials secure. Changing password revokes active sessions.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? "text" : "password"}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="field-input h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showCurrentPass ? "Hide current password" : "Show current password"}
              >
                {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                required
                minLength={12}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                className="field-input h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showNewPass ? "Hide new password" : "Show new password"}
              >
                {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Must contain 12+ characters, with uppercase, lowercase, and a number.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="field-input h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={busyPassword || !currentPassword || !newPassword}
              className="button button-primary inline-flex items-center gap-2"
            >
              <KeyRound size={15} />
              <span>{busyPassword ? "Updating password…" : "Update Password"}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 6. Account Management */}
      <section className="card p-6 md:p-7 space-y-6" aria-labelledby="management-heading">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Shield size={20} />
          </div>
          <div>
            <h3 id="management-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Account Management
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your session and account lifecycle
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Sign Out</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear your active session and return to the public landing page.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete Account</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Request permanent deletion of your candidate profile, applications, and documents.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors"
          >
            <AlertTriangle size={14} />
            <span>Request Account Deletion</span>
          </button>
        </div>
      </section>

      {/* Account Deletion Information Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h4 className="mt-4 text-center text-lg font-bold text-slate-900 dark:text-white">
              Account Deletion Information
            </h4>
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              In accordance with data governance policies, irreversible account deletion requires verified identity confirmation. Please submit an account inquiry via Help &amp; Support so our administrative team can guide you through the secure data purge procedure.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/help-support"
                className="button button-primary justify-center text-xs"
                onClick={() => setShowDeleteModal(false)}
              >
                Go to Help &amp; Support
              </Link>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="button button-outline justify-center text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
