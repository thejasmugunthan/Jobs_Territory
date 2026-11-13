import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../../../components/common/Button";
import { TextField } from "../../../components/common/TextField";
import { getApiErrorMessage } from "../../../services/api";
import { profileService } from "../services/profile.service";
import type { CandidateProfile } from "../types/profile.types";
import { personalInformationSchema } from "../schemas/profile.schema";

type Values = { full_name: string; phone_number: string; profile_headline: string; professional_summary: string; current_location: string; city: string; state: string; country: string; linkedin_url: string; github_url: string; portfolio_url: string; total_experience: number | null; current_employment_status: "employed" | "unemployed" | "student" | "self-employed" | "other" | null };
const keys: (keyof Values)[] = ["full_name", "phone_number", "profile_headline", "professional_summary", "current_location", "city", "state", "country", "linkedin_url", "github_url", "portfolio_url", "total_experience", "current_employment_status"];
const names: Record<keyof Values, string> = { full_name: "Full name", phone_number: "Phone number", profile_headline: "Profile headline", professional_summary: "Professional summary", current_location: "Current location", city: "City", state: "State", country: "Country", linkedin_url: "LinkedIn URL", github_url: "GitHub URL", portfolio_url: "Portfolio URL", total_experience: "Years of experience", current_employment_status: "Employment status" };
export function PersonalInformationForm({ profile, onSaved, initialName }: { profile: CandidateProfile | null; onSaved: (value: CandidateProfile) => void; initialName: string }) {
  const form = useForm<Values>({ resolver: zodResolver(personalInformationSchema), defaultValues: { full_name: initialName, phone_number: "", profile_headline: "", professional_summary: "", current_location: "", city: "", state: "", country: "", linkedin_url: "", github_url: "", portfolio_url: "", total_experience: null, current_employment_status: null } });
  useEffect(() => { if (profile) form.reset(Object.fromEntries(keys.map((key) => [key, profile[key] ?? (key === "total_experience" || key === "current_employment_status" ? null : "")])) as Values); }, [profile, form]);
  useEffect(() => { if (!form.formState.isDirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [form.formState.isDirty]);
  const submit = form.handleSubmit(async (values) => {
    const payload = Object.fromEntries(keys.map((key) => [key, typeof values[key] === "string" ? (values[key] as string).trim() || null : values[key]]));
    try { const saved = profile ? await profileService.update(payload) : await profileService.create({ full_name: values.full_name, ...payload }); onSaved(saved); toast.success("Personal information saved"); }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not save your personal information")); }
  });
  return <form className="profile-record-form" onSubmit={submit} noValidate><div className="profile-fields-grid">{keys.filter((key) => key !== "professional_summary").map((key) => key === "current_employment_status" ? <label className="field-wrap" key={key}><span className="field-label">{names[key]}</span><select className="field-input" {...form.register(key)}><option value="">Choose status</option>{["employed", "unemployed", "student", "self-employed", "other"].map((x) => <option key={x} value={x}>{x.replace("-", " ")}</option>)}</select></label> : <TextField key={key} label={names[key]} type={key === "total_experience" ? "number" : key.endsWith("_url") ? "url" : key === "phone_number" ? "tel" : "text"} placeholder={key === "phone_number" ? "+14155552671" : key.endsWith("_url") ? "https://" : names[key]} hint={key === "phone_number" ? "Include your international country code." : undefined} error={form.formState.errors[key]?.message as string | undefined} {...form.register(key, key === "total_experience" ? { setValueAs: (value: string) => value === "" ? null : Number(value) } : {})} />)}</div><label className="field-wrap"><span className="field-label">Professional summary</span><textarea className="field-input textarea-input" rows={4} maxLength={5000} {...form.register("professional_summary")} /><span className="field-hint">A short introduction helps employers understand your strengths.</span></label><div className="profile-form-footer"><span>Only you can edit these details.</span><Button type="submit" loading={form.formState.isSubmitting}>Save personal information</Button></div></form>;
}
