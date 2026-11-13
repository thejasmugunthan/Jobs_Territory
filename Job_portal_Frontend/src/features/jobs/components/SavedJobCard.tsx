import { useState } from "react";
import { ArrowUpRight, BookmarkX, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../services/api";
import type { SavedJob } from "../services/saved-jobs.service";
import { savedJobsService } from "../services/saved-jobs.service";
import { JobCompanyInfo } from "./JobCompanyInfo";
import { JobMetadata } from "./JobMetadata";
import { JobSalary } from "./JobSalary";
import { JobSkills } from "./JobSkills";
export function SavedJobCard({savedJob,onRemoved}:{savedJob:SavedJob;onRemoved:()=>void}){const [removing,setRemoving]=useState(false);const remove=async()=>{if(!window.confirm("Remove this job from your saved list?"))return;setRemoving(true);try{await savedJobsService.remove(savedJob.job_id);window.dispatchEvent(new CustomEvent("jobs-saved-state-changed",{detail:{jobId:savedJob.job_id,saved:false}}));toast.success("Removed from saved jobs");onRemoved();}catch(cause){toast.error(getApiErrorMessage(cause,"Could not remove this saved job."));}finally{setRemoving(false);}};const job=savedJob.job;
 return <article className={`saved-job-card ${!savedJob.is_available?"saved-job-unavailable":""}`}><header><div>{job?<JobCompanyInfo company={job.company}/>:<div className="saved-job-unavailable-label">Job no longer available</div>}<button className="saved-job-remove" disabled={removing} aria-label={`Remove saved job ${job?.title??"unavailable job"}`} onClick={remove}><BookmarkX size={15}/></button></div></header>{job?<><h3>{job.title}</h3><JobMetadata job={job}/><JobSalary salary={job.salary}/><JobSkills skills={job.skills}/><p className="saved-job-date"><CalendarDays size={13}/>Saved {new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(savedJob.saved_at))}</p><Link className="button button-primary" to={`/jobs/${job.id}`}>View details <ArrowUpRight size={14}/></Link></>:<><h3>This job is unavailable</h3><p className="application-muted">The employer is no longer accepting applications for this listing.</p><p className="saved-job-date"><CalendarDays size={13}/>Saved {new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(savedJob.saved_at))}</p></>}</article>;
}
