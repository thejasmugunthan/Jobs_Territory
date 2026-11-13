import { useEffect, useMemo } from "react";
import { BriefcaseBusiness, RotateCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/common/EmptyState";
import { useJobs } from "../hooks/useJobs";
import { searchParamsToInput } from "../schemas/job-search.schema";
import { JobCard } from "../components/JobCard";
import { JobFilterSidebar } from "../components/JobFilterSidebar";
import { JobPagination } from "../components/JobPagination";
import { JobSearchBar } from "../components/JobSearchBar";
import { JobSortDropdown } from "../components/JobSortDropdown";
import { RecentlyViewedJobs } from "../components/RecentlyViewedJobs";

export default function FindJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const key = searchParams.toString();
  const params = useMemo(() => new URLSearchParams(key), [key]);
  const result = useJobs(params);
  const parsed = searchParamsToInput(params);
  const filters = parsed.success ? parsed.data : null;
  useEffect(() => {
    if (params.has("search") && !params.has("q")) {
      const next = new URLSearchParams(params); next.set("q", next.get("search") ?? ""); next.delete("search"); setSearchParams(next, { replace: true });
    }
  }, [params, setSearchParams]);
  const update = (mutate: (next: URLSearchParams) => void, resetPage = true) => {
    const next = new URLSearchParams(params); mutate(next); if (resetPage) next.delete("page"); setSearchParams(next);
  };
  const onChange = (name: string, values: string[]) => update((next) => { next.delete(name); values.forEach((value) => next.append(name, value)); });
  const onPatch = (values: Record<string, string | undefined>) => update((next) => Object.entries(values).forEach(([name, value]) => value === undefined || value === "" ? next.delete(name) : next.set(name, value)));
  const clear = () => update((next) => { const q = next.get("q"); [...new Set(next.keys())].forEach((name) => next.delete(name)); if (q) next.set("q", q); });
  const active = [...params.entries()].filter(([name]) => !["page", "page_size", "sort_by", "skills_match"].includes(name));
  return <div className="content-stack find-jobs-page">
    <div className="page-intro"><span className="eyebrow">YOUR NEXT MOVE STARTS HERE</span><h2>Find your next opportunity</h2><p>Search real openings and narrow the results to what matters to you.</p></div>
    <JobSearchBar query={params.get("q") ?? ""} location={params.getAll("location").join(", ")} loading={result.loading} onSearch={(q,location)=>update((next)=>{q?next.set("q",q):next.delete("q");next.delete("location");location.split(",").map((part)=>part.trim()).filter(Boolean).forEach((part)=>next.append("location",part));})}/>
    <div className="find-jobs-layout"><JobFilterSidebar params={params} onChange={onChange} onPatch={onPatch} onClear={clear}/><section className="job-results" aria-label="Job search results">
      <header className="job-results-heading"><div><span className="eyebrow">OPPORTUNITIES</span><h2>{result.loading ? "Finding jobs…" : `${result.data?.pagination.total_items ?? 0} jobs found`}</h2><p>{filters?.q ? <>Results for <strong>“{filters.q}”</strong></> : "Browse current openings from employers."}</p></div>{filters && <JobSortDropdown value={filters.sort_by} onChange={(value) => onPatch({ sort_by: value })}/>}</header>
      {active.length > 0 && <div className="active-job-filters"><span>Active filters</span>{active.map(([name,value],index)=><button key={`${name}-${value}-${index}`} onClick={()=>update((next)=>{const values=next.getAll(name).filter((item)=>item!==value);next.delete(name);values.forEach((item)=>next.append(name,item));})}>{name.replace(/_/g," ")}: {value}<span aria-hidden="true">×</span></button>)}<button className="clear-job-filters" onClick={clear}>Clear all</button></div>}
      {result.validationError ? <div className="job-results-message"><EmptyState icon={<BriefcaseBusiness size={21}/>} title="Check your search filters" description={result.validationError}/></div> : result.loading ? <div className="job-results-list" aria-label="Loading job results">{Array.from({length:4},(_,i)=><div className="job-result-skeleton" key={i}><i/><i/><i/><i/></div>)}</div> : result.error ? <div className="job-results-message"><EmptyState icon={<RotateCw size={21}/>} title={result.unauthorized?"Sign in to browse jobs":"We couldn’t load jobs"} description={result.unauthorized?"Your session may have expired. Sign in again to continue your search.":result.error} action={result.unauthorized?<Link className="button button-primary" to="/login">Sign in</Link>:<button className="button button-primary" onClick={result.retry}>Try again</button>}/></div> : result.data?.items.length ? <><div className="job-results-list">{result.data.items.map((job)=><JobCard key={job.id} job={job}/>)}</div><JobPagination pagination={result.data.pagination} onPage={(page)=>update((next)=>next.set("page",String(page)),false)}/></> : <div className="job-results-message"><EmptyState icon={<BriefcaseBusiness size={21}/>} title="No jobs match these filters" description="Try broadening your search or clearing a few filters to see more opportunities." action={<button className="button button-secondary" onClick={clear}>Clear filters</button>}/></div>}
    </section></div>
    <RecentlyViewedJobs/>
  </div>;
}
