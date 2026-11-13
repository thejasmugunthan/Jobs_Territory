import { Calendar, Clock, Video, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export interface InterviewItem {
  application_id: string;
  job_id: string;
  title: string;
  company: string;
  company_logo?: string;
  date: string;
  time?: string;
  type?: string;
  status?: string;
}

interface InterviewScheduleProps {
  interviews: InterviewItem[];
  loading?: boolean;
}

export function InterviewSchedule({ interviews, loading = false }: InterviewScheduleProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

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

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Upcoming Interviews
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interview rounds & meetings
          </p>
        </div>
        <Link
          to="/applications"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#6C3BEB] hover:text-[#5426C9] dark:text-purple-400"
        >
          See All
          <ArrowRight size={14} />
        </Link>
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-[#6C3BEB] dark:bg-slate-800 dark:text-purple-400 mb-3">
            <Calendar size={22} />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No upcoming interviews scheduled
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            When employers review your application and schedule an interview round, it will appear here with video links and timings.
          </p>
          <div className="mt-4">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Browse Open Positions
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((item) => (
            <div
              key={item.application_id}
              className="flex items-center justify-between gap-3.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all hover:bg-purple-50/40 hover:border-purple-200/60 dark:border-slate-800/80 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              {/* Date Box */}
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-purple-100/70 text-[#6C3BEB] font-bold dark:bg-purple-950/60 dark:text-purple-300 flex-shrink-0">
                <span className="text-sm leading-none">{formatDay(item.date)}</span>
                <span className="text-[9px] uppercase tracking-wider">{formatMonth(item.date)}</span>
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {item.company}
                </p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} />
                    {item.time || "10:00 AM"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#6C3BEB] dark:text-purple-400 font-semibold">
                    <Video size={11} />
                    {item.type || "Video Call"}
                  </span>
                </div>
              </div>

              {/* Action */}
              <Link
                to={`/applications/${item.application_id}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-[#6C3BEB] hover:text-[#6C3BEB] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-400 flex-shrink-0"
                title="View interview details"
              >
                <ExternalLink size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
