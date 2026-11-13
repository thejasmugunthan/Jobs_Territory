import type { LucideIcon } from "lucide-react";

interface DashboardStatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  variant?: "primary-gradient" | "surface";
  badgeText?: string;
}

export function DashboardStatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "surface",
  badgeText,
}: DashboardStatCardProps) {
  if (variant === "primary-gradient") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6C3BEB] via-[#6033DC] to-[#5426C9] p-6 text-white shadow-lg shadow-purple-500/15 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
            {title}
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-white">
            <Icon size={20} />
          </div>
        </div>
        <div className="text-3xl font-extrabold tracking-tight mb-2 text-white">
          {value}
        </div>
        <p className="text-xs text-purple-100/90 font-medium">
          {description}
        </p>
        {badgeText && (
          <span className="mt-3 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">
            {badgeText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#6C3BEB] dark:bg-slate-800 dark:text-purple-400">
          <Icon size={20} />
        </div>
      </div>
      <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
        {value}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
        {description}
      </p>
      {badgeText && (
        <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {badgeText}
        </span>
      )}
    </div>
  );
}
