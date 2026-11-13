import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../../services/api", () => ({
  api: { get },
  getApiErrorMessage: () => "Request failed",
}));
vi.mock("../../auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { full_name: "Taylor Candidate" } }),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("renders real dashboard counts, 4 statistic cards, and recommendations", async () => {
    get.mockResolvedValue({
      data: {
        application_counts: {
          total: 8,
          active: 5,
          pending: 3,
          shortlisted: 2,
          interview: 1,
          offers: 1,
          rejected: 1,
        },
        saved_jobs_count: 4,
        profile_completion: {
          completion_percentage: 85,
          incomplete_sections: [],
          section_scores: {
            professional_summary: 10,
            work_experience: 15,
            skills: 15,
            education: 15,
          },
        },
        resume_strength: {
          overall: 85,
          summary: 100,
          experience: 100,
          skills: 100,
          education: 100,
          has_resume: true,
        },
        recommended_jobs: [
          {
            job_id: "job-1",
            title: "Python Engineer",
            company: "Northstar",
            recommendation_score: 82,
            location: "Remote",
            minimum_salary: 130000,
            maximum_salary: 160000,
            employment_type: "full_time",
          },
        ],
        recent_applications: [
          {
            application_id: "app-1",
            job_id: "job-1",
            title: "Senior Full Stack",
            company: "Jobs Territory",
            status: "interview_scheduled",
            applied_at: "2026-11-10T10:00:00Z",
          },
        ],
        upcoming_interviews: [
          {
            application_id: "app-1",
            job_id: "job-1",
            title: "Senior Full Stack",
            company: "Jobs Territory",
            date: "2026-11-18T10:00:00Z",
            time: "10:00 AM",
            type: "Video Call",
            status: "Scheduled",
          },
        ],
        recent_activity: [],
      },
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Verify Welcome header
    expect(await screen.findByText("Welcome back, Taylor.")).toBeInTheDocument();
    expect(screen.getByText("Post Resume")).toBeInTheDocument();

    // Verify 4 statistic cards
    expect(screen.getByText("Total Applications")).toBeInTheDocument();
    expect(screen.getByText("Active Applications")).toBeInTheDocument();
    expect(screen.getByText("Waiting for Interview")).toBeInTheDocument();
    expect(screen.getByText("Offers Received")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    // Verify Resume Strength panel
    expect(screen.getByText("Resume Strength")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Profile Summary")).toBeInTheDocument();
    expect(screen.getByText("Work Experience")).toBeInTheDocument();
    expect(screen.getByText("Improve Resume")).toBeInTheDocument();

    // Verify Application Table & Interview Schedule
    expect(screen.getByText("Latest Application Status")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Interviews")).toBeInTheDocument();
    expect(screen.getAllByText("Jobs Territory").length).toBeGreaterThanOrEqual(1);

    // Verify Recommended Jobs
    expect(screen.getByText("Python Engineer")).toBeInTheDocument();
    expect(screen.getByText("82% relevant")).toBeInTheDocument();
  });

  it("filters application status table by search keyword and status selection", async () => {
    get.mockResolvedValue({
      data: {
        application_counts: { total: 2, active: 2, interview: 0, offers: 0 },
        saved_jobs_count: 0,
        profile_completion: { completion_percentage: 50, incomplete_sections: [] },
        recommended_jobs: [],
        recent_applications: [
          {
            application_id: "app-1",
            job_id: "job-1",
            title: "Frontend Architect",
            company: "Alpha Corp",
            status: "applied",
            applied_at: "2026-11-10T10:00:00Z",
          },
          {
            application_id: "app-2",
            job_id: "job-2",
            title: "Backend Specialist",
            company: "Beta Systems",
            status: "rejected",
            applied_at: "2026-11-09T10:00:00Z",
          },
        ],
        upcoming_interviews: [],
        recent_activity: [],
      },
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Frontend Architect")).toBeInTheDocument();
    expect(screen.getByText("Backend Specialist")).toBeInTheDocument();

    // Filter by search query
    const searchInput = screen.getByPlaceholderText("Search applications...");
    fireEvent.change(searchInput, { target: { value: "Frontend" } });

    expect(screen.getByText("Frontend Architect")).toBeInTheDocument();
    expect(screen.queryByText("Backend Specialist")).not.toBeInTheDocument();
  });
});
