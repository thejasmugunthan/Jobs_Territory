import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResumeUpload } from "./ResumeUpload";

describe("ResumeUpload", () => {
  it("validates the selected file locally without claiming it was uploaded", () => {
    render(<ResumeUpload />);
    const input = screen.getByLabelText("Choose a resume file") as HTMLInputElement;
    const file = new File(["resume"], "Jordan-Resume.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("Jordan-Resume.pdf")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("nothing has been uploaded");
  });
});
