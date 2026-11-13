import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Building2,
  MapPin,
  BriefcaseBusiness,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { jobsService } from "../services/jobs.service";
import type { JobDetails } from "../types/job.types";
import { JobShareActions } from "../components/JobShareActions";
import { Brand } from "../../../components/layout/Brand";

export default function PublicJobSharePage() {
  const { jobId = "" } = useParams();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      setError(true);
      return;
    }
    const controller = new AbortController();
    jobsService
      .details(jobId)
      .then((data) => {
        setJob(data);
        setError(false);
      })
      .catch(() => {
        setJob(null);
        setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading job opportunity…
        </p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <AlertCircle size={40} className="mx-auto text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            Job listing unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This job posting may have expired, been filled, or is no longer publicly accessible.
          </p>
          <div className="mt-6">
            <Link to="/jobs" className="button button-primary w-full justify-center">
              Explore open opportunities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const locationText =
    job.location.name ||
    [job.location.city, job.location.state, job.location.country]
      .filter(Boolean)
      .join(", ") ||
    "Location not specified";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Public Top Navbar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" aria-label="Jobs Territory home">
            <Brand />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-700 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-400"
            >
              Sign in
            </Link>
            <Link
              to={`/register?returnTo=${encodeURIComponent(`/jobs/${job.id}/apply`)}`}
              className="button button-primary text-xs"
            >
              Create free account
            </Link>
          </div>
        </div>
      </header>

      {/* Main Job Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
          {/* Header & Badges */}
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                <BriefcaseBusiness size={13} />
                <span>Verified Public Opening</span>
              </span>
              {job.posted_at && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={13} />
                  <span>Posted {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(job.posted_at))}</span>
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                {job.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  <Building2 size={16} className="text-purple-600 dark:text-purple-400" />
                  {job.company.name}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={15} className="text-slate-400" />
                  {locationText}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                  {job.employment_type.replace(/_/g, " ")}
                </span>
                {job.work_mode && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                    {job.work_mode.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>

            {/* Apply & Share Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <Link
                to={`/login?returnTo=${encodeURIComponent(`/jobs/${job.id}/apply`)}`}
                className="button button-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold"
              >
                <span>Sign in to apply</span>
                <ArrowRight size={16} />
              </Link>
              <JobShareActions job={job} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-6 pt-6">
            <section>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">About the Role</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {job.description}
              </p>
            </section>

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Responsibilities</h2>
                <ul className="mt-3 space-y-2">
                  {job.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 size={16} className="mt-0.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Qualifications */}
            {job.required_qualifications && job.required_qualifications.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Required Qualifications</h2>
                <ul className="mt-3 space-y-2">
                  {job.required_qualifications.map((qual, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 size={16} className="mt-0.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span>{qual}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Required Skills */}
            {job.skills && job.skills.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Required Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border border-purple-200 bg-purple-50/60 px-3 py-1 text-xs font-medium text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Footer Call to Action */}
          <div className="mt-8 rounded-xl border border-purple-100 bg-purple-50/50 p-6 text-center dark:border-purple-900/50 dark:bg-purple-950/20">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Interested in this opportunity?
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Join Jobs Territory to apply with one click, run automated resume skill matching, and track your application status.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                to={`/login?returnTo=${encodeURIComponent(`/jobs/${job.id}/apply`)}`}
                className="button button-primary text-xs"
              >
                Sign in to apply
              </Link>
              <Link to="/jobs" className="button button-outline text-xs">
                Browse more jobs
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
