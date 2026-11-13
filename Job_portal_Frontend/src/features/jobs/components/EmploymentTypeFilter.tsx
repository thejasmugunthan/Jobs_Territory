import type { EmploymentType } from "../types/job.types";
const options: { value: EmploymentType; label: string }[] = [{ value: "full_time", label: "Full-time" }, { value: "part_time", label: "Part-time" }, { value: "internship", label: "Internship" }, { value: "contract", label: "Contract" }, { value: "freelance", label: "Freelance" }];
export function EmploymentTypeFilter({ params, onChange }: { params: URLSearchParams; onChange: (key: string, values: string[]) => void }) {
  const selected = params.getAll("employment_type");
  return <fieldset className="job-filter-section job-check-filter"><legend>Employment type</legend>{options.map(({ value, label }) => <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={(event) => onChange("employment_type", event.target.checked ? [...selected, value] : selected.filter((item) => item !== value))} /><span>{label}</span></label>)}</fieldset>;
}
