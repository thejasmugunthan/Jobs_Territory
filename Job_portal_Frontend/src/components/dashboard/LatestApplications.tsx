import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, SectionHeading } from "../common/Card";
import { EmptyState } from "../common/EmptyState";

export function LatestApplications() {
  return <Card className="latest-card">
    <SectionHeading title="Latest application status" action={<Link className="subtle-action" to="/applications">View all <ArrowUpRight size={14} /></Link>} />
    <div className="table-scroll"><table className="application-table"><thead><tr><th>Company</th><th>Position</th><th>Status</th><th>Applied on</th><th aria-label="Actions" /></tr></thead></table></div>
    <EmptyState icon={<BriefcaseBusiness size={20} />} title="No applications to track yet" description="Application updates will appear here when you connect an application source." action={<Link to="/jobs" className="inline-action">Explore job listings <ArrowUpRight size={14} /></Link>} />
  </Card>;
}
