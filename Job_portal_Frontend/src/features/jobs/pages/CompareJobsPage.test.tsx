import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CompareJobsPage from "./CompareJobsPage";
import { jobsService } from "../services/jobs.service";
import type { JobDetails } from "../types/job.types";
import { COMPARISON_STORAGE_KEY } from "../utils/comparison";

vi.mock("../services/jobs.service", () => ({
  jobsService: {
    compare: vi.fn(),
  },
}));

const mockJobs: JobDetails[] = [
  {
    id: "job-1",
    title: "Senior Frontend Engineer",
    company: { id: "comp-1", name: "Google", logo_url: null, description: "Tech", website_url: "https://google.com" },
    description_summary: "Build React web applications.",
    description: "Full job description for Frontend Engineer role.",
    location: { name: "Bengaluru", city: "Bengaluru", state: "Karnataka", country: "India" },
    employment_type: "full_time",
    work_mode: "hybrid",
    experience: { minimum: 3, maximum: 6 },
    salary: { minimum: 1500000, maximum: 2500000, currency: "INR" },
    skills: ["React", "TypeScript", "Tailwind CSS"],
    responsibilities: ["Develop UI"],
    required_qualifications: ["3+ years React"],
    preferred_qualifications: ["Next.js"],
    benefits: ["Health insurance"],
    openings: 2,
    posted_at: "2026-11-10T12:00:00Z",
    application_deadline: null,
    status: "published",
  },
  {
    id: "job-2",
    title: "Backend Architect",
    company: { id: "comp-2", name: "Meta", logo_url: null, description: "Social", website_url: "https://meta.com" },
    description_summary: "Design scalable backend systems.",
    description: "Full job description for Backend Architect role.",
    location: { name: "Remote", city: "Remote", state: null, country: "India" },
    employment_type: "full_time",
    work_mode: "remote",
    experience: { minimum: 5, maximum: 10 },
    salary: { minimum: 2500000, maximum: 4000000, currency: "INR" },
    skills: ["Python", "FastAPI", "PostgreSQL"],
    responsibilities: ["Build microservices"],
    required_qualifications: ["5+ years Python"],
    preferred_qualifications: ["Distributed systems"],
    benefits: ["Stock options"],
    openings: 1,
    posted_at: "2026-11-11T12:00:00Z",
    application_deadline: null,
    status: "published",
  },
];

describe("CompareJobsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage?.clear();
  });

  it("renders empty state when no jobs are selected", async () => {
    render(
      <MemoryRouter>
        <CompareJobsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Compare Jobs")).toBeInTheDocument();
    expect(screen.getByText("0 of 4 Jobs Selected")).toBeInTheDocument();
    expect(screen.getByText("No jobs in your comparison")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse open jobs/i })).toBeInTheDocument();
  });

  it("renders side-by-side job comparison table when jobs are in session", async () => {
    window.sessionStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(["job-1", "job-2"]));
    vi.mocked(jobsService.compare).mockResolvedValue(mockJobs);

    render(
      <MemoryRouter>
        <CompareJobsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
      expect(screen.getByText("Backend Architect")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Google").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Meta").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2 of 4 Jobs Selected")).toBeInTheDocument();
    expect(screen.getByText("Required Skills")).toBeInTheDocument();
    expect(screen.getByText("React, TypeScript, Tailwind CSS")).toBeInTheDocument();
    expect(screen.getByText("Python, FastAPI, PostgreSQL")).toBeInTheDocument();
  });

  it("removes a job from comparison when remove button is clicked", async () => {
    window.sessionStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(["job-1", "job-2"]));
    vi.mocked(jobsService.compare).mockResolvedValue(mockJobs);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CompareJobsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole("button", {
      name: /Remove Senior Frontend Engineer from comparison/i,
    });
    await user.click(removeBtn);

    const stored = JSON.parse(window.sessionStorage.getItem(COMPARISON_STORAGE_KEY) || "[]");
    expect(stored).toEqual(["job-2"]);
  });
});
