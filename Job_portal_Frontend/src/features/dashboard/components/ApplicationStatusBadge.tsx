interface StatusBadgeProps {
  status: string;
}

export function ApplicationStatusBadge({ status }: StatusBadgeProps) {
  const norm = status.toLowerCase().replace(/\s+/g, "_");

  switch (norm) {
    case "selected":
    case "accepted":
    case "offer":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Accepted
        </span>
      );

    case "interview_scheduled":
    case "interview":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-[#6C3BEB] border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6C3BEB]" />
          Interview
        </span>
      );

    case "shortlisted":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Shortlisted
        </span>
      );

    case "under_review":
    case "applied":
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          In Progress
        </span>
      );

    case "rejected":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Rejected
        </span>
      );

    case "withdrawn":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Withdrawn
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          {status.replace(/_/g, " ")}
        </span>
      );
  }
}
