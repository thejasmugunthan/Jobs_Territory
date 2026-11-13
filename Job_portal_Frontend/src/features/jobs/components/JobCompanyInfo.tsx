import { useState } from "react";
import { Building2 } from "lucide-react";
import type { CompanySummary } from "../types/job.types";

export function JobCompanyInfo({ company, compact = false }: { company: CompanySummary; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`job-company-info ${compact ? "job-company-info-compact" : ""}`}>
    <span className="job-company-logo">{company.logo_url && !failed ? <img src={company.logo_url} alt={`${company.name} logo`} loading="lazy" onError={() => setFailed(true)} /> : <span aria-hidden="true">{company.name.trim().slice(0, 1).toUpperCase() || <Building2 size={18} />}</span>}</span>
    <span className="job-company-text"><strong>{company.name}</strong></span>
  </div>;
}
