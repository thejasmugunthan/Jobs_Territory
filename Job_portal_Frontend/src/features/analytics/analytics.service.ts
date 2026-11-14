import { api } from "../../services/api";

export interface CountRate {
  numerator: number;
  denominator: number;
  percentage: number;
}

export interface StatusDistributionItem {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface TrendItem {
  period: string;
  label: string;
  count: number;
}

export interface WeeklyActivityItem {
  week_start: string;
  week_end: string;
  label: string;
  count: number;
}

export interface ApplicationAnalytics {
  start_date: string;
  end_date: string;
  period: string;
  total_applications: number;
  submitted_applications: number;
  shortlisted_count: number;
  rejected_count: number;
  selected_count: number;
  applications_by_status: Record<string, number>;
  status_distribution: StatusDistributionItem[];
  trend: TrendItem[];
  weekly_activity: WeeklyActivityItem[];
  shortlist_rate: CountRate;
  offer_rate: CountRate;
  definitions?: Record<string, string>;
}

/**
 * analyticsService:
 * API endpoints for fetching candidate application metrics, pipeline statistics, and activity charts.
 */
export const analyticsService = {
  /** applications: Fetches aggregated application metrics, status distribution, and trends */
  async applications(params: URLSearchParams, signal?: AbortSignal): Promise<ApplicationAnalytics> {
    const { data } = await api.get<ApplicationAnalytics>(`/api/v1/analytics/applications?${params.toString()}`, {
      signal,
    });
    return data;
  },
};
