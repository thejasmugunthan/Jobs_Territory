import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, SectionHeading } from "../common/Card";
import { EmptyState } from "../common/EmptyState";

export function ScheduleCard() {
  return <Card className="schedule-card">
    <SectionHeading title="Your schedule" action={<span className="card-icon-soft"><CalendarDays size={16} /></span>} />
    <EmptyState icon={<Clock3 size={20} />} title="No upcoming interviews" description="When you have an interview scheduled, it’ll appear here." />
    <Link className="card-footer-link" to="/interviews">View schedule <ArrowRight size={15} /></Link>
  </Card>;
}
