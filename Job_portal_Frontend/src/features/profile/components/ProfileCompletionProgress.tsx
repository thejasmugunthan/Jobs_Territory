import type { CSSProperties } from "react";
import type { ProfileCompletion } from "../types/profile.types";

const labels: Record<string, string> = { basic_profile: "Personal information", professional_summary: "Professional summary", education: "Education", work_experience: "Work experience", skills: "Skills", projects: "Projects", certifications: "Certifications", job_preferences: "Job preferences" };
export function ProfileCompletionProgress({ completion }: { completion: ProfileCompletion }) {
  const pct = Math.max(0, Math.min(100, completion.completion_percentage));
  return <section className="profile-progress-card" aria-label={`Profile ${pct}% complete`}>
    <div className="profile-progress-ring" style={{ "--completion": `${pct}%` } as CSSProperties}><span>{pct}%</span></div>
    <div className="profile-progress-copy"><span className="eyebrow">YOUR PROFILE</span><h2>{pct === 100 ? "Profile complete" : "Build a stronger profile"}</h2><p>Complete your profile to improve the information available to employers.</p><div className="profile-progress-sections">{completion.completed_sections.map((key) => <span className="progress-chip progress-done" key={key}>✓ {labels[key] ?? key} · {completion.section_scores[key] ?? 0} pts</span>)}{completion.incomplete_sections.map((key) => <span className="progress-chip" key={key}>{labels[key] ?? key} · {completion.section_scores[key] ?? 0} pts</span>)}</div></div>
  </section>;
}
