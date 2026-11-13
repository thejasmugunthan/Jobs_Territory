import { api } from "../../../services/api";
import type { ApiEnvelope } from "../../../types/api.types";
import type { CandidateProfile, Certification, Education, Experience, JobPreferences, ProfileCompletion, Project, Proficiency, Skill, SkillCatalogItem } from "../types/profile.types";

async function data<T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<T> { return (await request).data.data; }
const base = "/api/v1/profile";
export const profileService = {
  get: () => data(api.get<ApiEnvelope<CandidateProfile>>(`${base}/me`)),
  create: (payload: Partial<CandidateProfile> & Pick<CandidateProfile, "full_name">) => data(api.post<ApiEnvelope<CandidateProfile>>(base, payload)),
  update: (payload: Partial<CandidateProfile>) => data(api.patch<ApiEnvelope<CandidateProfile>>(`${base}/me`, payload)),
  completion: () => data(api.get<ApiEnvelope<ProfileCompletion>>(`${base}/completion`)),
  education: {
    list: () => data(api.get<ApiEnvelope<Education[]>>(`${base}/education`)),
    create: (payload: Partial<Education>) => data(api.post<ApiEnvelope<Education>>(`${base}/education`, payload)),
    update: (id: string, payload: Partial<Education>) => data(api.patch<ApiEnvelope<Education>>(`${base}/education/${id}`, payload)),
    remove: (id: string) => api.delete(`${base}/education/${id}`),
  },
  experience: {
    list: () => data(api.get<ApiEnvelope<Experience[]>>(`${base}/experience`)),
    create: (payload: Partial<Experience>) => data(api.post<ApiEnvelope<Experience>>(`${base}/experience`, payload)),
    update: (id: string, payload: Partial<Experience>) => data(api.patch<ApiEnvelope<Experience>>(`${base}/experience/${id}`, payload)),
    remove: (id: string) => api.delete(`${base}/experience/${id}`),
  },
  skills: {
    list: () => data(api.get<ApiEnvelope<Skill[]>>(`${base}/skills`)),
    search: (search: string) => data(api.get<ApiEnvelope<SkillCatalogItem[]>>(`${base}/skills/catalog`, { params: { search, limit: 20 } })),
    add: (skill_id: string, proficiency_level: Proficiency) => data(api.post<ApiEnvelope<Skill>>(`${base}/skills`, { skill_id, proficiency_level })),
    update: (id: string, proficiency_level: Proficiency) => data(api.patch<ApiEnvelope<{ skill_id: string; proficiency_level: Proficiency }>>(`${base}/skills/${id}`, { proficiency_level })),
    remove: (id: string) => api.delete(`${base}/skills/${id}`),
  },
  projects: {
    list: () => data(api.get<ApiEnvelope<Project[]>>(`${base}/projects`)),
    create: (payload: Partial<Project>) => data(api.post<ApiEnvelope<Project>>(`${base}/projects`, payload)),
    update: (id: string, payload: Partial<Project>) => data(api.patch<ApiEnvelope<Project>>(`${base}/projects/${id}`, payload)),
    remove: (id: string) => api.delete(`${base}/projects/${id}`),
  },
  certifications: {
    list: () => data(api.get<ApiEnvelope<Certification[]>>(`${base}/certifications`)),
    create: (payload: Partial<Certification>) => data(api.post<ApiEnvelope<Certification>>(`${base}/certifications`, payload)),
    update: (id: string, payload: Partial<Certification>) => data(api.patch<ApiEnvelope<Certification>>(`${base}/certifications/${id}`, payload)),
    remove: (id: string) => api.delete(`${base}/certifications/${id}`),
  },
  preferences: {
    get: () => data(api.get<ApiEnvelope<JobPreferences>>(`${base}/preferences`)),
    save: (payload: JobPreferences) => data(api.put<ApiEnvelope<JobPreferences>>(`${base}/preferences`, payload)),
  },
};
