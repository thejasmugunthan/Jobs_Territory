import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../services/api";
import { useAuth } from "../../auth/hooks/useAuth";
import { recentlyViewedService } from "../services/recently-viewed.service";
import type { RecentlyViewedResponse } from "../types/job.types";

export function useRecentlyViewedJobs(page = 1, pageSize = 5) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<RecentlyViewedResponse | null>(null);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [removingId, setRemovingId] = useState("");
  useEffect(() => {
    if (!isAuthenticated) { setData(null); setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError("");
    recentlyViewedService.list(page, pageSize, controller.signal).then((value) => { if (!controller.signal.aborted) setData(value); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(getApiErrorMessage(cause, "Could not load recently viewed jobs.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isAuthenticated, page, pageSize, refreshKey]);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const remove = useCallback(async (jobId: string) => {
    setRemovingId(jobId);
    try { await recentlyViewedService.remove(jobId); toast.success("Removed from recently viewed"); refresh(); }
    catch (cause) { toast.error(getApiErrorMessage(cause, "Could not remove this job.")); }
    finally { setRemovingId(""); }
  }, [refresh]);
  return { data, loading, error, removingId, refresh, remove };
}
