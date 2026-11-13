import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationTimeline } from "./ApplicationTimeline";

describe("ApplicationTimeline",()=>{
 it("renders only the history supplied by the API and highlights the current stage",()=>{
  render(<ApplicationTimeline currentStatus="under_review" history={[{previous_status:null,new_status:"applied",changed_at:"2026-11-12T10:00:00Z",description:"Application submitted"},{previous_status:"applied",new_status:"under_review",changed_at:"2026-11-13T10:00:00Z",description:null}]}/>);
  expect(screen.getAllByText("Application submitted")).toHaveLength(2);
  expect(screen.getByText("Under review")).toBeInTheDocument();
  expect(screen.queryByText("Shortlisted")).not.toBeInTheDocument();
 });
 it("handles empty status history",()=>{render(<ApplicationTimeline currentStatus="applied" history={[]}/>);expect(screen.getByText("No status history is available yet.")).toBeInTheDocument();});
});
