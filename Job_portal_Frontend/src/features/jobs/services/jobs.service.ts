import { api } from "../../../services/api";
import type { JobDetails, JobListResponse } from "../types/job.types";

/**
 * jobsService:
 * API endpoints for discovering, filtering, viewing details, and comparing jobs.
 */
export const jobsService = {
  /** list: Fetches paginated list of job postings with optional query parameters */
  async list(params: URLSearchParams, signal?: AbortSignal): Promise<JobListResponse> {
    const query = params.toString();
    const { data } = await api.get<JobListResponse>(`/api/v1/jobs${query ? `?${query}` : ""}`, { signal });
    return data;
  },

  /** search: Performs keyword and filter searches across available job vacancies */
  async search(params: URLSearchParams, signal?: AbortSignal): Promise<JobListResponse> {
    const query = params.toString();
    const { data } = await api.get<JobListResponse>(`/api/v1/jobs/search${query ? `?${query}` : ""}`, { signal });
    return data;
  },

  /** details: Retrieves complete details for a single job listing by ID */
  async details(jobId: string, signal?: AbortSignal): Promise<JobDetails> {
    const { data } = await api.get<JobDetails>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, { signal });
    return data;
  },

  /** compare: Compares multiple jobs side-by-side by their IDs */
  async compare(ids: string[], signal?: AbortSignal): Promise<JobDetails[]> {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids", id));
    const { data } = await api.get<JobDetails[]>(`/api/v1/jobs/compare?${params}`, { signal });
    return data;
  },
};
