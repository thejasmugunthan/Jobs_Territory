import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";
import { useSaveJob } from "../hooks/useSaveJob";

interface SaveJobButtonProps {
  title: string;
  jobId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  iconOnly?: boolean;
}

export function SaveJobButton({
  title,
  jobId,
  size = "md",
  className = "",
  iconOnly = false,
}: SaveJobButtonProps) {
  const { saved, loading, mutating, toggle, error } = useSaveJob(jobId);

  const sizeClasses =
    size === "sm"
      ? iconOnly
        ? "h-9 w-9 p-0 rounded-xl"
        : "text-xs py-2 px-3 rounded-xl gap-1.5 h-9"
      : size === "lg"
      ? iconOnly
        ? "h-11 w-11 p-0 rounded-xl"
        : "text-sm py-3 px-4 rounded-xl gap-2 h-11"
      : iconOnly
      ? "h-10 w-10 p-0 rounded-xl"
      : "text-xs py-2.5 px-3.5 rounded-xl gap-1.5 h-10";

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center font-semibold border transition-all whitespace-nowrap active:scale-[0.98] ${
        saved
          ? "border-purple-200 bg-purple-50 text-[#6C3BEB] dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
          : "border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      } ${sizeClasses} ${className}`}
      disabled={loading || mutating}
      aria-label={`${saved ? "Remove" : "Save"} ${title}`}
      aria-pressed={saved}
      title={error || undefined}
      onClick={toggle}
    >
      {mutating ? (
        <LoaderCircle className="spin" size={size === "sm" ? 13 : 15} />
      ) : saved ? (
        <BookmarkCheck size={size === "sm" ? 13 : 15} />
      ) : (
        <Bookmark size={size === "sm" ? 13 : 15} fill={saved ? "currentColor" : "none"} />
      )}
      {!iconOnly && <span>{saved ? "Saved" : "Save job"}</span>}
    </button>
  );
}
