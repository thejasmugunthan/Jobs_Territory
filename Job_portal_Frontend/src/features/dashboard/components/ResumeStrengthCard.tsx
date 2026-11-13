import { ArrowRight, FileCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { CircularProgress } from "./CircularProgress";

interface ResumeStrengthData {
  overall: number;
  summary: number;
  experience: number;
  skills: number;
  education: number;
  has_resume?: boolean;
}

interface ResumeStrengthCardProps {
  data: ResumeStrengthData;
  loading?: boolean;
}

export function ResumeStrengthCard({ data, loading = false }: ResumeStrengthCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-28 w-28 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full mb-6" />
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  const sections = [
    { label: "Profile Summary", value: data.summary },
    { label: "Work Experience", value: data.experience },
    { label: "Skills Section", value: data.skills },
    { label: "Education", value: data.education },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Resume Strength
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real profile quality & readiness
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-[#6C3BEB] dark:bg-slate-800 dark:text-purple-400">
          <FileCheck size={18} />
        </div>
      </div>

      {/* Circular Progress Gauge */}
      <div className="flex flex-col items-center justify-center py-2 mb-6">
        <CircularProgress
          percentage={data.overall}
          size={115}
          strokeWidth={10}
          color="#6C3BEB"
          trackColor="#F1ECFF"
          label="Strength"
        />
        <p className="mt-3 text-xs text-center font-medium text-slate-600 dark:text-slate-300">
          {data.overall >= 80
            ? "Your resume and profile are top tier!"
            : data.overall >= 50
            ? "Good foundation — a few more details will help."
            : "Complete more sections to boost recruiter discovery."}
        </p>
      </div>

      {/* Section Progress Bars */}
      <div className="space-y-3.5 mb-6">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-slate-600 dark:text-slate-400">{section.label}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {section.value}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, section.value))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Improve Resume Action Button */}
      <Link
        to="/resume-analyzer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-xs font-bold text-[#6C3BEB] hover:bg-purple-100 transition-colors dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50"
      >
        <Sparkles size={15} />
        Improve Resume
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
