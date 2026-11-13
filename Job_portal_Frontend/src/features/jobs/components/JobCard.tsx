import { useEffect, useState } from "react";
import { ArrowUpRight, Columns3, Check } from "lucide-react";
import { Link } from "react-router-dom";
import type { JobListItem } from "../types/job.types";
import { JobCompanyInfo } from "./JobCompanyInfo";
import { JobMetadata } from "./JobMetadata";
import { JobSalary } from "./JobSalary";
import { JobSkills } from "./JobSkills";
import { SaveJobButton } from "./SaveJobButton";
import {
  addJobToComparison,
  isJobCompared,
  removeJobFromComparison,
} from "../utils/comparison";

export function JobCard({ job }: { job: JobListItem }) {
  const [compared, setCompared] = useState(false);

  useEffect(() => {
    setCompared(isJobCompared(job.id));
    const handleUpdate = () => {
      setCompared(isJobCompared(job.id));
    };
    window.addEventListener("jobs-comparison-updated", handleUpdate);
    return () => window.removeEventListener("jobs-comparison-updated", handleUpdate);
  }, [job.id]);

  const handleToggleCompare = () => {
    if (compared) {
      removeJobFromComparison(job.id);
    } else {
      addJobToComparison(job.id, job.title);
    }
  };

  return (
    <article className="job-result-card">
      <div className="job-result-header">
        <JobCompanyInfo company={job.company} />
        <span className="job-openings">
          {job.openings} {job.openings === 1 ? "opening" : "openings"}
        </span>
      </div>
      <h3>
        <Link to={`/jobs/${job.id}`}>{job.title}</Link>
      </h3>
      <JobMetadata job={job} />
      <p className="job-result-summary">
        {job.description_summary || "A description summary has not been provided."}
      </p>
      <JobSalary salary={job.salary} />
      <JobSkills skills={job.skills} />
      <footer className="job-result-actions">
        <Link className="button button-primary" to={`/jobs/${job.id}`}>
          View details <ArrowUpRight size={15} />
        </Link>
        <button
          type="button"
          onClick={handleToggleCompare}
          className={`button ${compared ? "button-secondary font-semibold text-purple-700 dark:text-purple-300" : "button-outline"}`}
          title={compared ? "Remove from comparison" : "Add to comparison (up to 4 jobs)"}
          aria-label={compared ? `Remove ${job.title} from comparison` : `Compare ${job.title}`}
        >
          {compared ? <Check size={14} /> : <Columns3 size={14} />}
          <span>{compared ? "Comparing" : "Compare"}</span>
        </button>
        <SaveJobButton title={job.title} jobId={job.id} />
      </footer>
    </article>
  );
}
