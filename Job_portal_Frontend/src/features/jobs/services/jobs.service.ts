import { api } from "../../../services/api";
import type { JobDetails, JobListResponse } from "../types/job.types";

export const jobsService = {
  async list(params: URLSearchParams, signal?: AbortSignal): Promise<JobListResponse> {
    const query = params.toString();
    const { data } = await api.get<JobListResponse>(`/api/v1/jobs${query ? `?${query}` : ""}`, { signal });
    return data;
  },
  async search(params: URLSearchParams, signal?: AbortSignal): Promise<JobListResponse> {
    const query = params.toString();
    const { data } = await api.get<JobListResponse>(`/api/v1/jobs/search${query ? `?${query}` : ""}`, { signal });
    return data;
  },
  async details(jobId: string, signal?: AbortSignal): Promise<JobDetails> {
    const { data } = await api.get<JobDetails>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, { signal });
    return data;
  },
  async compare(ids: string[], signal?: AbortSignal): Promise<JobDetails[]> {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids", id));
    const { data } = await api.get<JobDetails[]>(`/api/v1/jobs/compare?${params}`, { signal });
    return data;
  },
};
