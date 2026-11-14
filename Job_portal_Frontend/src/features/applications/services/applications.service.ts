import { api } from "../../../services/api";
import type {
  ApplicationCreated,
  ApplicationDetails,
  ApplicationHistoryResponse,
  ApplicationStatusResponse,
  ApplicationsResponse,
} from "../types/application.types";

/**
 * applicationsService:
 * API endpoints for creating, tracking, and managing candidate job applications.
 */
export const applicationsService = {
  /** create: Submits a new job application with resume file and cover letter */
  async create(
    jobId: string,
    values: { resume?: File; cover_letter: string },
    onUploadProgress?: (percent: number) => void,
  ): Promise<ApplicationCreated> {
    const form = new FormData();
    if (values.resume) form.append("resume", values.resume);
    if (values.cover_letter.trim()) form.append("cover_letter", values.cover_letter.trim());
    const { data } = await api.post<ApplicationCreated>(`/api/v1/jobs/${encodeURIComponent(jobId)}/applications`, form, {
      onUploadProgress: (event) => {
        if (event.total) onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data;
  },

  /** list: Retrieves candidate's submitted applications with filtering and pagination */
  async list(
    options: { status?: string; q?: string; page?: number; pageSize?: number; sortBy?: string },
    signal?: AbortSignal,
  ): Promise<ApplicationsResponse> {
    const params = new URLSearchParams();
    if (options.status) params.set("status", options.status);
    if (options.q?.trim()) params.set("q", options.q.trim());
    params.set("page", String(options.page ?? 1));
    params.set("page_size", String(options.pageSize ?? 10));
    params.set("sort_by", options.sortBy ?? "latest");
    const { data } = await api.get<ApplicationsResponse>(`/api/v1/applications?${params}`, { signal });
    return data;
  },

  /** details: Retrieves comprehensive information for an individual application */
  async details(id: string, signal?: AbortSignal): Promise<ApplicationDetails> {
    const { data } = await api.get<ApplicationDetails>(`/api/v1/applications/${encodeURIComponent(id)}`, { signal });
    return data;
  },

  /** status: Retrieves the current review status and stage of an application */
  async status(id: string, signal?: AbortSignal): Promise<ApplicationStatusResponse> {
    const { data } = await api.get<ApplicationStatusResponse>(`/api/v1/applications/${encodeURIComponent(id)}/status`, { signal });
    return data;
  },

  /** history: Retrieves chronological activity timeline events for an application */
  async history(id: string, signal?: AbortSignal): Promise<ApplicationHistoryResponse> {
    const { data } = await api.get<ApplicationHistoryResponse>(`/api/v1/applications/${encodeURIComponent(id)}/history`, { signal });
    return data;
  },

  /** resumeLink: Obtains a temporary secure download URL for the uploaded resume */
  async resumeLink(id: string, signal?: AbortSignal): Promise<string> {
    const { data } = await api.get<{ url: string; expires_at: string }>(`/api/v1/applications/${encodeURIComponent(id)}/resume`, { signal });
    return data.url;
  },
};
