import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApplicationTrackerModal } from "./ApplicationTrackerModal";

describe("ApplicationTrackerModal", () => {
  it("renders only the timeline events supplied by the application API", () => {
    const onClose = vi.fn();
    render(<ApplicationTrackerModal company="Northstar" position="Product Designer" events={[{ stage: "applied", date: "2026-05-20" }, { stage: "interview", date: "2026-05-26" }]} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Application journey" })).toBeInTheDocument();
    expect(screen.getByText("Product Designer")).toBeInTheDocument();
    expect(screen.getAllByText("Latest update")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
