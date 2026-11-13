import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Building2,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  BookOpen,
  BriefcaseBusiness,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, getApiErrorMessage } from "../../../services/api";
import { EmptyState } from "../../../components/common/EmptyState";
import { toast } from "sonner";

export interface ScheduledInterview {
  application_id: string;
  job_id: string;
  title: string;
  company: string;
  date: string;
  time?: string;
  type?: string;
  status?: string;
}

export default function InterviewSchedulePage() {
  const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .get("/api/v1/dashboard")
      .then(({ data }) => {
        if (!isMounted) return;
        const upcoming: ScheduledInterview[] = data.upcoming_interviews || [];
        setInterviews(upcoming);
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = getApiErrorMessage(err, "Failed to load interview schedule");
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { day: "2-digit" });
    } catch {
      return "15";
    }
  };

  const formatMonth = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    } catch {
      return "NOV";
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="content-stack space-y-6">
      {/* Header */}
      <div className="page-intro">
        <span className="eyebrow">CAREER PROGRESSION</span>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl flex items-center gap-3">
              Interview Schedule
              {!loading && (
                <span className="count-pill">{interviews.length}</span>
              )}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your upcoming conversations, meeting details, and interview preparation notes.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all self-start sm:self-auto"
          >
            <BriefcaseBusiness size={15} />
            <span>Browse More Roles</span>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scheduled Interviews (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse space-y-3"
                >
                  <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <EmptyState
                icon={<CalendarDays size={28} />}
                title="No upcoming interviews yet"
                description="When recruiters review your job applications and schedule an interview round, your calendar details and video links will be listed here automatically."
                action={
                  <Link
                    to="/jobs"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all"
                  >
                    <span>Find Open Opportunities</span>
                    <ArrowRight size={14} />
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((item) => (
                <div
                  key={item.application_id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Date Badge & Details */}
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-purple-50 px-3 py-2 text-center text-[#6C3BEB] ring-1 ring-inset ring-purple-500/10 dark:bg-slate-800 dark:text-purple-400 min-w-[58px]">
                        <span className="text-[10px] font-extrabold tracking-wider">
                          {formatMonth(item.date)}
                        </span>
                        <span className="text-xl font-extrabold leading-tight">
                          {formatDay(item.date)}
                        </span>
                      </div>

                      {/* Content */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Confirmed Round
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.type || "Live Video Interview"}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#6C3BEB] transition-colors">
                          {item.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <Building2 size={13} className="text-slate-400" />
                            {item.company}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            {item.time || "10:30 AM – 11:15 AM EST"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          Scheduled for: {formatFullDate(item.date)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link
                        to={`/applications/${item.application_id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                      >
                        <span>View Application</span>
                        <ArrowRight size={13} />
                      </Link>
                      <Link
                        to={`/jobs/${item.job_id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-3 py-2 text-xs font-semibold text-[#6C3BEB] hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 transition-colors"
                        title="View Job Description"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Candidate Preparation & Tips (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Interview Checklist Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-[#6C3BEB] dark:bg-purple-950/40 dark:text-purple-400">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Interview Readiness
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pre-interview preparation checklist
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Review the job responsibilities and required qualifications.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Formulate 2-3 questions about team culture and roadmap.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Test your camera, microphone, and internet connection.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Prepare your resume copy and portfolio references.</span>
              </div>
            </div>
          </div>

          {/* STAR Response Framework Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <BookOpen size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  The STAR Method
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Structuring behavioral interview responses
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                <strong className="text-[#6C3BEB] dark:text-purple-400">S — Situation:</strong>{" "}
                <span className="text-slate-600 dark:text-slate-300">Describe the specific context or challenge.</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                <strong className="text-[#6C3BEB] dark:text-purple-400">T — Task:</strong>{" "}
                <span className="text-slate-600 dark:text-slate-300">Explain your responsibility in that situation.</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                <strong className="text-[#6C3BEB] dark:text-purple-400">A — Action:</strong>{" "}
                <span className="text-slate-600 dark:text-slate-300">Share the concrete steps you personally took.</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                <strong className="text-[#6C3BEB] dark:text-purple-400">R — Result:</strong>{" "}
                <span className="text-slate-600 dark:text-slate-300">Highlight the measurable outcome achieved.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
