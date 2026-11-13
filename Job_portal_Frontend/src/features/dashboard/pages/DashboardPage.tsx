import { useEffect, useState } from "react";
import {
  Briefcase,
  Clock,
  CalendarCheck,
  Award,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../auth/hooks/useAuth";
import { api, getApiErrorMessage } from "../../../services/api";
import { DashboardHeader } from "../components/DashboardHeader";
import { DashboardStatCard } from "../components/DashboardStatCard";
import { ResumeStrengthCard } from "../components/ResumeStrengthCard";
import { InterviewSchedule, type InterviewItem } from "../components/InterviewSchedule";
import {
  ApplicationStatusTable,
  type DashboardApplication,
} from "../components/ApplicationStatusTable";
import {
  RecommendedJobCard,
  type RecommendedJobItem,
} from "../components/RecommendedJobCard";
import {
  ApplicationTrackerModal,
  type ApplicationEvent,
} from "../../../components/applications/ApplicationTrackerModal";

interface DashboardData {
  application_counts?: {
    total: number;
    active?: number;
    pending?: number;
    shortlisted?: number;
    interview?: number;
    offers?: number;
    rejected?: number;
    by_status?: Record<string, number>;
  };
  saved_jobs_count?: number;
  profile_completion?: {
    completion_percentage: number;
    completed_sections?: string[];
    incomplete_sections?: string[];
    section_scores?: Record<string, number>;
  };
  resume_strength?: {
    overall: number;
    summary: number;
    experience: number;
    skills: number;
    education: number;
    has_resume: boolean;
    resume_status?: string | null;
  };
  upcoming_interviews?: InterviewItem[];
  recommended_jobs?: (RecommendedJobItem & { recommendation_score?: number | null })[];
  recent_applications?: DashboardApplication[];
  recent_activity?: {
    type: string;
    description: string;
    created_at: string;
    job_id: string | null;
    application_id: string | null;
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const outletCtx = useOutletContext<{ onMenu?: () => void } | null>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeModalApp, setActiveModalApp] = useState<DashboardApplication | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api
      .get<DashboardData>("/api/v1/dashboard")
      .then(({ data: resData }) => {
        if (isMounted) {
          setData(resData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const msg = getApiErrorMessage(err);
          setError(msg);
          setLoading(false);
          toast.error(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const candidateName = user?.full_name ?? "Candidate";

  // Real backend calculations
  const totalApps = data?.application_counts?.total ?? 0;
  const activeApps =
    data?.application_counts?.active ??
    (data?.application_counts?.pending ?? 0);
  const interviewApps =
    data?.application_counts?.interview ?? 0;
  const offersApps =
    data?.application_counts?.offers ??
    (data?.application_counts?.shortlisted ?? 0);

  const profilePct = data?.profile_completion?.completion_percentage ?? 0;
  const sectionScores = data?.profile_completion?.section_scores ?? {};

  const resumeStrength = data?.resume_strength ?? {
    overall: profilePct,
    summary: Math.min(100, Math.round(((sectionScores["professional_summary"] ?? 0) / 10) * 100)),
    experience: Math.min(100, Math.round(((sectionScores["work_experience"] ?? 0) / 15) * 100)),
    skills: Math.min(100, Math.round(((sectionScores["skills"] ?? 0) / 15) * 100)),
    education: Math.min(100, Math.round(((sectionScores["education"] ?? 0) / 15) * 100)),
    has_resume: false,
  };

  const applicationsList: DashboardApplication[] = data?.recent_applications ?? [];
  const recommendedList: RecommendedJobItem[] = data?.recommended_jobs ?? [];
  const interviewsList: InterviewItem[] = data?.upcoming_interviews ?? [];

  const handleOpenTracker = (appId: string) => {
    const found = applicationsList.find((a) => a.application_id === appId);
    if (found) {
      setActiveModalApp(found);
    }
  };

  const getEventsForApp = (app: DashboardApplication): ApplicationEvent[] => {
    const norm = app.status.toLowerCase();
    const events: ApplicationEvent[] = [
      { stage: "applied", date: app.applied_at, note: "Application received by system" },
    ];
    if (["under_review", "shortlisted", "interview_scheduled", "selected", "rejected"].includes(norm)) {
      events.push({ stage: "under_review", note: "Reviewing resume and candidate qualifications" });
    }
    if (["interview_scheduled", "selected"].includes(norm)) {
      events.push({ stage: "interview", note: "Interview stage scheduled with hiring team" });
    }
    if (norm === "shortlisted") {
      events.push({ stage: "shortlisted", note: "Candidate shortlisted for consideration" });
    }
    if (norm === "selected") {
      events.push({ stage: "selected", note: "Offer extended / candidate selected" });
    }
    if (norm === "rejected") {
      events.push({ stage: "rejected", note: "Application not moving forward at this time" });
    }
    return events;
  };

  return (
    <div className="space-y-7 pb-10">
      {/* 1. Top Header */}
      <DashboardHeader userName={candidateName} onMenu={outletCtx?.onMenu} />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <p className="font-semibold text-sm">Dashboard data could not be loaded: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : null}

      {/* 2. Statistics Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Applications */}
        <DashboardStatCard
          title="Total Applications"
          value={loading ? "..." : totalApps}
          description="Submitted across all positions"
          icon={Briefcase}
          variant="primary-gradient"
          badgeText="Active Candidate"
        />

        {/* Card 2: Active Applications */}
        <DashboardStatCard
          title="Active Applications"
          value={loading ? "..." : activeApps}
          description="Currently under active review"
          icon={Clock}
          variant="surface"
        />

        {/* Card 3: Waiting for Interview */}
        <DashboardStatCard
          title="Waiting for Interview"
          value={loading ? "..." : interviewApps}
          description="Interview rounds scheduled"
          icon={CalendarCheck}
          variant="surface"
        />

        {/* Card 4: Offers Received */}
        <DashboardStatCard
          title="Offers Received"
          value={loading ? "..." : offersApps}
          description="Selected by employers"
          icon={Award}
          variant="surface"
        />
      </div>

      {/* 3. Main Content Grid (Applications Table + Right Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Latest Application Status Table (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          <ApplicationStatusTable
            applications={applicationsList}
            loading={loading}
            onViewDetails={handleOpenTracker}
          />
        </div>

        {/* Right Column: Resume Strength & Interview Schedule (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          <ResumeStrengthCard data={resumeStrength} loading={loading} />
          <InterviewSchedule interviews={interviewsList} loading={loading} />
        </div>
      </div>

      {/* 4. Recommended Jobs Section */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6C3BEB] dark:text-purple-400">
              <Sparkles size={14} />
              <span>Tailored For You</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Recommended Jobs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Curated opportunities matched against your verified skills and preferences
            </p>
          </div>
          <Link
            to="/recommended-jobs"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#6C3BEB] hover:text-[#5426C9] dark:text-purple-400"
          >
            See All Recommendations
            <ArrowRight size={14} />
          </Link>
        </div>

        {recommendedList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <Sparkles className="mx-auto h-8 w-8 text-[#6C3BEB] dark:text-purple-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No personalized recommendations yet
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Add your preferred roles, locations, and top technical skills to unlock smart job recommendations.
            </p>
            <div className="mt-4">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-bold text-[#6C3BEB] hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300"
              >
                Complete Profile Skills
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {recommendedList.map((job) => (
              <div key={job.job_id} className="flex flex-col">
                <RecommendedJobCard job={job} />
                {job.recommendation_score !== null && job.recommendation_score !== undefined && (
                  <span className="sr-only">
                    {job.recommendation_score}% relevant
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Application Journey Tracker Modal */}
      {activeModalApp && (
        <ApplicationTrackerModal
          company={activeModalApp.company}
          position={activeModalApp.title}
          events={getEventsForApp(activeModalApp)}
          onClose={() => setActiveModalApp(null)}
        />
      )}
    </div>
  );
}
