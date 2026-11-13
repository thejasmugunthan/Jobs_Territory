import { Bookmark, BriefcaseBusiness, MapPin } from "lucide-react";
import type { ReactNode } from "react";

export interface JobSummary {
  id: string;
  company: string;
  title: string;
  location: string;
  employmentType: string;
  postedAt: string;
  brandTone?: "rose" | "amber" | "violet" | "mint";
  logo?: ReactNode;
}

export function JobCard({ job }: { job: JobSummary }) {
  return <article className={`job-card job-card-${job.brandTone ?? "violet"}`}>
    <div className="job-card-top"><span className="job-posted">{job.postedAt}</span><button className="icon-button job-save" disabled title="Saving jobs is not connected yet" aria-label={`Save ${job.title} at ${job.company}`}><Bookmark size={17} /></button></div>
    <div className="job-company-mark">{job.logo ?? <BriefcaseBusiness size={23} />}</div>
    <div className="job-type-row"><span><BriefcaseBusiness size={14} /> {job.employmentType}</span><button className="job-apply" disabled title="Job application API is not connected">Apply</button></div>
    <div className="job-card-info"><p className="job-company-name">{job.company}</p><h3>{job.title}</h3><p className="job-location"><MapPin size={14} /> {job.location}</p></div>
    <div className="job-card-footer"><span>Salary details unavailable</span><span className="salary-placeholder">—</span></div>
  </article>;
}
