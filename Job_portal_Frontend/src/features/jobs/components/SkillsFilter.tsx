import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import type { SkillsMatch } from "../types/job.types";

export function SkillsFilter({ params, onChange, onPatch }: { params: URLSearchParams; onChange: (key: string, values: string[]) => void; onPatch: (values: Record<string, string | undefined>) => void }) {
  const [value, setValue] = useState(""); const selected = params.getAll("skills").flatMap((item) => item.split(",").map((part) => part.trim()).filter(Boolean));
  const add = (event: FormEvent) => { event.preventDefault(); const next = value.split(",").map((item) => item.trim()).filter(Boolean); if (!next.length) return; onChange("skills", [...new Set([...selected, ...next])].slice(0, 30)); setValue(""); };
  const remove = (skill: string) => onChange("skills", selected.filter((item) => item.toLowerCase() !== skill.toLowerCase()));
  return <div className="job-filter-section"><h3>Required skills</h3><form className="skill-filter-search" onSubmit={add}><input aria-label="Search or enter skill" placeholder="Type a skill" value={value} onChange={(event) => setValue(event.target.value)} /><button aria-label="Add skill" type="submit"><Plus size={15} /></button></form>{selected.length > 0 && <><div className="selected-job-skills">{selected.map((skill) => <button key={skill} type="button" onClick={() => remove(skill)}>{skill}<X size={12} /></button>)}</div><label className="skills-match-select">Match skills<select className="field-input" value={(params.get("skills_match") as SkillsMatch | null) ?? "any"} onChange={(event) => onPatch({ skills_match: event.target.value === "any" ? undefined : event.target.value })}><option value="any">Any selected skill</option><option value="all">All selected skills</option></select></label></>}</div>;
}
