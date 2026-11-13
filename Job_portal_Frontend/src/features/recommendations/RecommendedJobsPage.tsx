import { useEffect, useState } from "react";
import {
  Sparkles,
  MapPin,
  Briefcase,
  Coins,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "../../services/api";
import { EmptyState } from "../../components/common/EmptyState";
import { ApplyNowButton } from "../applications/components/ApplyNowButton";
import { SaveJobButton } from "../jobs/components/SaveJobButton";

interface RecommendedJob {
  job_id: string;
  title: string;
  company: string;
  location: string | null;
  employment_type: string;
  work_mode: string | null;
  minimum_salary: number | null;
  maximum_salary: number | null;
  currency: string | null;
  recommendation_score: number | null;
  data_completeness: number;
  reasons: string[];
  matched_skills: string[];
  missing_required_skills: string[];
}

interface RecommendationsResponse {
  items: RecommendedJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function RecommendedJobsPage() {
  const [items, setItems] = useState<RecommendedJob[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    let alive = true;
    setLoading(true);
    api
      .get<RecommendationsResponse>(`/api/v1/recommendations?page=${page}&limit=12`)
      .then(({ data }) => {
        if (!alive) return;
        setItems(data.items);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      })
      .catch((e) => {
        if (!alive) return;
        const msg = getApiErrorMessage(e, "Failed to load job recommendations");
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  };

  useEffect(() => {
    load();
  }, [page]);

  const formatSalary = (min: number | null, max: number | null, curr: string | null) => {
    if (min == null && max == null) return "Salary not disclosed";
    const c = curr || "";
    if (min != null && max != null) return `${c} ${min.toLocaleString()} – ${max.toLocaleString()}`;
    if (min != null) return `From ${c} ${min.toLocaleString()}`;
    return `Up to ${c} ${max?.toLocaleString()}`;
  };

  const getCompanyInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "J";
  };

  return (
    <div className="content-stack space-y-7">
      {/* Header */}
      <div className="page-intro">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6C3BEB] dark:text-purple-400 mb-1">
              <Sparkles size={14} />
              <span>AI CAREER MATCHING</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl flex items-center gap-3">
              Recommended Jobs
              {!loading && <span className="count-pill">{totalItems}</span>}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Curated positions calculated against your confirmed profile skills, work experience, and job search preferences.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors self-start sm:self-auto"
          >
            <Search size={15} />
            <span>Search All Jobs</span>
          </Link>
        </div>

        {/* Disclaimer / Notice Pill */}
        <div className="mt-4 rounded-xl bg-purple-50/70 p-3 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-300 flex items-start gap-2.5">
          <Sparkles size={16} className="shrink-0 mt-0.5 text-[#6C3BEB]" />
          <span>
            <strong>How scoring works:</strong> Recommendation percentages represent profile relevance and skill overlap. They describe how closely a role fits your documented profile, not an employer's hiring probability.
          </span>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse space-y-3"
            >
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mt-3" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={<AlertCircle size={24} />}
            title="Recommendations could not be loaded"
            description={error}
            action={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20"
                onClick={load}
              >
                <span>Retry Connection</span>
              </button>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={<Sparkles size={32} className="text-[#6C3BEB]" />}
            title="No tailored recommendations yet"
            description="We haven't found sufficient skill overlap with current openings. Adding more verified skills and target preferences to your profile helps our algorithm match you with relevant opportunities."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all"
                >
                  <span>Complete Candidate Profile</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/jobs"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors"
                >
                  Browse All Jobs
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((job) => {
              const score = job.recommendation_score;
              return (
                <article
                  key={job.job_id}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Company Info & Match Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#6C3BEB] font-extrabold text-sm ring-1 ring-inset ring-purple-500/10 dark:bg-purple-950/40 dark:text-purple-300">
                          {getCompanyInitial(job.company)}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 line-clamp-1">
                            {job.company}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin size={11} />
                            <span className="truncate max-w-[140px]">
                              {job.location || "Remote / Unspecified"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Match Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          score != null && score >= 70
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : score != null && score >= 40
                            ? "bg-purple-50 text-[#6C3BEB] ring-1 ring-purple-500/20 dark:bg-purple-950/40 dark:text-purple-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <Sparkles size={11} />
                        {score != null ? `${score}% Match` : "Exploring"}
                      </span>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#6C3BEB] transition-colors line-clamp-1 mb-2">
                      <Link to={`/jobs/${job.job_id}`}>{job.title}</Link>
                    </h3>

                    {/* Meta badges: Employment, Work mode, Salary */}
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
                        <span>
                          {formatSalary(job.minimum_salary, job.maximum_salary, job.currency)}
                        </span>
                      </span>
                    </div>

                    {/* Match Reasoning */}
                    {job.reasons && job.reasons.length > 0 && (
                      <div className="mb-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <strong>Match factors:</strong> {job.reasons.join(" · ")}
                      </div>
                    )}

                    {/* Skills Overlap */}
                    <div className="space-y-1.5 mb-4">
                      {job.matched_skills && job.matched_skills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mr-1 flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Matched:
                          </span>
                          {job.matched_skills.slice(0, 3).map((s, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {job.missing_required_skills && job.missing_required_skills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mr-1 flex items-center gap-0.5">
                            <AlertCircle size={11} /> Skill gaps:
                          </span>
                          {job.missing_required_skills.slice(0, 2).map((s, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <ApplyNowButton jobId={job.job_id} />
                      <SaveJobButton jobId={job.job_id} title={job.title} />
                    </div>

                    <Link
                      to={`/jobs/${job.job_id}/match`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6C3BEB] hover:text-[#5426C9] dark:text-purple-400"
                      title="View full match breakdown"
                    >
                      <span>Analysis</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] disabled:opacity-50 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] disabled:opacity-50 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
