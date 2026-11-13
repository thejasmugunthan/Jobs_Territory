import { IndianRupee } from "lucide-react";
import type { JobSalary as Salary } from "../types/job.types";
import { formatCurrency } from "./job-format";

export function JobSalary({ salary, compact = false }: { salary: Salary; compact?: boolean }) {
  const amount = salary.minimum !== null || salary.maximum !== null;
  const curr = salary.currency || "INR";
  const text = !amount
    ? "Salary not disclosed"
    : salary.minimum !== null && salary.maximum !== null
    ? `${formatCurrency(salary.minimum, curr)} – ${formatCurrency(salary.maximum, curr)}`
    : salary.minimum !== null
    ? `From ${formatCurrency(salary.minimum, curr)}`
    : `Up to ${formatCurrency(salary.maximum!, curr)}`;
  return (
    <div className={`job-salary ${compact ? "job-salary-compact" : ""}`}>
      <IndianRupee size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{text}</span>
    </div>
  );
}
