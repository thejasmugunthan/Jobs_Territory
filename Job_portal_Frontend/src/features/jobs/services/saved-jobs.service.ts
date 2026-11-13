import { api } from "../../../services/api";
import type { Pagination } from "../types/job.types";

export interface SavedJob { id: string; job_id: string; job: import("../types/job.types").JobListItem | null; saved_at: string; is_available: boolean }
export interface SavedJobsResponse { items: SavedJob[]; pagination: Pagination }
export const savedJobsService = {
 async list(page=1,pageSize=10,sortBy="latest",signal?:AbortSignal):Promise<SavedJobsResponse>{const {data}=await api.get<SavedJobsResponse>(`/api/v1/jobs/saved?page=${page}&page_size=${pageSize}&sort_by=${sortBy}`,{signal});return data;},
 async isSaved(jobId:string,signal?:AbortSignal):Promise<boolean>{const {data}=await api.get<{saved:boolean}>(`/api/v1/jobs/${encodeURIComponent(jobId)}/save`,{signal});return data.saved;},
 async save(jobId:string):Promise<void>{await api.post(`/api/v1/jobs/${encodeURIComponent(jobId)}/save`);},
 async remove(jobId:string):Promise<void>{await api.delete(`/api/v1/jobs/${encodeURIComponent(jobId)}/save`);},
};
