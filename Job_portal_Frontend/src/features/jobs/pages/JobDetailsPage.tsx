import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Building2, CheckCircle2, Columns3, Check } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/common/EmptyState";
import { useJobDetails } from "../hooks/useJobDetails";
import { JobCompanyInfo } from "../components/JobCompanyInfo";
import { JobMetadata } from "../components/JobMetadata";
import { JobSalary } from "../components/JobSalary";
import { JobSkills } from "../components/JobSkills";
import { SaveJobButton } from "../components/SaveJobButton";
import { ApplyNowButton } from "../../applications/components/ApplyNowButton";
import { addJobToComparison, isJobCompared, removeJobFromComparison } from "../utils/comparison";
import { SimilarJobs } from "../components/SimilarJobs";
import { JobShareActions } from "../components/JobShareActions";

function DetailSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <section className="job-detail-section"><h2>{title}</h2><ul>{items.map((item,index)=><li key={`${index}-${item}`}><CheckCircle2 size={15}/><span>{item}</span></li>)}</ul></section>;
}

export default function JobDetailsPage() {
  const { jobId } = useParams();
  const { job, loading, error, notFound, retry } = useJobDetails(jobId);
  const [compared, setCompared] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setCompared(isJobCompared(jobId));
    const handleUpdate = () => {
      setCompared(isJobCompared(jobId));
    };
    window.addEventListener("jobs-comparison-updated", handleUpdate);
    return () => window.removeEventListener("jobs-comparison-updated", handleUpdate);
  }, [jobId]);

  const toggleCompare = () => {
    if (!job) return;
    if (compared) {
      removeJobFromComparison(job.id);
    } else {
      addJobToComparison(job.id, job.title);
    }
  };

  if (loading) return <div className="content-stack job-detail-loading"><Link to="/jobs" className="job-back-link"><ArrowLeft size={16}/> Back to jobs</Link><div className="job-detail-skeleton"/><div className="job-detail-skeleton job-detail-skeleton-body"/></div>;
  if (!job) return <div className="content-stack"><Link to="/jobs" className="job-back-link"><ArrowLeft size={16}/> Back to jobs</Link><EmptyState icon={<Building2 size={22}/>} title={notFound?"Job not found":"Job details unavailable"} description={error} action={notFound?<Link to="/jobs" className="button button-primary">Browse jobs</Link>:<button className="button button-primary" onClick={retry}>Try again</button>}/></div>;
  return <div className="content-stack job-detail-page"><Link to="/jobs" className="job-back-link"><ArrowLeft size={16}/> Back to job search</Link><div className="job-detail-layout"><main className="job-detail-main"><section className="job-detail-hero"><div className="job-detail-company-row"><JobCompanyInfo company={job.company}/><span className="job-detail-posted">{job.openings} {job.openings===1?"opening":"openings"}</span></div><h2>{job.title}</h2><JobMetadata job={job}/><JobSalary salary={job.salary}/><div className="job-detail-actions"><ApplyNowButton jobId={job.id}/><SaveJobButton title={job.title} jobId={job.id}/></div><JobShareActions job={job}/></section>
  <section className="job-detail-section"><h2>About this role</h2><p className="job-detail-description">{job.description}</p><div className="flex flex-wrap items-center gap-3 mt-4"><Link className="button button-outline" to={`/jobs/${job.id}/match`}>View compatibility estimate</Link><button type="button" className={`button ${compared ? "button-secondary font-semibold text-purple-700 dark:text-purple-300" : "button-outline"}`} onClick={toggleCompare}>{compared ? <Check size={15}/> : <Columns3 size={15}/>} {compared ? "Comparing" : "Compare job"}</button><Link className="text-link text-xs font-semibold" to="/compare-jobs">Open comparison view →</Link></div></section><DetailSection title="Responsibilities" items={job.responsibilities}/><DetailSection title="Required qualifications" items={job.required_qualifications}/><DetailSection title="Preferred qualifications" items={job.preferred_qualifications}/><DetailSection title="Benefits" items={job.benefits}/><section className="job-detail-section"><h2>Skills</h2><JobSkills skills={job.skills} limit={30}/></section></main>
 <aside className="job-detail-aside"><section className="company-profile-card"><span className="eyebrow">ABOUT THE COMPANY</span><JobCompanyInfo company={job.company}/>{job.company.description&&<p>{job.company.description}</p>}{job.company.website_url&&<a href={job.company.website_url} target="_blank" rel="noreferrer">Visit company website <ArrowUpRight size={13}/></a>}</section><section className="company-profile-card"><span className="eyebrow">JOB SNAPSHOT</span><dl><div><dt>Employment</dt><dd>{job.employment_type.replace(/_/g," ")}</dd></div><div><dt>Work mode</dt><dd>{job.work_mode?.replace(/_/g," ")??"Not specified"}</dd></div><div><dt>Openings</dt><dd>{job.openings}</dd></div><div><dt>Apply by</dt><dd>{job.application_deadline?new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(job.application_deadline)):"Not specified"}</dd></div></dl></section><SimilarJobs jobId={job.id}/></aside></div></div>;
}
