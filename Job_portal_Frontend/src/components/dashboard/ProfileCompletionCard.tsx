import { ArrowRight, CircleCheck, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import type { ProfileCompletion } from "../../features/auth/services/auth.service";
import { Card } from "../common/Card";
import { PageLoader } from "../common/Loader";

const labels: Record<string, string> = { basic_profile: "Personal information", professional_summary: "Professional summary", education: "Education", work_experience: "Work experience", skills: "Skills", projects: "Projects", certifications: "Certifications", job_preferences: "Job preferences" };

export function ProfileCompletionCard({ completion, loading, error }: { completion: ProfileCompletion | null; loading: boolean; error: boolean }) {
  const percentage = completion?.completion_percentage ?? 0;
  return <Card className="completion-card">
    <div className="completion-heading"><div><span className="eyebrow">PROFILE CHECK-IN</span><h2>Profile completion</h2></div><FileText className="subtle-icon" size={19} /></div>
    {loading ? <div className="completion-loading"><PageLoader label="Checking your profile" /></div> : <>
      <div className="completion-ring-wrap"><div className="completion-ring" style={{ "--completion": `${percentage}%` } as CSSProperties}><div className="completion-ring-center"><strong>{percentage}%</strong><span>complete</span></div></div></div>
      <div className="completion-caption"><span>{error ? "Profile progress isn’t available right now." : percentage >= 100 ? "Your profile is all set." : "A few details can make your profile clearer."}</span><CircleCheck size={15} /></div>
      {completion && <div className="dashboard-profile-sections"><strong>Suggested next steps</strong><div>{completion.incomplete_sections.slice(0, 4).map((section) => <span key={section}>{labels[section] ?? section}</span>)}</div></div>}
      <Link to="/profile" className="button button-primary completion-cta">Improve profile <ArrowRight size={16} /></Link>
    </>}
  </Card>;
}
