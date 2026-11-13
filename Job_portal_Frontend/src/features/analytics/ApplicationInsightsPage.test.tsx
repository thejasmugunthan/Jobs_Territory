import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ApplicationInsightsPage from "./ApplicationInsightsPage";
import { analyticsService } from "./analytics.service";

vi.mock("./analytics.service", () => ({
  analyticsService: {
    applications: vi.fn(),
  },
}));

const mockAnalyticsData = {
  start_date: "2026-08-15",
  end_date: "2026-11-13",
  period: "weekly",
  total_applications: 10,
  submitted_applications: 8,
  shortlisted_count: 3,
  rejected_count: 2,
  selected_count: 1,
  applications_by_status: {
    applied: 2,
    under_review: 0,
    shortlisted: 3,
    interview_scheduled: 0,
    selected: 1,
    rejected: 2,
    withdrawn: 2,
  },
  status_distribution: [
    { status: "applied", label: "Submitted", count: 2, percentage: 20.0 },
    { status: "under_review", label: "Under Review", count: 0, percentage: 0.0 },
    { status: "shortlisted", label: "Shortlisted", count: 3, percentage: 30.0 },
    { status: "interview_scheduled", label: "Interview", count: 0, percentage: 0.0 },
    { status: "selected", label: "Selected", count: 1, percentage: 10.0 },
    { status: "rejected", label: "Rejected", count: 2, percentage: 20.0 },
    { status: "withdrawn", label: "Withdrawn", count: 2, percentage: 20.0 },
  ],
  trend: [
    { period: "2026-10-01", label: "Oct 01", count: 4 },
    { period: "2026-10-08", label: "Oct 08", count: 6 },
  ],
  weekly_activity: [
    { week_start: "2026-10-05", week_end: "2026-10-11", label: "Oct 05 – Oct 11", count: 4 },
    { week_start: "2026-10-12", week_end: "2026-10-18", label: "Oct 12 – Oct 18", count: 6 },
  ],
  shortlist_rate: {
    numerator: 3,
    denominator: 8,
    percentage: 37.5,
  },
  offer_rate: {
    numerator: 1,
    denominator: 8,
    percentage: 12.5,
  },
};

describe("ApplicationInsightsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders analytics metrics and charts correctly on load", async () => {
    vi.mocked(analyticsService.applications).mockResolvedValue(mockAnalyticsData);

    render(<ApplicationInsightsPage />);

    expect(screen.getByText("Application Insights")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1); // total applications
      expect(screen.getByText("37.5%")).toBeInTheDocument(); // shortlist rate
      expect(screen.getByText("12.5%")).toBeInTheDocument(); // offer rate
    });

    expect(screen.getByText("Application Trend")).toBeInTheDocument();
    expect(screen.getByText("Status Distribution")).toBeInTheDocument();
    expect(screen.getByText("Weekly Activity")).toBeInTheDocument();
  });

  it("handles error state and provides retry action", async () => {
    vi.mocked(analyticsService.applications).mockRejectedValue(new Error("Network failed"));

    render(<ApplicationInsightsPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });
});
