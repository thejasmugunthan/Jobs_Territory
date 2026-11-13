import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { LocationFilter } from "./LocationFilter";
import { ExperienceFilter } from "./ExperienceFilter";
import { SalaryFilter } from "./SalaryFilter";
import { EmploymentTypeFilter } from "./EmploymentTypeFilter";
import { WorkModeFilter } from "./WorkModeFilter";
import { SkillsFilter } from "./SkillsFilter";

export function JobFilterSidebar({ params, onChange, onPatch, onClear }: { params: URLSearchParams; onChange: (key: string, values: string[]) => void; onPatch: (values: Record<string, string | undefined>) => void; onClear: () => void }) {
 const [open,setOpen]=useState(false);
 return <>
  <button className="job-mobile-filter button button-outline" onClick={()=>setOpen(true)}><SlidersHorizontal size={15}/> Filters</button>
  {open && <button className="job-filter-scrim" aria-label="Close filters" onClick={()=>setOpen(false)}/>}
  <aside className={`job-filter-panel ${open?"job-filter-panel-open":""}`} aria-label="Filter jobs">
   <header><div><SlidersHorizontal size={15}/><strong>Filters</strong></div><button className="job-filter-close" aria-label="Close filters" onClick={()=>setOpen(false)}><X size={17}/></button><button className="job-filter-clear" onClick={onClear}>Clear all</button></header>
   <LocationFilter params={params} onPatch={onPatch}/><ExperienceFilter params={params} onPatch={onPatch}/><SalaryFilter params={params} onPatch={onPatch}/><EmploymentTypeFilter params={params} onChange={onChange}/><WorkModeFilter params={params} onChange={onChange}/><SkillsFilter params={params} onChange={onChange} onPatch={onPatch}/>
   <button className="button button-primary job-filter-done" onClick={()=>setOpen(false)}>Show jobs</button>
  </aside>
 </>;
}
