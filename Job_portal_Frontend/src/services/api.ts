import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { TokenResponse } from "../features/auth/types";
import { tokenStore } from "../features/auth/tokenStore";

// Base URL resolution: prefers VITE_API_BASE_URL, defaults to Render backend in production or localhost in development
const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  (import.meta.env.PROD ? "https://jobs-territory-1.onrender.com" : "http://localhost:8000");

/**
 * Main Axios HTTP client instance for Jobs Territory API.
 * Configured with JSON headers and 15-second request timeout.
 */
export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 15_000,
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshRequest: Promise<void> | null = null;

/**
 * Request Interceptor:
 * Attaches the current Bearer access token to the Authorization header of outgoing requests.
 */
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Response Interceptor:
 * Automatically handles 401 Unauthorized responses by refreshing the JWT access token
 * using a single shared in-flight refresh promise, then retrying the original failed request.
 * If refresh fails or no refresh token exists, clears stored tokens and notifies the app.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const url = config?.url ?? "";
    const isAuthRequest = ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh"].some((path) => url.endsWith(path));
    if (error.response?.status !== 401 || !config || config._retried || isAuthRequest) throw error;

    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent("jobs-auth-expired"));
      throw error;
    }

    config._retried = true;
    try {
      refreshRequest ??= api
        .post<TokenResponse>("/api/v1/auth/refresh", { refresh_token: refreshToken })
        .then(({ data }) => tokenStore.set(data.access_token, data.refresh_token))
        .finally(() => {
          refreshRequest = null;
        });
      await refreshRequest;
      return api(config);
    } catch (refreshError) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent("jobs-auth-expired"));
      throw refreshError;
    }
  },
);

/**
 * getApiErrorMessage:
 * Extracts a concise, human-readable error description from Axios errors,
 * backend validation envelopes, or network connection failures.
 */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { detail?: unknown; message?: unknown } | undefined;
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.detail === "string") return body.detail;
    if (body?.detail && typeof body.detail === "object" && "message" in body.detail && typeof body.detail.message === "string") return body.detail.message;
    if (!error.response) return "Unable to reach Jobs Territory. Check your connection and try again.";
  }
  return fallback;
}
