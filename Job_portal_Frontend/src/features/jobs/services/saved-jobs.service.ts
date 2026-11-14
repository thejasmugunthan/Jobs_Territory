import { api } from "../../../services/api";
import type { Pagination } from "../types/job.types";

export interface SavedJob {
  id: string;
  job_id: string;
  job: import("../types/job.types").JobListItem | null;
  saved_at: string;
  is_available: boolean;
}

export interface SavedJobsResponse {
  items: SavedJob[];
  pagination: Pagination;
}

/**
 * savedJobsService:
 * API endpoints for managing candidate's bookmarked / saved jobs.
 */
export const savedJobsService = {
  /** list: Retrieves candidate's saved jobs with pagination and sorting */
  async list(page = 1, pageSize = 10, sortBy = "latest", signal?: AbortSignal): Promise<SavedJobsResponse> {
    const { data } = await api.get<SavedJobsResponse>(
      `/api/v1/jobs/saved?page=${page}&page_size=${pageSize}&sort_by=${sortBy}`,
      { signal },
    );
    return data;
  },

  /** isSaved: Checks if a particular job is already bookmarked by the candidate */
  async isSaved(jobId: string, signal?: AbortSignal): Promise<boolean> {
    const { data } = await api.get<{ saved: boolean }>(`/api/v1/jobs/${encodeURIComponent(jobId)}/save`, { signal });
    return data.saved;
  },

  /** save: Adds a job to candidate's saved jobs list */
  async save(jobId: string): Promise<void> {
    await api.post(`/api/v1/jobs/${encodeURIComponent(jobId)}/save`);
  },

  /** remove: Removes a job from candidate's saved jobs list */
  async remove(jobId: string): Promise<void> {
    await api.delete(`/api/v1/jobs/${encodeURIComponent(jobId)}/save`);
  },
};
