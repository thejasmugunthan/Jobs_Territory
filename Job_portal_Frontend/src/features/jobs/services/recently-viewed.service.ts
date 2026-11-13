import { api } from "../../../services/api";
import type { JobViewResult, RecentlyViewedResponse } from "../types/job.types";

export const recentlyViewedService = {
  async list(page = 1, pageSize = 5, signal?: AbortSignal): Promise<RecentlyViewedResponse> {
    const { data } = await api.get<RecentlyViewedResponse>(`/api/v1/jobs/recently-viewed?page=${page}&page_size=${pageSize}`, { signal });
    return data;
  },
  async record(jobId: string): Promise<JobViewResult> {
    const { data } = await api.post<JobViewResult>(`/api/v1/jobs/${encodeURIComponent(jobId)}/view`);
    return data;
  },
  async remove(jobId: string): Promise<void> {
    await api.delete(`/api/v1/jobs/recently-viewed/${encodeURIComponent(jobId)}`);
  },
};
