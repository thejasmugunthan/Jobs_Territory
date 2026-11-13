import type { WorkMode } from "../types/job.types";
const options: { value: WorkMode; label: string }[] = [{ value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" }, { value: "on_site", label: "On-site" }];
export function WorkModeFilter({ params, onChange }: { params: URLSearchParams; onChange: (key: string, values: string[]) => void }) {
  const selected = params.getAll("work_mode");
  return <fieldset className="job-filter-section job-check-filter"><legend>Work mode</legend>{options.map(({ value, label }) => <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={(event) => onChange("work_mode", event.target.checked ? [...selected, value] : selected.filter((item) => item !== value))} /><span>{label}</span></label>)}</fieldset>;
}
