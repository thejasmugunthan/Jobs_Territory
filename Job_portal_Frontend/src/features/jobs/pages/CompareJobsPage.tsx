import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Columns3,
  Trash2,
  X,
  ExternalLink,
  BriefcaseBusiness,
  AlertCircle,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../services/api";
import { jobsService } from "../services/jobs.service";
import type { JobDetails } from "../types/job.types";
import {
  getComparedJobIds,
  removeJobFromComparison,
  clearJobComparison,
  MAX_COMPARISON_LIMIT,
} from "../utils/comparison";

interface ComparisonField {
  id: string;
  label: string;
  getValue: (job: JobDetails) => string;
}

const formatLocation = (job: JobDetails): string => {
  return (
    job.location.name ||
    [job.location.city, job.location.state, job.location.country]
      .filter(Boolean)
      .join(", ") ||
    "Not specified"
  );
};

const formatSalary = (job: JobDetails): string => {
  if (job.salary.minimum == null && job.salary.maximum == null) {
    return "Not disclosed";
  }
  const c = job.salary.currency && job.salary.currency.toUpperCase() !== "USD" ? job.salary.currency : "₹";
  const toFormatted = (val: number) => {
    if (val >= 100000) {
      return `${c}${(val / 100000).toFixed(1).replace(/\.0$/, "")}L`;
    }
    return `${c}${val.toLocaleString("en-IN")}`;
  };
  if (job.salary.minimum != null && job.salary.maximum != null) {
    return `${toFormatted(job.salary.minimum)} – ${toFormatted(job.salary.maximum)}`;
  }
  if (job.salary.minimum != null) return `From ${toFormatted(job.salary.minimum)}`;
  return `Up to ${toFormatted(job.salary.maximum!)}`;
};

const formatExperience = (job: JobDetails): string => {
  if (job.experience.minimum == null && job.experience.maximum == null) {
    return "Not specified";
  }
  const min = job.experience.minimum ?? 0;
  const max = job.experience.maximum;
  return max != null ? `${min} – ${max} years` : `${min}+ years`;
};

const COMPARISON_FIELDS: ComparisonField[] = [
  { id: "company", label: "Company", getValue: (job) => job.company.name },
  { id: "location", label: "Location", getValue: formatLocation },
  { id: "salary", label: "Salary Range", getValue: formatSalary },
  { id: "experience", label: "Experience", getValue: formatExperience },
  {
    id: "employment_type",
    label: "Employment Type",
    getValue: (job) => job.employment_type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
  },
  {
    id: "work_mode",
    label: "Work Mode",
    getValue: (job) => (job.work_mode ? job.work_mode.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Not specified"),
  },
  {
    id: "skills",
    label: "Required Skills",
    getValue: (job) => (job.skills.length > 0 ? job.skills.join(", ") : "None specified"),
  },
  {
    id: "preferred_skills",
    label: "Preferred Skills",
    getValue: (job) =>
      job.preferred_qualifications.length > 0
        ? job.preferred_qualifications.join(", ")
        : "None specified",
  },
  {
    id: "posted",
    label: "Posting Date",
    getValue: (job) =>
      job.posted_at
        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(job.posted_at))
        : "Not listed",
  },
  {
    id: "openings",
    label: "Openings",
    getValue: (job) => `${job.openings} ${job.openings === 1 ? "opening" : "openings"}`,
  },
  {
    id: "description",
    label: "Description Summary",
    getValue: (job) => job.description_summary || job.description.slice(0, 200) + "…",
  },
];

export default function CompareJobsPage() {
  const [items, setItems] = useState<JobDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [highlightDifferences, setHighlightDifferences] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setRefreshTrigger((prev) => prev + 1);
    };
    window.addEventListener("jobs-comparison-updated", handleStorageUpdate);
    return () => window.removeEventListener("jobs-comparison-updated", handleStorageUpdate);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const ids = getComparedJobIds();

    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      setError("");
      return () => controller.abort();
    }

    setLoading(true);
    setError("");

    jobsService
      .compare(ids, controller.signal)
      .then((rows) => {
        setItems(rows);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          const msg = getApiErrorMessage(err);
          setError(msg);
          toast.error(msg);
          setItems([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [refreshTrigger]);

  const handleRemove = (id: string) => {
    removeJobFromComparison(id);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to remove all jobs from comparison?")) {
      clearJobComparison();
    }
  };

  const comparedIds = getComparedJobIds();

  return (
    <div className="content-stack space-y-6">
      {/* Page Header */}
      <header className="page-intro">
        <span className="eyebrow">DECISION MATRIX</span>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          Compare Jobs
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Side-by-side comparison of up to {MAX_COMPARISON_LIMIT} active positions to help you evaluate offers and fit.
        </p>
      </header>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Columns3 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {comparedIds.length} of {MAX_COMPARISON_LIMIT} Jobs Selected
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selection stored in this browser session
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {items.length > 1 && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={highlightDifferences}
                onChange={(e) => setHighlightDifferences(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <span>Highlight differences</span>
            </label>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 size={13} />
              <span>Clear comparison</span>
            </button>
          )}

          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            <span>Add more jobs</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Loading job details for comparison…
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/40"
        >
          <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
          <h3 className="mt-2 text-base font-bold text-red-900 dark:text-red-200">
            Unable to load comparison
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshTrigger((n) => n + 1)}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <Columns3 size={28} />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            No jobs in your comparison
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Add up to {MAX_COMPARISON_LIMIT} jobs by clicking &ldquo;Compare&rdquo; on any job card or job details page to review their salary, skills, and qualifications side-by-side.
          </p>
          <div className="mt-6">
            <Link to="/jobs" className="button button-primary">
              <BriefcaseBusiness size={16} />
              <span>Browse open jobs</span>
            </Link>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              {/* Job Header Columns */}
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
                  <th scope="col" className="w-48 p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Criteria
                  </th>
                  {items.map((job) => (
                    <th key={job.id} scope="col" className="p-4 align-top min-w-[220px]">
                      <div className="flex flex-col justify-between gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-purple-600 dark:text-white dark:hover:text-purple-400 line-clamp-2"
                          >
                            {job.title}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRemove(job.id)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                            title={`Remove ${job.title}`}
                            aria-label={`Remove ${job.title} from comparison`}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {job.company.name}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Link
                            to={`/jobs/${job.id}/apply`}
                            className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple-700 transition-colors"
                          >
                            <CheckCircle2 size={12} />
                            <span>Apply</span>
                          </Link>
                          <Link
                            to={`/jobs/${job.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </Link>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Comparison Rows */}
              <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                {COMPARISON_FIELDS.map((field) => {
                  const values = items.map(field.getValue);
                  const isDifferent = new Set(values).size > 1;
                  const rowClass =
                    highlightDifferences && isDifferent
                      ? "bg-purple-50/50 dark:bg-purple-950/20"
                      : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40";

                  return (
                    <tr key={field.id} className={`transition-colors ${rowClass}`}>
                      <th
                        scope="row"
                        className="p-4 font-semibold text-slate-700 dark:text-slate-300 align-top whitespace-nowrap bg-slate-50/40 dark:bg-slate-800/20"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{field.label}</span>
                          {highlightDifferences && isDifferent && (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-purple-500"
                              title="Values differ across selected jobs"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </th>
                      {values.map((val, idx) => (
                        <td
                          key={items[idx].id}
                          className="p-4 text-slate-600 dark:text-slate-300 align-top leading-relaxed"
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
