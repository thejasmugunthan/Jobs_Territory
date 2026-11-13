import { useState } from "react";
import { Bookmark, MapPin, Building2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { savedJobsService } from "../../jobs/services/saved-jobs.service";

export interface RecommendedJobItem {
  job_id: string;
  title: string;
  company: string;
  company_logo?: string;
  location?: string | null;
  recommendation_score?: number | null;
  employment_type?: string | null;
  work_mode?: string | null;
  minimum_salary?: number | null;
  maximum_salary?: number | null;
  currency?: string | null;
  posted_at?: string | null;
  reasons?: string[];
}

interface RecommendedJobCardProps {
  job: RecommendedJobItem;
  isSaved?: boolean;
}

export function RecommendedJobCard({ job, isSaved = false }: RecommendedJobCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setSaving(true);
      if (saved) {
        await savedJobsService.remove(job.job_id);
        setSaved(false);
        toast.success("Job removed from saved list");
      } else {
        await savedJobsService.save(job.job_id);
        setSaved(true);
        toast.success("Job saved to your bookmarks");
      }
    } catch {
      toast.error("Could not update bookmark");
    } finally {
      setSaving(false);
    }
  };

  const formattedSalary =
    job.minimum_salary && job.maximum_salary
      ? `$${(job.minimum_salary / 1000).toFixed(0)}k - $${(job.maximum_salary / 1000).toFixed(0)}k`
      : null;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Top bar with company avatar and save icon */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            {job.company_logo ? (
              <img
                src={job.company_logo}
                alt={job.company}
                className="h-10 w-10 rounded-xl object-cover border border-slate-100 dark:border-slate-800"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#6C3BEB] font-bold text-sm dark:bg-slate-800 dark:text-purple-300">
                <Building2 size={20} />
              </div>
            )}
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate max-w-[140px]">
                {job.company}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin size={11} />
                <span className="truncate max-w-[120px]">{job.location || "Remote"}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleSave}
            disabled={saving}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              saved
                ? "border-purple-200 bg-purple-50 text-[#6C3BEB] dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                : "border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            }`}
            aria-label={saved ? "Remove from saved jobs" : "Save job"}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Job Title */}
        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#6C3BEB] transition-colors line-clamp-1 mb-2.5 dark:text-white">
          <Link to={`/jobs/${job.job_id}`}>{job.title}</Link>
        </h4>

        {/* Badges / Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {job.employment_type && (
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize dark:bg-slate-800 dark:text-slate-300">
              {job.employment_type.replace(/_/g, " ")}
            </span>
          )}
          {job.work_mode && (
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize dark:bg-slate-800 dark:text-slate-300">
              {job.work_mode.replace(/_/g, " ")}
            </span>
          )}
          {job.recommendation_score !== null && job.recommendation_score !== undefined && (
            <span className="rounded-lg bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[#6C3BEB] dark:bg-purple-950/60 dark:text-purple-300">
              {job.recommendation_score}% match
            </span>
          )}
        </div>
      </div>

      {/* Footer with Salary & Details action */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-auto dark:border-slate-800">
        <div>
          {formattedSalary ? (
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {formattedSalary}
              </span>
              <span className="text-[10px] text-slate-400 block">/ year</span>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-slate-400">Competitive</span>
          )}
        </div>

        <Link
          to={`/jobs/${job.job_id}`}
          className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-bold text-[#6C3BEB] hover:bg-purple-100 transition-colors dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50"
        >
          View Details
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
