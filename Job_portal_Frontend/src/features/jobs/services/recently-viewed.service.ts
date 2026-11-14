import { api } from "../../../services/api";
import type { JobViewResult, RecentlyViewedResponse } from "../types/job.types";

/**
 * recentlyViewedService:
 * API endpoints for tracking and displaying jobs recently viewed by the candidate.
 */
export const recentlyViewedService = {
  /** list: Retrieves a list of recently viewed job postings */
  async list(page = 1, pageSize = 5, signal?: AbortSignal): Promise<RecentlyViewedResponse> {
    const { data } = await api.get<RecentlyViewedResponse>(`/api/v1/jobs/recently-viewed?page=${page}&page_size=${pageSize}`, { signal });
    return data;
  },

  /** record: Logs that candidate viewed a specific job listing */
  async record(jobId: string): Promise<JobViewResult> {
    const { data } = await api.post<JobViewResult>(`/api/v1/jobs/${encodeURIComponent(jobId)}/view`);
    return data;
  },

  /** remove: Clears a job from the recently viewed history */
  async remove(jobId: string): Promise<void> {
    await api.delete(`/api/v1/jobs/recently-viewed/${encodeURIComponent(jobId)}`);
  },
};
