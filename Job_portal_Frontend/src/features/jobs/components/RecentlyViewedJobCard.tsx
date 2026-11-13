import { X } from "lucide-react";
import { Link } from "react-router-dom";
import type { RecentlyViewedJob } from "../types/job.types";
import { JobCompanyInfo } from "./JobCompanyInfo";
import { formatLocation, formatPostedDate } from "./job-format";
export function RecentlyViewedJobCard({ job, onRemove, removing }: { job: RecentlyViewedJob; onRemove: (id: string) => void; removing: boolean }) {
 return <article className="recent-job-card"><div><JobCompanyInfo company={job.company}/><button disabled={removing} aria-label={`Remove ${job.title} from recently viewed`} onClick={()=>onRemove(job.id)}><X size={14}/></button></div><Link className="recent-job-title" to={`/jobs/${job.id}`}>{job.title}</Link><p>{formatLocation(job)}</p><small>Viewed {formatPostedDate(job.viewed_at)} · {job.view_count} {job.view_count===1?"view":"views"}</small></article>;
}
