import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotificationsPage from "./NotificationsPage";

const { get, patch, delete: del } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../../services/api", () => ({
  api: {
    get,
    patch,
    delete: del,
  },
  getApiErrorMessage: (_: unknown, fallback?: string) => fallback || "Request failed",
}));

const mockNotifications = [
  {
    id: "notif-1",
    type: "selected",
    title: "Congratulations! Offer Received",
    message: "Jobs Territory Labs extended an offer for Lead Frontend Architect.",
    job_id: "job-1",
    application_id: "app-1",
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "notif-2",
    type: "interview_scheduled",
    title: "Interview Scheduled",
    message: "Technical round scheduled with CloudScale Systems.",
    job_id: "job-2",
    application_id: "app-2",
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "notif-3",
    type: "alert_match",
    title: "3 New Jobs Match Your Alert",
    message: "New Python and React roles in Bengaluru were published today.",
    job_id: null,
    application_id: null,
    is_read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({
      data: {
        items: mockNotifications,
        total: mockNotifications.length,
      },
    });
  });

  it("renders notification items with categories and unread counters", async () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    // Check title and unread pill
    await waitFor(() => {
      expect(screen.getByText("Congratulations! Offer Received")).toBeInTheDocument();
    });

    expect(screen.getByText("2 unread")).toBeInTheDocument();
    expect(screen.getByText("Interview Scheduled")).toBeInTheDocument();
    expect(screen.getByText("3 New Jobs Match Your Alert")).toBeInTheDocument();
  });

  it("filters notifications when clicking tabs", async () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Congratulations! Offer Received")).toBeInTheDocument();
    });

    // Click Unread tab
    const unreadTab = screen.getByRole("button", { name: /unread/i });
    fireEvent.click(unreadTab);

    // notif-1 and notif-3 are unread; notif-2 is read
    expect(screen.getByText("Congratulations! Offer Received")).toBeInTheDocument();
    expect(screen.getByText("3 New Jobs Match Your Alert")).toBeInTheDocument();
    expect(screen.queryByText("Interview Scheduled")).not.toBeInTheDocument();

    // Click Job Alerts tab
    const alertsTab = screen.getByRole("button", { name: /job alerts/i });
    fireEvent.click(alertsTab);

    expect(screen.getByText("3 New Jobs Match Your Alert")).toBeInTheDocument();
    expect(screen.queryByText("Congratulations! Offer Received")).not.toBeInTheDocument();
  });

  it("marks a notification as read", async () => {
    patch.mockResolvedValueOnce({ data: { ...mockNotifications[0], is_read: true } });

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Congratulations! Offer Received")).toBeInTheDocument();
    });

    const markReadButtons = screen.getAllByRole("button", { name: /mark as read/i });
    fireEvent.click(markReadButtons[0]);

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/notifications/notif-1/read")
      );
    });
  });
});
