import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CircleUserRound, GraduationCap, BriefcaseBusiness, Wrench, FolderKanban, Award, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../../../components/common/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { PageLoader } from "../../../components/common/Loader";
import { getApiErrorMessage } from "../../../services/api";
import { useAuth } from "../../auth/hooks/useAuth";
import { profileService } from "../services/profile.service";
import type { CandidateProfile, ProfileCompletion } from "../types/profile.types";
import { ProfileCompletionProgress } from "./ProfileCompletionProgress";
import { PersonalInformationForm } from "./PersonalInformationForm";
import { EducationSection, ExperienceSection, ProjectsSection, CertificationsSection } from "./ProfileSections";
import { SkillsSection } from "./SkillsSection";
import { JobPreferencesForm } from "./JobPreferencesForm";

export const profileSteps = [
  { id: "personal", title: "Personal information", icon: CircleUserRound }, { id: "education", title: "Education", icon: GraduationCap },
  { id: "experience", title: "Work experience", icon: BriefcaseBusiness }, { id: "skills", title: "Skills", icon: Wrench },
  { id: "projects", title: "Projects", icon: FolderKanban }, { id: "certifications", title: "Certifications", icon: Award },
  { id: "preferences", title: "Job preferences", icon: SlidersHorizontal },
] as const;
export type ProfileSectionId = typeof profileSteps[number]["id"];

export default function ProfileWorkspace({ onboarding = false, activeStep = "personal", onStepSaved }: { onboarding?: boolean; activeStep?: ProfileSectionId; onStepSaved?: (id: ProfileSectionId, profile?: CandidateProfile) => void }) {
  const { user, updateCurrentUser } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null); const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [selected, setSelected] = useState<ProfileSectionId>(activeStep);
  useEffect(() => setSelected(activeStep), [activeStep]);
  const refresh = useCallback(async () => { try { setCompletion(await profileService.completion()); } catch { /* completion is shown as unavailable until the next successful mutation */ } }, []);
  useEffect(() => { let live = true; Promise.allSettled([profileService.get(), profileService.completion()]).then(([profileResult, completionResult]) => { if (!live) return; if (profileResult.status === "fulfilled") setProfile(profileResult.value); else if (!(profileResult.reason && typeof profileResult.reason === "object" && "response" in profileResult.reason && (profileResult.reason as { response?: { status?: number } }).response?.status === 404)) setError(getApiErrorMessage(profileResult.reason, "Could not load your profile")); if (completionResult.status === "fulfilled") setCompletion(completionResult.value); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, []);
  const savedProfile = (value: CandidateProfile) => { setProfile(value); if (user) updateCurrentUser({ ...user, full_name: value.full_name }); onStepSaved?.("personal", value); void refresh(); };
  const changed = () => { onStepSaved?.(selected, profile ?? undefined); void refresh(); };
  const renderSection = (id: ProfileSectionId) => {
    if (id === "personal") return <PersonalInformationForm profile={profile} initialName={user?.full_name ?? ""} onSaved={savedProfile} />;
    if (id === "education") return <EducationSection onChanged={changed} />;
    if (id === "experience") return <ExperienceSection onChanged={changed} />;
    if (id === "skills") return <SkillsSection onChanged={changed} />;
    if (id === "projects") return <ProjectsSection onChanged={changed} />;
    if (id === "certifications") return <CertificationsSection onChanged={changed} />;
    return <JobPreferencesForm onChanged={changed} />;
  };
  if (loading) return <PageLoader label="Loading your candidate profile" />;
  if (error) return <Card><EmptyState icon={<CircleUserRound size={20} />} title="Profile details aren't available" description={error} action={<button className="button button-outline" onClick={() => window.location.reload()}>Try again</button>} /></Card>;
  const active = profileSteps.find((step) => step.id === selected)!;
  return <div className={`profile-workspace ${onboarding ? "profile-onboarding-workspace" : ""}`}>
    {!onboarding && completion && <ProfileCompletionProgress completion={completion} />}
    {!onboarding && <div className="profile-workspace-heading"><div><span className="eyebrow">CANDIDATE PROFILE</span><h2>Manage your profile</h2><p>Keep your experience and preferences up to date.</p></div><Link className="button button-secondary" to="/onboarding">{profile?.profile_initialized ? "Continue onboarding" : "Start onboarding"}<ArrowRight size={15} /></Link></div>}
    <div className="profile-workspace-grid">
      {!onboarding && <nav className="profile-section-nav" aria-label="Profile sections">{profileSteps.map(({ id, title, icon: Icon }) => <button key={id} className={selected === id ? "profile-tab-active" : ""} onClick={() => setSelected(id)}><Icon size={17} /><span>{title}</span>{completion?.completed_sections.includes(id === "personal" ? "basic_profile" : id === "experience" ? "work_experience" : id === "preferences" ? "job_preferences" : id) && <CheckCircle2 size={14} className="profile-tab-check" />}</button>)}</nav>}
      <div className="profile-workspace-main"><div className="profile-current-heading"><span className="profile-current-icon"><active.icon size={18} /></span><div><h2>{active.title}</h2><p>{onboarding ? "Your information is saved to your candidate profile." : "Edit this section whenever you need."}</p></div>{selected === "experience" || selected === "certifications" ? <span className="optional-pill">Optional</span> : null}</div>{renderSection(selected)}</div>
    </div>
  </div>;
}
