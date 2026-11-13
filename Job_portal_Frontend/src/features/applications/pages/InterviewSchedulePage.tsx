import { CalendarDays, Clock3 } from "lucide-react";
import { Card } from "../../../components/common/Card";
import { EmptyState } from "../../../components/common/EmptyState";

export default function InterviewSchedulePage() {
  return <div className="content-stack"><div className="page-intro"><span className="eyebrow">PLAN YOUR NEXT STEP</span><h2>Interview schedule</h2><p>Keep upcoming conversations and preparation notes in one place.</p></div><Card className="schedule-page-card"><EmptyState icon={<CalendarDays size={22} />} title="No upcoming interviews" description="Interview scheduling isn’t connected yet. Your calendar will stay clear until real interview details are available." action={<span className="empty-note"><Clock3 size={14} /> No events to display</span>} /></Card></div>;
}
