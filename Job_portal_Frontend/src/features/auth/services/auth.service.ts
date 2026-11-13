import { api } from "../../../services/api";
import type { ApiEnvelope } from "../../../types/api.types";
import type { LoginPayload, RegisterPayload, TokenResponse, User } from "../types";

export const authService = {
  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await api.post<User>("/api/v1/auth/register", payload);
    return data;
  },
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/api/v1/auth/login", payload);
    return data;
  },
  async me(): Promise<User> {
    const { data } = await api.get<User>("/api/v1/auth/me");
    return data;
  },
  async logout(refreshToken: string): Promise<void> {
    await api.post("/api/v1/auth/logout", { refresh_token: refreshToken });
  },
  async forgotPassword(email: string): Promise<string> {
    const { data } = await api.post<{ message: string }>("/api/v1/auth/forgot-password", { email });
    return data.message;
  },
  async resetPassword(token: string, newPassword: string): Promise<string> {
    const { data } = await api.post<{ message: string }>("/api/v1/auth/reset-password", { token, new_password: newPassword });
    return data.message;
  },
};

export interface ProfileCompletion {
  completion_percentage: number;
  completed_sections: string[];
  incomplete_sections: string[];
  section_scores: Record<string, number>;
}

export async function getProfileCompletion(): Promise<ProfileCompletion> {
  const { data } = await api.get<ApiEnvelope<ProfileCompletion>>("/api/v1/profile/completion");
  return data.data;
}

export interface CandidateProfile {
  id: string;
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

export async function getCandidateProfile(): Promise<CandidateProfile> {
  const { data } = await api.get<ApiEnvelope<CandidateProfile>>("/api/v1/profile/me");
  return data.data;
}

export async function updateCandidateProfile(payload: Partial<CandidateProfile>): Promise<CandidateProfile> {
  const { data } = await api.patch<ApiEnvelope<CandidateProfile>>("/api/v1/profile/me", payload);
  return data.data;
}
