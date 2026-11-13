import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { fakeWorkspace, getProfile, completion } = vi.hoisted(() => ({ fakeWorkspace: vi.fn(), getProfile: vi.fn(), completion: vi.fn() }));
vi.mock("../components/ProfileWorkspace", async (loadOriginal) => {
  const original = await loadOriginal<typeof import("../components/ProfileWorkspace")>();
  return { ...original, default: fakeWorkspace };
});
vi.mock("../services/profile.service", () => ({ profileService: { get: getProfile, completion } }));

import OnboardingPage from "./OnboardingPage";
import { profileSteps } from "../components/ProfileWorkspace";

describe("candidate onboarding", () => {
  afterEach(() => { cleanup(); window.localStorage.clear(); vi.clearAllMocks(); });

  it("saves the personal step before continuing and allows returning to a visited step", async () => {
    getProfile.mockResolvedValue({ profile_initialized: true });
    completion.mockResolvedValue({ completion_percentage: 25, completed_sections: ["basic_profile"], incomplete_sections: [], section_scores: {} });
    fakeWorkspace.mockImplementation(({ activeStep, onStepSaved }: { activeStep: string; onStepSaved: (id: string) => void }) => <div><span>{activeStep}</span><button onClick={() => onStepSaved("personal")}>Save section</button></div>);
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    expect(screen.getByText("personal")).toBeTruthy();
    fireEvent.click(screen.getByText("Save section"));
    fireEvent.click(screen.getByText("Save & continue"));
    await waitFor(() => expect(screen.getByText("education")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Personal information/ }));
    expect(screen.getByText("personal")).toBeTruthy();
    expect(profileSteps).toHaveLength(7);
  });
});
