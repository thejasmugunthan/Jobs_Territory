import { z } from "zod";
import type { JobSort } from "../types/job.types";

const employment = z.enum(["full_time", "part_time", "internship", "contract", "freelance"]);
const workMode = z.enum(["remote", "hybrid", "on_site"]);
const sort = z.enum(["latest", "oldest", "salary_high", "salary_low", "experience_low", "relevant"]);
const optionalMoney = z.number().finite().min(0).max(1_000_000_000_000).optional();
export const jobSearchSchema = z.object({
  q: z.string().trim().max(160).optional(), location: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  city: z.string().trim().max(100).optional(), state: z.string().trim().max(100).optional(), country: z.string().trim().max(100).optional(),
  min_experience: z.number().finite().min(0).max(80).optional(), max_experience: z.number().finite().min(0).max(80).optional(),
  min_salary: optionalMoney, max_salary: optionalMoney, currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
  employment_type: z.array(employment).max(5).optional(), work_mode: z.array(workMode).max(3).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(), skills_match: z.enum(["any", "all"]).default("any"),
  sort_by: sort.default("latest"), page: z.number().int().min(1).default(1), page_size: z.number().int().min(1).max(100).default(20),
}).superRefine((values, ctx) => {
  if (values.min_experience !== undefined && values.max_experience !== undefined && values.min_experience > values.max_experience) ctx.addIssue({ code: "custom", path: ["max_experience"], message: "Maximum experience must be at least the minimum." });
  if (values.min_salary !== undefined && values.max_salary !== undefined && values.min_salary > values.max_salary) ctx.addIssue({ code: "custom", path: ["max_salary"], message: "Maximum salary must be at least the minimum." });
  if ((values.min_salary !== undefined || values.max_salary !== undefined) && !values.currency) ctx.addIssue({ code: "custom", path: ["currency"], message: "Choose a currency when filtering by salary." });
  if (values.sort_by === "relevant" && !values.q) ctx.addIssue({ code: "custom", path: ["sort_by"], message: "Relevance sorting needs a search query." });
});

export type JobSearchInput = z.infer<typeof jobSearchSchema>;
export function searchParamsToInput(params: URLSearchParams) {
  const words = (name: string) => params.getAll(name).flatMap((value) => value.split(",").map((part) => part.trim()).filter(Boolean));
  const number = (name: string) => { const value = params.get(name); return value === null || value === "" ? undefined : Number(value); };
  const q = params.get("q") ?? params.get("search") ?? undefined;
  return jobSearchSchema.safeParse({
    q: q?.trim() || undefined, location: words("location"), city: params.get("city") || undefined,
    state: params.get("state") || undefined, country: params.get("country") || undefined,
    min_experience: number("min_experience"), max_experience: number("max_experience"),
    min_salary: number("min_salary"), max_salary: number("max_salary"), currency: params.get("currency") || undefined,
    employment_type: words("employment_type"), work_mode: words("work_mode"), skills: words("skills"),
    skills_match: params.get("skills_match") || undefined, sort_by: params.get("sort_by") || undefined,
    page: number("page"), page_size: number("page_size"),
  });
}

export function toApiSearchParams(input: JobSearchInput): URLSearchParams {
  const result = new URLSearchParams();
  const append = (key: string, value: string | number | undefined) => { if (value !== undefined && value !== "") result.append(key, String(value)); };
  append("q", input.q); input.location?.forEach((value) => append("location", value));
  append("city", input.city); append("state", input.state); append("country", input.country);
  append("min_experience", input.min_experience); append("max_experience", input.max_experience);
  append("min_salary", input.min_salary); append("max_salary", input.max_salary); append("currency", input.currency?.toUpperCase());
  input.employment_type?.forEach((value) => append("employment_type", value)); input.work_mode?.forEach((value) => append("work_mode", value));
  input.skills?.forEach((value) => append("skills", value)); append("skills_match", input.skills_match);
  append("sort_by", input.sort_by as JobSort); append("page", input.page); append("page_size", input.page_size);
  return result;
}
