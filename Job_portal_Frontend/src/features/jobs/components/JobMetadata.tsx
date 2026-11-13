import { BriefcaseBusiness, CalendarDays, MapPin } from "lucide-react";
import type { JobListItem } from "../types/job.types";
import { formatEmployment, formatExperience, formatLocation, formatPostedDate, formatWorkMode } from "./job-format";

export function JobMetadata({ job, compact = false }: { job: JobListItem; compact?: boolean }) {
  return <div className={`job-metadata ${compact ? "job-metadata-compact" : ""}`}>
    <span><MapPin size={14} />{formatLocation(job)}</span>
    <span><BriefcaseBusiness size={14} />{formatEmployment(job.employment_type)}</span>
    <span>{formatWorkMode(job.work_mode)}</span>
    <span>{formatExperience(job.experience.minimum, job.experience.maximum)}</span>
    <span><CalendarDays size={14} />{formatPostedDate(job.posted_at)}</span>
  </div>;
}
