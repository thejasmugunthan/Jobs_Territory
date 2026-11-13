import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { getApiErrorMessage } from "../../../services/api";
import { useAuth } from "../../auth/hooks/useAuth";
import { jobsService } from "../services/jobs.service";
import { recentlyViewedService } from "../services/recently-viewed.service";
import type { JobDetails } from "../types/job.types";

export function useJobDetails(jobId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const recordedId = useRef<string | null>(null);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setJob(null); setError(""); setNotFound(false); setLoading(true);
    if (!jobId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
      setNotFound(true); setError("This job link is not valid."); setLoading(false);
      return () => controller.abort();
    }
    jobsService.details(jobId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setJob(result);
      if (isAuthenticated && recordedId.current !== jobId) {
        recordedId.current = jobId;
        void recentlyViewedService.record(jobId).catch(() => { /* Details remain available if view tracking fails. */ });
      }
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      if (axios.isAxiosError(cause) && cause.response?.status === 404) { setNotFound(true); setError("This job is no longer available."); }
      else if (axios.isAxiosError(cause) && cause.response?.status === 422) { setNotFound(true); setError("This job link is not valid."); }
      else setError(getApiErrorMessage(cause, "We couldn’t load this job. Please try again."));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobId, isAuthenticated, retryKey]);
  return { job, loading, error, notFound, retry: () => setRetryKey((value) => value + 1) };
}
