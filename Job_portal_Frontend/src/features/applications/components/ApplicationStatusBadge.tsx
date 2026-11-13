import type { ApplicationStatus } from "../types/application.types";
const labels: Record<ApplicationStatus,string>={applied:"Applied",under_review:"Under review",shortlisted:"Shortlisted",interview_scheduled:"Interview scheduled",selected:"Selected",rejected:"Rejected",withdrawn:"Withdrawn"};
export function ApplicationStatusBadge({status}: {status:ApplicationStatus}) { return <span className={`application-status application-status-${status}`} aria-label={`Status: ${labels[status]}`}>{labels[status]}</span>; }
