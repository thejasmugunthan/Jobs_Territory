import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../services/api";
import { getJobMatch, type JobMatch } from "./matching.service";

function Score({ title, value }: { title: string; value: number | null }) { return <article className="card" style={{padding:22}}><p>{title}</p><strong style={{fontSize:28}}>{value===null?"N/A":`${value}%`}</strong>{value!==null&&<div style={{height:8,background:"#eeeaf7",borderRadius:8,marginTop:10}}><div style={{height:8,width:`${Math.min(100,value)}%`,background:"#6844e8",borderRadius:8}}/></div>}</article>; }
export default function JobMatchAnalysisPage() {
  const {jobId=""}=useParams(); const [match,setMatch]=useState<JobMatch|null>(null); const [error,setError]=useState("");
  useEffect(()=>{let active=true; void getJobMatch(jobId).then(result=>{if(active)setMatch(result);}).catch(e=>{if(active){setError(getApiErrorMessage(e,"Match analysis could not be loaded."));toast.error(getApiErrorMessage(e));}}); return ()=>{active=false;};},[jobId]);
  if(error)return <div className="content-stack card" style={{padding:24}}><h2>Match analysis unavailable</h2><p>{error}</p><Link to="/jobs">Return to job search</Link></div>;
  if(!match)return <div className="content-stack card" style={{padding:24}}>Calculating compatibility from your confirmed profile…</div>;
  const chips=(items:string[],tone:string)=><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{items.length?items.map((x,i)=><span key={`${x}-${i}`} className={`badge ${tone}`}>{x}</span>):<span className="muted">None</span>}</div>;
  return <div className="content-stack"><Link to={`/jobs/${jobId}`} className="job-back-link">← Back to job</Link><header><p className="eyebrow">Job matching</p><h2>Compatibility estimate</h2><p>{match.disclaimer}</p></header>
    <section className="card" style={{padding:24,background:"#f8f6ff"}}><p className="eyebrow">Overall compatibility</p><strong style={{fontSize:44}}>{match.overall_compatibility_score===null?"N/A":`${match.overall_compatibility_score}%`}</strong><p>Profile data completeness: {match.data_completeness}%</p>{match.data_completeness<100&&<p>Some information is missing. <Link to="/profile">Review your profile</Link> to improve this estimate.</p>}</section>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16}}><Score title="Required skills" value={match.skill_match_percentage}/><Score title="Experience" value={match.experience_match_percentage}/><Score title="Education" value={match.education_match_percentage}/></div>
    <section className="card" style={{padding:24}}><h3>Required skills</h3><p>Matched</p>{chips(match.matched_skills,"badge-success")}<h4>Missing</h4>{chips(match.missing_required_skills,"badge-warning")}<h3 style={{marginTop:20}}>Preferred skills</h3><p>Matched</p>{chips(match.matched_preferred_skills,"badge-success")}<h4>Missing</h4>{chips(match.missing_preferred_skills,"badge-neutral")}</section>
    <section className="card" style={{padding:24}}><h3>Score breakdown</h3><p>Skills: {match.skill_match_percentage===null?"Not applicable":`${match.skill_match_percentage}% × 60%`}</p><p>Experience: {match.experience_match_percentage===null?"Not applicable":`${match.experience_match_percentage}% × 25%`}</p><p>Education: {match.education_match_percentage===null?"Not applicable":`${match.education_match_percentage}% × 15%`}</p><p>Unavailable categories are omitted and the remaining weights are renormalized. Missing data is not treated as a failure.</p>{match.explanation.map((line,i)=><p key={i}>{line}</p>)}</section>
    <section className="card" style={{padding:24}}><h3>Ways to strengthen your match</h3>{match.improvement_suggestions.length?match.improvement_suggestions.map((s,i)=><p key={i}>• {s}</p>):<p>No missing job skills were found in your confirmed profile.</p>}</section>
  </div>;
}
