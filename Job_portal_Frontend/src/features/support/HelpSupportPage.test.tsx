import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import HelpSupportPage from "./HelpSupportPage";
import { api } from "../../services/api";

vi.mock("../../services/api", () => ({
  api: {
    post: vi.fn(),
  },
  getApiErrorMessage: (e: any) => e?.message || "Error",
}));

describe("HelpSupportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders help sections, search input, and FAQ articles", () => {
    render(
      <MemoryRouter>
        <HelpSupportPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Help & Support")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search help articles…/i)).toBeInTheDocument();
    expect(screen.getByText("Contact Support")).toBeInTheDocument();

    // Check presence of FAQ category filters
    expect(screen.getByText("All Topics")).toBeInTheDocument();
    expect(screen.getAllByText("Account Help").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Job Search")).toBeInTheDocument();
    expect(screen.getByText("Resume & Matching")).toBeInTheDocument();
    expect(screen.getByText("Applications & Insights")).toBeInTheDocument();
  });

  it("filters FAQs based on search input", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HelpSupportPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search help articles…/i);
    await user.type(searchInput, "password");

    expect(screen.getByText(/How do I sign in or recover my password?/i)).toBeInTheDocument();
  });

  it("submits support request form successfully", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: "req-123",
        subject: "Need profile help",
        category: "account",
        status: "received",
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HelpSupportPage />
      </MemoryRouter>
    );

    const subjectInput = screen.getByPlaceholderText(/Brief summary of your question/i);
    const descInput = screen.getByPlaceholderText(/Provide relevant details about your question/i);
    const submitBtn = screen.getByRole("button", { name: /Submit Support Request/i });

    await user.type(subjectInput, "Need profile help");
    await user.type(descInput, "I am unable to update my certification credential URL.");

    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/support/requests", {
        subject: "Need profile help",
        category: "account",
        description: "I am unable to update my certification credential URL.",
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Support request recorded successfully/i)).toBeInTheDocument();
    });
  });
});
