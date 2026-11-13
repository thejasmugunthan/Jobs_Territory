import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { ApplicationItem } from "../types/application.types";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { JobCompanyInfo } from "../../jobs/components/JobCompanyInfo";
import { formatLocation, formatEmployment } from "../../jobs/components/job-format";
export function ApplicationCard({application}: {application:ApplicationItem}) { return <article className="application-card"><div className="application-card-head"><JobCompanyInfo company={application.job.company}/><ApplicationStatusBadge status={application.status}/></div><h3>{application.job.title}</h3><p className="application-company-name">{application.job.company.name}</p><div className="application-card-meta"><span><MapPin size={13}/>{formatLocation(application.job)}</span><span>{formatEmployment(application.job.employment_type)}</span><span><CalendarDays size={13}/>{new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(application.applied_at))}</span></div><Link className="button button-secondary" to={`/applications/${application.id}`}>View details <ArrowUpRight size={14}/></Link></article>; }
