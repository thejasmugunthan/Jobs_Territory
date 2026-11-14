import { api } from "../../../services/api";
import type { ApiEnvelope } from "../../../types/api.types";
import type {
  CandidateProfile,
  Certification,
  Education,
  Experience,
  JobPreferences,
  ProfileCompletion,
  Project,
  Proficiency,
  Skill,
  SkillCatalogItem,
} from "../types/profile.types";

/** Unwraps standard ApiEnvelope response to extract underlying data payload */
async function data<T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  return (await request).data.data;
}

const base = "/api/v1/profile";

/**
 * profileService:
 * API endpoints for candidate profile information, skills, experience, education, projects, certifications, and job preferences.
 */
export const profileService = {
  /** get: Fetches authenticated candidate's profile record */
  get: () => data(api.get<ApiEnvelope<CandidateProfile>>(`${base}/me`)),

  /** create: Initializes a new candidate profile */
  create: (payload: Partial<CandidateProfile> & Pick<CandidateProfile, "full_name">) =>
    data(api.post<ApiEnvelope<CandidateProfile>>(base, payload)),

  /** update: Updates profile details for current candidate */
  update: (payload: Partial<CandidateProfile>) =>
    data(api.patch<ApiEnvelope<CandidateProfile>>(`${base}/me`, payload)),

  /** completion: Calculates profile completion percentage and missing fields */
  completion: () => data(api.get<ApiEnvelope<ProfileCompletion>>(`${base}/completion`)),

  /** education: Endpoints for managing academic degrees and credentials */
  education: {
    /** list: Retrieves all education records */
    list: () => data(api.get<ApiEnvelope<Education[]>>(`${base}/education`)),
    /** create: Adds a new education entry */
    create: (payload: Partial<Education>) => data(api.post<ApiEnvelope<Education>>(`${base}/education`, payload)),
    /** update: Updates an existing education record */
    update: (id: string, payload: Partial<Education>) =>
      data(api.patch<ApiEnvelope<Education>>(`${base}/education/${id}`, payload)),
    /** remove: Deletes an education record by ID */
    remove: (id: string) => api.delete(`${base}/education/${id}`),
  },

  /** experience: Endpoints for managing work history and employment roles */
  experience: {
    /** list: Retrieves all employment history records */
    list: () => data(api.get<ApiEnvelope<Experience[]>>(`${base}/experience`)),
    /** create: Adds a new work experience entry */
    create: (payload: Partial<Experience>) => data(api.post<ApiEnvelope<Experience>>(`${base}/experience`, payload)),
    /** update: Modifies an existing work experience record */
    update: (id: string, payload: Partial<Experience>) =>
      data(api.patch<ApiEnvelope<Experience>>(`${base}/experience/${id}`, payload)),
    /** remove: Deletes a work experience entry by ID */
    remove: (id: string) => api.delete(`${base}/experience/${id}`),
  },

  /** skills: Endpoints for catalog lookup and managing candidate skills */
  skills: {
    /** list: Retrieves candidate's linked skills and proficiencies */
    list: () => data(api.get<ApiEnvelope<Skill[]>>(`${base}/skills`)),
    /** search: Queries master skill catalog by name */
    search: (search: string) =>
      data(api.get<ApiEnvelope<SkillCatalogItem[]>>(`${base}/skills/catalog`, { params: { search, limit: 20 } })),
    /** add: Adds a skill with proficiency level to candidate profile */
    add: (skill_id: string, proficiency_level: Proficiency) =>
      data(api.post<ApiEnvelope<Skill>>(`${base}/skills`, { skill_id, proficiency_level })),
    /** update: Modifies proficiency level for an existing candidate skill */
    update: (id: string, proficiency_level: Proficiency) =>
      data(api.patch<ApiEnvelope<{ skill_id: string; proficiency_level: Proficiency }>>(`${base}/skills/${id}`, {
        proficiency_level,
      })),
    /** remove: Removes a skill from candidate profile */
    remove: (id: string) => api.delete(`${base}/skills/${id}`),
  },

  /** projects: Endpoints for managing portfolio and engineering projects */
  projects: {
    /** list: Retrieves all project entries */
    list: () => data(api.get<ApiEnvelope<Project[]>>(`${base}/projects`)),
    /** create: Adds a new portfolio project */
    create: (payload: Partial<Project>) => data(api.post<ApiEnvelope<Project>>(`${base}/projects`, payload)),
    /** update: Modifies an existing project record */
    update: (id: string, payload: Partial<Project>) =>
      data(api.patch<ApiEnvelope<Project>>(`${base}/projects/${id}`, payload)),
    /** remove: Deletes a project record by ID */
    remove: (id: string) => api.delete(`${base}/projects/${id}`),
  },

  /** certifications: Endpoints for managing professional licenses and certifications */
  certifications: {
    /** list: Retrieves all certification records */
    list: () => data(api.get<ApiEnvelope<Certification[]>>(`${base}/certifications`)),
    /** create: Adds a new professional certification */
    create: (payload: Partial<Certification>) =>
      data(api.post<ApiEnvelope<Certification>>(`${base}/certifications`, payload)),
    /** update: Modifies an existing certification record */
    update: (id: string, payload: Partial<Certification>) =>
      data(api.patch<ApiEnvelope<Certification>>(`${base}/certifications/${id}`, payload)),
    /** remove: Deletes a certification record by ID */
    remove: (id: string) => api.delete(`${base}/certifications/${id}`),
  },

  /** preferences: Endpoints for managing job search criteria and salary expectations */
  preferences: {
    /** get: Retrieves candidate's job preferences */
    get: () => data(api.get<ApiEnvelope<JobPreferences>>(`${base}/preferences`)),
    /** save: Saves updated job preferences and salary criteria */
    save: (payload: JobPreferences) => data(api.put<ApiEnvelope<JobPreferences>>(`${base}/preferences`, payload)),
  },
};
