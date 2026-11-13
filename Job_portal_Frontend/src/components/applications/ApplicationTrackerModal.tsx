import { Check, Circle, Clock3 } from "lucide-react";
import { Modal } from "../common/Modal";

export type ApplicationStage = "resume_created" | "applied" | "under_review" | "interview" | "shortlisted" | "selected" | "rejected";
export interface ApplicationEvent { stage: ApplicationStage; date?: string; note?: string }
const stages: { id: ApplicationStage; label: string }[] = [
  { id: "resume_created", label: "Resume created" },
  { id: "applied", label: "Application submitted" },
  { id: "under_review", label: "Under review" },
  { id: "interview", label: "Interview" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "selected", label: "Selected" },
  { id: "rejected", label: "Not selected" },
];

export function ApplicationTrackerModal({ company, position, events, onClose }: { company: string; position: string; events: ApplicationEvent[]; onClose: () => void }) {
  const latestIndex = events.reduce((highest, event) => Math.max(highest, stages.findIndex((stage) => stage.id === event.stage)), -1);
  return <Modal title="Application journey" onClose={onClose}>
    <div className="tracker-summary"><span className="tracker-company-icon">{company.slice(0, 1).toUpperCase()}</span><div><strong>{position}</strong><p>{company}</p></div></div>
    {events.some((event) => event.stage === "rejected") ? <div className="tracker-outcome tracker-rejected">This application has been marked as not selected.</div> : null}
    <ol className="application-timeline">{stages.map((stage, index) => {
      const event = events.find((item) => item.stage === stage.id);
      const complete = index <= latestIndex;
      const current = index === latestIndex;
      return <li key={stage.id} className={`${complete ? "timeline-complete" : ""} ${current ? "timeline-current" : ""} ${stage.id === "rejected" && event ? "timeline-rejected" : ""}`}><span className="timeline-marker">{complete ? <Check size={13} /> : <Circle size={12} />}</span><div className="timeline-content"><div><strong>{stage.label}</strong>{current && <span className="timeline-now">Latest update</span>}</div>{event?.date && <time>{new Date(event.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time>}{event?.note && <p>{event.note}</p>}</div>{!complete && <Clock3 size={14} className="timeline-pending" />}</li>;
    })}</ol>
  </Modal>;
}
