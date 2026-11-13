import { useMemo } from "react";
import { BriefcaseBusiness, Filter, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../../../components/common/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { JobCard, type JobSummary } from "../../../components/jobs/JobCard";

export default function JobsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const jobs: JobSummary[] = [];
  const visibleJobs = useMemo(() => jobs.filter((job) => `${job.company} ${job.title} ${job.location}`.toLowerCase().includes(search.toLowerCase())), [search]);
  return <div className="content-stack jobs-page">
    <div className="page-intro"><span className="eyebrow">FIND YOUR FIT</span><h2>Recommended jobs <span className="count-pill">{jobs.length}</span></h2><p>Explore opportunities that could be a good next step for you.</p></div>
    <Card className="jobs-browser">
      <div className="jobs-toolbar"><label className="jobs-search"><Search size={17} /><input aria-label="Search job listings" placeholder="Search by role, company, or skill" value={search} onChange={(event) => setParams(event.target.value ? { search: event.target.value } : {})} /></label><button className="button button-outline" disabled title="Filters are available when job listings are connected"><Filter size={16} /> Filters <span className="filter-dot" /></button><button className="button button-outline sort-button" disabled><SlidersHorizontal size={16} /> Last updated</button></div>
      <div className="job-filters"><span><MapPin size={14} /> All locations</span><span><BriefcaseBusiness size={14} /> All employment types</span></div>
      {visibleJobs.length ? <div className="job-grid">{visibleJobs.map((job) => <JobCard key={job.id} job={job} />)}</div> : <EmptyState icon={<BriefcaseBusiness size={21} />} title={search ? "No connected listings match that search" : "Job listings aren’t connected yet"} description={search ? "There are no live job records to search right now. Try again after the job board is connected." : "The backend doesn’t currently expose a jobs feed, so we haven’t added sample vacancies."} />}
    </Card>
  </div>;
}
