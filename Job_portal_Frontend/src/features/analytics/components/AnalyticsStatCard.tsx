import React, { ReactNode } from "react";
import { Info } from "lucide-react";

interface AnalyticsStatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  hint?: string;
  tone?: "violet" | "green" | "amber" | "blue" | "rose" | "neutral";
}

const toneStyles: Record<string, { iconBg: string; text: string }> = {
  violet: { iconBg: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300", text: "text-purple-600 dark:text-purple-400" },
  green: { iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300", text: "text-amber-600 dark:text-amber-400" },
  blue: { iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300", text: "text-blue-600 dark:text-blue-400" },
  rose: { iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300", text: "text-rose-600 dark:text-rose-400" },
  neutral: { iconBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", text: "text-slate-600 dark:text-slate-400" },
};

export const AnalyticsStatCard: React.FC<AnalyticsStatCardProps> = ({
  label,
  value,
  detail,
  icon,
  hint,
  tone = "neutral",
}) => {
  const styles = toneStyles[tone] || toneStyles.neutral;

  return (
    <article className="card analytics-stat-card relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{label}</span>
            {hint && (
              <span title={hint} className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <Info size={13} aria-hidden="true" />
                <span className="sr-only">{hint}</span>
              </span>
            )}
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
            {value}
          </p>
          {detail && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {detail}
            </p>
          )}
        </div>
        {icon && (
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
            {icon}
          </div>
        )}
      </div>
    </article>
  );
};

