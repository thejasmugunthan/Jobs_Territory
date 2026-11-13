export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  detail?: string | { message?: string; error_code?: string };
  message?: string;
  error_code?: string;
}
