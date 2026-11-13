export type EmploymentType = "full_time" | "part_time" | "internship" | "contract" | "freelance";
export type WorkMode = "remote" | "hybrid" | "on_site";
export type JobSort = "latest" | "oldest" | "salary_high" | "salary_low" | "experience_low" | "relevant";
export type SkillsMatch = "any" | "all";

export interface CompanySummary { id: string; name: string; logo_url: string | null }
export interface CompanyDetails extends CompanySummary { description: string | null; website_url: string | null }
export interface JobLocation { name: string | null; city: string | null; state: string | null; country: string | null }
export interface NumericRange { minimum: number | null; maximum: number | null }
export interface JobSalary extends NumericRange { currency: string | null }
export interface JobListItem {
  id: string; title: string; company: CompanySummary; description_summary: string | null; location: JobLocation;
  employment_type: EmploymentType; work_mode: WorkMode | null; experience: NumericRange; salary: JobSalary;
  skills: string[]; openings: number; posted_at: string | null; application_deadline: string | null; status: "published";
}
export interface JobDetails extends JobListItem {
  company: CompanyDetails; description: string; responsibilities: string[]; required_qualifications: string[];
  preferred_qualifications: string[]; benefits: string[];
}
export interface Pagination { page: number; page_size: number; total_items: number; total_pages: number; has_next: boolean; has_previous: boolean }
export interface JobListResponse { items: JobListItem[]; pagination: Pagination }
export interface RecentlyViewedJob extends JobListItem { viewed_at: string; view_count: number }
export interface RecentlyViewedResponse { items: RecentlyViewedJob[]; pagination: Pagination }
export interface JobViewResult { job_id: string; viewed_at: string; view_count: number }
