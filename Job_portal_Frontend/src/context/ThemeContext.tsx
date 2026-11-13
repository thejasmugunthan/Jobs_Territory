import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { api } from "../services/api";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "jobs-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return getSystemTheme();
  }
  return preference;
}

function applyThemeToDocument(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolved;
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {}
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(theme)
  );

  // Apply whenever theme changes or system changes
  useEffect(() => {
    const nextResolved = resolveTheme(theme);
    setResolvedTheme(nextResolved);
    applyThemeToDocument(nextResolved);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  // Listen to OS system color-scheme changes
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        const nextResolved = getSystemTheme();
        setResolvedTheme(nextResolved);
        applyThemeToDocument(nextResolved);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Fetch account theme preference on mount if signed in
  useEffect(() => {
    let active = true;
    api
      .get("/api/v1/account/preferences")
      .then(({ data }) => {
        if (!active || !data?.theme_preference) return;
        const remoteTheme = data.theme_preference as ThemePreference;
        if (remoteTheme === "light" || remoteTheme === "dark" || remoteTheme === "system") {
          setThemeState(remoteTheme);
        }
      })
      .catch(() => {
        // Not authenticated or network failure, retain local theme
      });

    return () => {
      active = false;
    };
  }, []);

  const setTheme = (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    const nextResolved = resolveTheme(newTheme);
    setResolvedTheme(nextResolved);
    applyThemeToDocument(nextResolved);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}

    // Attempt background account preference sync
    api
      .patch("/api/v1/account/preferences", { theme_preference: newTheme })
      .catch(() => {
        // Silently ignore if guest/offline
      });
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "light" as ThemePreference,
      resolvedTheme: "light" as "light" | "dark",
      setTheme: () => {},
    };
  }
  return context;
}
