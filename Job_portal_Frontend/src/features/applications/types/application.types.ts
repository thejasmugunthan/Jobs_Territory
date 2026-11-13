import type { JobListItem, Pagination } from "../../jobs/types/job.types";

export type ApplicationStatus = "applied" | "under_review" | "shortlisted" | "interview_scheduled" | "selected" | "rejected" | "withdrawn";
export interface ApplicationItem { id: string; job: JobListItem; status: ApplicationStatus; cover_letter: string | null; applied_at: string; last_status_changed_at: string }
export interface ApplicationDetails extends ApplicationItem { has_resume: boolean; resume_filename: string | null }
export interface ApplicationsResponse { items: ApplicationItem[]; pagination: Pagination; status_counts: Record<ApplicationStatus, number> }
export interface ApplicationStatusResponse { application_id: string; status: ApplicationStatus; last_status_changed_at: string }
export interface ApplicationHistoryEntry { previous_status: ApplicationStatus | null; new_status: ApplicationStatus; changed_at: string; description: string | null }
export interface ApplicationHistoryResponse { application_id: string; history: ApplicationHistoryEntry[] }
export interface ApplicationCreated { id: string; job_id: string; status: ApplicationStatus; cover_letter: string | null; applied_at: string; last_status_changed_at: string }
