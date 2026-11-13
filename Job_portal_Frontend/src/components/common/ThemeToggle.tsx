import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, type ThemePreference } from "../../context/ThemeContext";

interface ThemeToggleProps {
  variant?: "icon" | "segmented" | "select";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (variant === "select") {
    return (
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemePreference)}
        aria-label="Select theme"
        className={`field-input h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${className}`}
      >
        <option value="system">System Preference</option>
        <option value="light">Light Mode</option>
        <option value="dark">Dark Mode</option>
      </select>
    );
  }

  if (variant === "segmented") {
    return (
      <div
        role="radiogroup"
        aria-label="Theme preference"
        className={`inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900 ${className}`}
      >
        <button
          type="button"
          role="radio"
          aria-checked={theme === "light"}
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            theme === "light"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Sun size={13} className="text-amber-500" />
          <span>Light</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={theme === "dark"}
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            theme === "dark"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Moon size={13} className="text-purple-500" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={theme === "system"}
          onClick={() => setTheme("system")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            theme === "system"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Laptop size={13} className="text-blue-500" />
          <span>System</span>
        </button>
      </div>
    );
  }

  // Quick icon button toggle (cycles light -> dark -> system)
  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const currentIcon =
    theme === "system" ? (
      <Laptop size={16} />
    ) : resolvedTheme === "dark" ? (
      <Moon size={16} className="text-purple-400" />
    ) : (
      <Sun size={16} className="text-amber-500" />
    );

  const title = `Current theme: ${theme} (${resolvedTheme}). Click to cycle theme.`;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={title}
      aria-label={title}
      className={`icon-button flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors ${className}`}
    >
      {currentIcon}
    </button>
  );
}
