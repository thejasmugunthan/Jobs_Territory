import type { EmploymentType, JobListItem, WorkMode } from "../types/job.types";

export function formatEmployment(value: EmploymentType): string { return ({ full_time: "Full-time", part_time: "Part-time", internship: "Internship", contract: "Contract", freelance: "Freelance" })[value]; }
export function formatWorkMode(value: WorkMode | null): string { return value ? ({ remote: "Remote", hybrid: "Hybrid", on_site: "On-site" })[value] : "Work mode not specified"; }
export function formatLocation(job: JobListItem): string { const parts = [job.location.city, job.location.state, job.location.country].filter(Boolean); return parts.join(", ") || job.location.name || "Location not specified"; }
export function formatExperience(minimum: number | null, maximum: number | null): string {
  if (minimum === 0 && maximum === 0) return "Fresher";
  if (minimum !== null && maximum !== null) return `${minimum}–${maximum} years`;
  if (minimum !== null) return `${minimum}+ years`;
  if (maximum !== null) return `Up to ${maximum} years`;
  return "Experience not specified";
}
export function formatPostedDate(value: string | null): string {
  if (!value) return "Recently posted";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently posted";
  const days = Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
export function formatCurrency(value: number, currency: string = "INR"): string {
  try {
    const cur = !currency || currency.toUpperCase() === "USD" ? "INR" : currency;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
  }
}
