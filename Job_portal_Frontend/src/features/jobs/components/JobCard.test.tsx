import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { JobCard } from "./JobCard";
import type { JobListItem } from "../types/job.types";

vi.mock("../hooks/useSaveJob", () => ({ useSaveJob: () => ({ saved: false, loading: false, mutating: false, error: "", toggle: vi.fn() }) }));

const job: JobListItem = {
  id: "b54c5fee-7f0b-44af-8500-02f572d8c923", title: "Product Designer",
  company: { id: "2cb65355-23a1-438c-9164-140edc7dfe8b", name: "Acme Studio", logo_url: null },
  description_summary: "Shape practical product experiences.", location: { name: null, city: "Bengaluru", state: "Karnataka", country: "India" },
  employment_type: "full_time", work_mode: "hybrid", experience: { minimum: 2, maximum: 5 },
  salary: { minimum: 800000, maximum: 1200000, currency: "INR" }, skills: ["Figma", "Research"], openings: 2,
  posted_at: "2026-11-12T10:00:00Z", application_deadline: null, status: "published",
};

describe("JobCard", () => {
  it("renders backend job data and links to real details", () => {
    render(<MemoryRouter><JobCard job={job}/></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Product Designer" })).toBeInTheDocument();
    expect(screen.getByText("Acme Studio")).toBeInTheDocument();
    expect(screen.getByText(/Bengaluru/)).toBeInTheDocument();
    expect(screen.getByText("Figma")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View details/ })).toHaveAttribute("href", `/jobs/${job.id}`);
    expect(screen.getByRole("button", { name: /Save Product Designer/ })).toBeEnabled();
  });

  it("uses a company fallback when no logo is provided and explains missing pay", () => {
    render(<MemoryRouter><JobCard job={{ ...job, salary: { minimum: null, maximum: null, currency: null } }}/></MemoryRouter>);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Salary not disclosed")).toBeInTheDocument();
  });
});
