import { api } from "../../services/api";

export interface JobMatch {
  job_id: string;
  overall_compatibility_score: number | null;
  skill_match_percentage: number | null;
  experience_match_percentage: number | null;
  education_match_percentage: number | null;
  data_completeness: number;
  matched_skills: string[];
  matched_preferred_skills: string[];
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  candidate_experience_years: number | null;
  required_experience_years: number | null;
  education_requirement: string | null;
  education_met: boolean | null;
  score_breakdown: Record<string, { score: number | null; weight: number } | string>;
  explanation: string[];
  improvement_suggestions: string[];
  disclaimer: string;
}

/**
 * getJobMatch:
 * Computes and returns the AI match score and skill breakdown between candidate profile and a job listing.
 */
export async function getJobMatch(jobId: string): Promise<JobMatch> {
  const { data } = await api.get<JobMatch>(`/api/v1/jobs/${encodeURIComponent(jobId)}/match`);
  return data;
}
