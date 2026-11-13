import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { GlobalSearch } from "./GlobalSearch";
import { api } from "../../services/api";

vi.mock("../../services/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input with placeholder", () => {
    render(
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search jobs, skills, companies…/i);
    expect(input).toBeInTheDocument();
  });

  it("fetches suggestions on debounced input and displays matches", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        items: [
          { job_id: "j-1", title: "Software Engineer", company: "Google", location: "Bengaluru" },
        ],
        pagination: { total_items: 1 },
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search jobs, skills, companies…/i);
    await user.type(input, "Software");

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/search/jobs?q=Software"),
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("Google")).toBeInTheDocument();
    });
  });

  it("clears search input when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search jobs, skills, companies…/i) as HTMLInputElement;
    await user.type(input, "Design");

    const clearButton = screen.getByRole("button", { name: /Clear search/i });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);
    expect(input.value).toBe("");
  });
});

