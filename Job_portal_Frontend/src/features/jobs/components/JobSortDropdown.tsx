import { ArrowDownWideNarrow } from "lucide-react";
import type { JobSort } from "../types/job.types";

const options: Array<[JobSort, string]> = [["latest", "Newest first"], ["oldest", "Oldest first"], ["salary_high", "Salary: high to low"], ["salary_low", "Salary: low to high"], ["experience_low", "Least experience"]];
export function JobSortDropdown({ value, onChange }: { value: JobSort; onChange: (value: JobSort) => void }) {
  return <label className="job-sort"><ArrowDownWideNarrow size={15} /><span>Sort</span><select aria-label="Sort jobs" value={value} onChange={(event) => onChange(event.target.value as JobSort)}>{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;
}
