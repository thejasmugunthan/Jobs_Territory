import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalUrl = z.string().trim().url("Enter a complete URL including https://").max(500).or(z.literal("")).optional();
export const personalInformationSchema = z.object({
  full_name: z.string().trim().min(1, "Your name is required").max(160),
  phone_number: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use international format, for example +14155552671").or(z.literal("")).optional(),
  profile_headline: optionalText(180), professional_summary: optionalText(5000), current_location: optionalText(180),
  city: optionalText(100), state: optionalText(100), country: optionalText(100), linkedin_url: optionalUrl,
  github_url: optionalUrl, portfolio_url: optionalUrl, total_experience: z.coerce.number().int().min(0).max(80).nullable().optional(),
  current_employment_status: z.enum(["employed", "unemployed", "student", "self-employed", "other"]).nullable().optional(),
});
export const educationSchema = z.object({ institution_name: z.string().trim().min(1).max(180), degree: z.string().trim().min(1).max(120), field_of_study: optionalText(160), start_date: z.string().min(1), end_date: z.string().optional(), is_currently_studying: z.boolean(), grade: optionalText(40), description: optionalText(3000) }).refine((v) => v.is_currently_studying || !v.end_date || v.end_date >= v.start_date, { path: ["end_date"], message: "End date must be after the start date" });
export const experienceSchema = z.object({ company_name: z.string().trim().min(1).max(180), job_title: z.string().trim().min(1).max(160), employment_type: z.enum(["full-time", "part-time", "internship", "contract", "freelance"]), location: optionalText(180), start_date: z.string().min(1), end_date: z.string().optional(), currently_working: z.boolean(), description: optionalText(5000), responsibilities_text: z.string().max(15000).optional() }).refine((v) => v.currently_working || !v.end_date || v.end_date >= v.start_date, { path: ["end_date"], message: "End date must be after the start date" });
export const projectSchema = z.object({ project_name: z.string().trim().min(1).max(180), description: optionalText(5000), technologies_text: z.string().max(2500), project_url: optionalUrl, repository_url: optionalUrl, start_date: z.string().optional(), end_date: z.string().optional(), is_ongoing: z.boolean() }).refine((v) => v.is_ongoing || !v.start_date || !v.end_date || v.end_date >= v.start_date, { path: ["end_date"], message: "End date must be after the start date" });
export const certificationSchema = z.object({ certification_name: z.string().trim().min(1).max(180), issuing_organization: z.string().trim().min(1).max(180), issue_date: z.string().min(1), expiration_date: z.string().optional(), credential_id: optionalText(120), credential_url: optionalUrl, does_not_expire: z.boolean() }).refine((v) => v.does_not_expire || !v.expiration_date || v.expiration_date >= v.issue_date, { path: ["expiration_date"], message: "Expiration must be after the issue date" });
export const preferencesSchema = z.object({ titles_text: z.string(), locations_text: z.string(), employment: z.array(z.enum(["full-time", "part-time", "internship", "contract", "freelance"])), modes: z.array(z.enum(["remote", "hybrid", "on-site"])), minimum_expected_salary: z.string(), maximum_expected_salary: z.string(), salary_currency: z.string().max(3), preferred_experience_level: optionalText(40), willing_to_relocate: z.boolean(), available_to_join: optionalText(80), industries_text: z.string() }).superRefine((v, ctx) => {
  for (const field of ["minimum_expected_salary", "maximum_expected_salary"] as const) {
    const value = v[field]; if (!value) continue;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) ctx.addIssue({ code: "custom", path: [field], message: "Enter a salary between 0 and 1,000,000,000" });
  }
  const min = Number(v.minimum_expected_salary); const max = Number(v.maximum_expected_salary);
  if (v.minimum_expected_salary && v.maximum_expected_salary && min > max) ctx.addIssue({ code: "custom", path: ["maximum_expected_salary"], message: "Maximum salary must be at least the minimum" });
  if ((v.minimum_expected_salary || v.maximum_expected_salary) && v.salary_currency.length !== 3) ctx.addIssue({ code: "custom", path: ["salary_currency"], message: "Enter a three-letter currency code" });
});
