import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../../services/api", () => ({ api: { get }, getApiErrorMessage: () => "Request failed" }));
vi.mock("../../auth/hooks/useAuth", () => ({ useAuth: () => ({ user: { full_name: "Taylor Candidate" } }) }));

describe("DashboardPage", () => {
  beforeEach(() => get.mockReset());
  it("renders real dashboard counts and recommendation results", async () => {
    get.mockResolvedValue({ data: {
      application_counts: { total: 4, shortlisted: 1, pending: 2 }, saved_jobs_count: 3,
      profile_completion: { completion_percentage: 70, incomplete_sections: [] },
      recommended_jobs: [{ job_id: "job-1", title: "Python Engineer", company: "Northstar", recommendation_score: 82, location: "Remote" }],
      recent_applications: [], recent_activity: [],
    } });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(await screen.findByText("Python Engineer")).toBeInTheDocument();
    expect(screen.getByText("Welcome back, Taylor.")).toBeInTheDocument();
    expect(screen.getByText("82% relevant")).toBeInTheDocument();
  });
});
