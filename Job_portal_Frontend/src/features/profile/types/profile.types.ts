export interface ProfileRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CandidateProfile extends ProfileRecord {
  user_id: string;
  full_name: string;
  profile_initialized: boolean;
  phone_number: string | null;
  profile_headline: string | null;
  professional_summary: string | null;
  current_location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  total_experience: number | null;
  current_employment_status: string | null;
}

export interface Education extends ProfileRecord {
  institution_name: string; degree: string; field_of_study: string | null; start_date: string; end_date: string | null;
  is_currently_studying: boolean; grade: string | null; description: string | null;
}
export interface Experience extends ProfileRecord {
  company_name: string; job_title: string; employment_type: EmploymentType; location: string | null; start_date: string;
  end_date: string | null; currently_working: boolean; description: string | null; responsibilities: string[];
}
export interface Skill { skill_id: string; name: string; category: string; proficiency_level: Proficiency }
export interface SkillCatalogItem { id: string; name: string; category: string }
export interface Project extends ProfileRecord {
  project_name: string; description: string | null; technologies_used: string[]; project_url: string | null;
  repository_url: string | null; start_date: string | null; end_date: string | null; is_ongoing: boolean;
}
export interface Certification extends ProfileRecord {
  certification_name: string; issuing_organization: string; issue_date: string; expiration_date: string | null;
  credential_id: string | null; credential_url: string | null; does_not_expire: boolean;
}
export type EmploymentType = "full-time" | "part-time" | "internship" | "contract" | "freelance";
export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";
export interface JobPreferences {
  preferred_job_titles: string[]; preferred_locations: string[]; preferred_employment_types: EmploymentType[];
  preferred_work_modes: ("remote" | "hybrid" | "on-site")[]; minimum_expected_salary: number | null;
  maximum_expected_salary: number | null; salary_currency: string | null; preferred_experience_level: string | null; willing_to_relocate: boolean;
  available_to_join: string | null; preferred_industries: string[];
}
export interface ProfileCompletion {
  completion_percentage: number; completed_sections: string[]; incomplete_sections: string[]; section_scores: Record<string, number>;
}
