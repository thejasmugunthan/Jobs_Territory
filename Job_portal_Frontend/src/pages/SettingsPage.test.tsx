import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SettingsPage from "./SettingsPage";
import { ThemeProvider } from "../context/ThemeContext";
import { api } from "../services/api";

vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { full_name: "Thejas Developer", email: "thejas@example.com" },
    logout: vi.fn(),
  }),
}));

vi.mock("../services/api", () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
  getApiErrorMessage: (e: any) => e?.message || "Error",
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/preferences")) {
        return Promise.resolve({ data: { theme_preference: "system", email_job_alerts: true } } as any);
      }
      if (url.includes("/visibility")) {
        return Promise.resolve({
          data: {
            recruiter_visible: true,
            contact_visible: false,
            resume_visible: false,
          },
        } as any);
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("renders all required settings sections", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <SettingsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Account Settings")).toBeInTheDocument();
    expect(screen.getByText("Account Information")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Notifications & Alerts")).toBeInTheDocument();
    expect(screen.getByText("Profile Visibility")).toBeInTheDocument();
    expect(screen.getByText("Security & Password")).toBeInTheDocument();
    expect(screen.getByText("Account Management")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Thejas Developer")).toBeInTheDocument();
      expect(screen.getByText("thejas@example.com")).toBeInTheDocument();
      expect(screen.getByText("Visible to verified recruiters")).toBeInTheDocument();
    });
  });

  it("updates visibility settings when toggle is clicked", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} } as any);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ThemeProvider>
          <SettingsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Toggle visible to recruiters/i)).toBeInTheDocument();
    });

    const toggle = screen.getByLabelText(/Toggle visible to recruiters/i);
    expect(toggle).toBeChecked();

    await user.click(toggle);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/api/v1/profile/visibility",
        { recruiter_visible: false }
      );
    });
  });
});

