import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileCompletionProgress } from "./ProfileCompletionProgress";

describe("ProfileCompletionProgress", () => {
  it("uses the backend completion score and section results", () => {
    render(<ProfileCompletionProgress completion={{ completion_percentage: 45, completed_sections: ["education"], incomplete_sections: ["skills"], section_scores: { education: 15, skills: 5 } }} />);
    expect(screen.getByText("45%")).toBeTruthy();
    expect(screen.getByText(/Education · 15 pts/)).toBeTruthy();
    expect(screen.getByText(/Skills · 5 pts/)).toBeTruthy();
  });
});
