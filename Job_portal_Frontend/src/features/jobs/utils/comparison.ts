import { toast } from "sonner";

export const COMPARISON_STORAGE_KEY = "jobs-territory-compare";
export const MAX_COMPARISON_LIMIT = 4;

export function getComparedJobIds(): string[] {
  try {
    const raw = sessionStorage.getItem(COMPARISON_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item): item is string => typeof item === "string"))].slice(
      0,
      MAX_COMPARISON_LIMIT
    );
  } catch {
    return [];
  }
}

export function isJobCompared(id: string): boolean {
  return getComparedJobIds().includes(id);
}

export function notifyComparisonChange(): void {
  window.dispatchEvent(new CustomEvent("jobs-comparison-updated"));
}

export function addJobToComparison(id: string, jobTitle?: string): boolean {
  const current = getComparedJobIds();
  if (current.includes(id)) {
    toast.info(jobTitle ? `"${jobTitle}" is already in comparison.` : "Job is already in comparison.");
    return false;
  }
  if (current.length >= MAX_COMPARISON_LIMIT) {
    toast.error(`You can compare up to ${MAX_COMPARISON_LIMIT} jobs at a time. Remove one to add another.`);
    return false;
  }
  const next = [...current, id];
  sessionStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(next));
  notifyComparisonChange();
  toast.success(jobTitle ? `"${jobTitle}" added to comparison.` : "Job added to comparison.");
  return true;
}

export function removeJobFromComparison(id: string): void {
  const current = getComparedJobIds();
  const next = current.filter((jobId) => jobId !== id);
  sessionStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(next));
  notifyComparisonChange();
  toast.success("Job removed from comparison.");
}

export function clearJobComparison(): void {
  sessionStorage.removeItem(COMPARISON_STORAGE_KEY);
  notifyComparisonChange();
  toast.success("Job comparison cleared.");
}

