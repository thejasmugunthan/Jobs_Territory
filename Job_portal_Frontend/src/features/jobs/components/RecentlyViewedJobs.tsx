import { Clock3 } from "lucide-react";
import { useRecentlyViewedJobs } from "../hooks/useRecentlyViewedJobs";
import { RecentlyViewedJobCard } from "./RecentlyViewedJobCard";
export function RecentlyViewedJobs() {
 const {data,loading,error,removingId,remove}=useRecentlyViewedJobs();
 if (loading || !data?.items.length) return null;
 return <section className="recent-jobs"><div className="recent-jobs-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2><Clock3 size={18}/> Recently viewed</h2></div>{error&&<small>{error}</small>}</div><div className="recent-jobs-grid">{data.items.map(job=><RecentlyViewedJobCard key={job.id} job={job} onRemove={remove} removing={removingId===job.id}/>)}</div></section>;
}
