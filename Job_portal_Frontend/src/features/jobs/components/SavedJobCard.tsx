import { useState } from "react";
import {
  ArrowUpRight,
  BookmarkX,
  CalendarDays,
  MapPin,
  Briefcase,
  AlertCircle,
  Coins,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../services/api";
import type { SavedJob } from "../services/saved-jobs.service";
import { savedJobsService } from "../services/saved-jobs.service";

interface SavedJobCardProps {
  savedJob: SavedJob;
  onRemoved: () => void;
}

export function SavedJobCard({ savedJob, onRemoved }: SavedJobCardProps) {
  const [removing, setRemoving] = useState(false);
  const job = savedJob.job;

  const handleRemove = async () => {
    if (!window.confirm("Remove this job from your saved list?")) return;
    setRemoving(true);
    try {
      await savedJobsService.remove(savedJob.job_id);
      window.dispatchEvent(
        new CustomEvent("jobs-saved-state-changed", {
          detail: { jobId: savedJob.job_id, saved: false },
        })
      );
      toast.success("Removed from saved jobs");
      onRemoved();
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Could not remove this saved job."));
    } finally {
      setRemoving(false);
    }
  };

  const formatSalary = (salary: {
    minimum?: number | null;
    maximum?: number | null;
    currency?: string | null;
  }) => {
    if (salary.minimum == null && salary.maximum == null) return "Salary not disclosed";
    const curr = salary.currency || "";
    const min = salary.minimum != null ? Number(salary.minimum).toLocaleString() : "";
    const max = salary.maximum != null ? Number(salary.maximum).toLocaleString() : "";
    if (min && max) return `${curr} ${min} – ${max}`;
    if (min) return `From ${curr} ${min}`;
    return `Up to ${curr} ${max}`;
  };

  const getCompanyInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "J";
  };

  if (!job || !savedJob.is_available) {
    return (
      <article className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 opacity-80">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle size={15} />
            <span>Listing No Longer Active</span>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:border-slate-800 transition-colors"
            disabled={removing}
            onClick={handleRemove}
            title="Remove from saved list"
            aria-label="Remove unavailable job"
          >
            <BookmarkX size={15} />
          </button>
        </div>
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
          {job?.title || "Archived Job Opportunity"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          This role has been closed or removed by the hiring company.
        </p>
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
          <CalendarDays size={13} />
          <span>Saved on {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(savedJob.saved_at))}</span>
        </div>
      </article>
    );
  }

  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
      <div>
        {/* Top Company Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#6C3BEB] font-extrabold text-sm ring-1 ring-inset ring-purple-500/10 dark:bg-purple-950/40 dark:text-purple-300">
              {getCompanyInitial(job.company.name)}
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 line-clamp-1">
                {job.company.name}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin size={11} />
                <span className="truncate max-w-[150px]">
                  {job.location?.name || job.location?.city || "Remote / Various"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:border-slate-800 transition-colors"
            disabled={removing}
            onClick={handleRemove}
            title="Remove from saved jobs"
            aria-label={`Remove saved job ${job.title}`}
          >
            <BookmarkX size={15} />
          </button>
        </div>

        {/* Job Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#6C3BEB] transition-colors line-clamp-1 mb-2">
          <Link to={`/jobs/${job.id}`}>{job.title}</Link>
        </h3>

        {/* Meta badges: employment type, work mode, salary */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
            <Briefcase size={11} className="text-slate-400" />
            <span className="capitalize">{job.employment_type.replace(/_/g, " ")}</span>
          </span>

          {job.work_mode && (
            <span className="inline-flex items-center rounded-lg bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 text-[11px] font-medium text-[#6C3BEB] dark:text-purple-300 capitalize">
              {job.work_mode.replace(/_/g, " ")}
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Coins size={11} />
            <span>{formatSalary(job.salary)}</span>
          </span>
        </div>

        {/* Skills Preview */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.skills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="text-[10px] text-slate-400 self-center">
                +{job.skills.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Saved Date + Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <CalendarDays size={13} />
          <span>
            Saved {new Intl.DateTimeFormat(undefined, { dateStyle: "short" }).format(new Date(savedJob.saved_at))}
          </span>
        </div>

        <Link
          to={`/jobs/${job.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-[#6C3BEB] hover:text-white dark:hover:bg-[#6C3BEB] dark:hover:text-white transition-all"
        >
          <span>View Details</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </article>
  );
}
