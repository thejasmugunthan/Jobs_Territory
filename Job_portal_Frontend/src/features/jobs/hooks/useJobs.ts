import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getApiErrorMessage } from "../../../services/api";
import { jobsService } from "../services/jobs.service";
import { searchParamsToInput, toApiSearchParams } from "../schemas/job-search.schema";
import type { JobListResponse } from "../types/job.types";

export function useJobs(searchParams: URLSearchParams) {
  const key = searchParams.toString();
  const parsed = useMemo(() => searchParamsToInput(new URLSearchParams(key)), [key]);
  const apiParams = useMemo(() => parsed.success ? toApiSearchParams(parsed.data) : null, [parsed]);
  const [data, setData] = useState<JobListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    if (!parsed.success || !apiParams) { setLoading(false); setData(null); setError(""); return; }
    const controller = new AbortController();
    setLoading(true); setError(""); setUnauthorized(false);
    const request = parsed.data.q ? jobsService.search : jobsService.list;
    request(apiParams, controller.signal).then((response) => { if (!controller.signal.aborted) setData(response); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setData(null); setUnauthorized(axios.isAxiosError(cause) && cause.response?.status === 401); setError(getApiErrorMessage(cause, "Could not load jobs right now.")); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiParams, parsed, retryKey]);
  const retry = useCallback(() => setRetryKey((value) => value + 1), []);
  const validationError = parsed.success ? "" : parsed.error.issues[0]?.message ?? "Check the search filters in the URL.";
  return { data, loading: loading && !validationError, error, validationError, unauthorized, retry };
}
