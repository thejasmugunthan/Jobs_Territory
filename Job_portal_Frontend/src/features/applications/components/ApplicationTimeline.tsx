import { Check, Circle, X } from "lucide-react";
import type { ApplicationHistoryEntry, ApplicationStatus } from "../types/application.types";
const stages: ApplicationStatus[]=["applied","under_review","shortlisted","interview_scheduled","selected"];
const title:Record<ApplicationStatus,string>={applied:"Application submitted",under_review:"Under review",shortlisted:"Shortlisted",interview_scheduled:"Interview scheduled",selected:"Selected",rejected:"Not selected",withdrawn:"Withdrawn"};
export function ApplicationTimeline({history,currentStatus}: {history:ApplicationHistoryEntry[];currentStatus:ApplicationStatus}) {
 const final=currentStatus==="rejected"||currentStatus==="withdrawn";const currentIndex=stages.indexOf(currentStatus);const visible=final?[...history]:history;
 if(!visible.length)return <p className="timeline-empty">No status history is available yet.</p>;
 return <ol className="application-status-timeline">{visible.map((event,index)=>{const isCurrent=index===visible.length-1;const rejected=event.new_status==="rejected"||event.new_status==="withdrawn";const completed=!rejected&&(final||stages.indexOf(event.new_status)<currentIndex||isCurrent);return <li key={`${event.changed_at}-${index}`} className={`${isCurrent?"timeline-current":""} ${completed?"timeline-complete":""} ${rejected?"timeline-outcome": ""}`}><span className="timeline-marker">{rejected?<X size={13}/>:completed?<Check size={13}/>:<Circle size={9}/>}</span><div className="timeline-content"><strong>{title[event.new_status]}</strong>{event.description&&<p>{event.description}</p>}<time dateTime={event.changed_at}>{new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.changed_at))}</time></div></li>;})}</ol>;
}
