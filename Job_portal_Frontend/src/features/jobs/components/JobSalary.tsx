import { CircleDollarSign } from "lucide-react";
import type { JobSalary as Salary } from "../types/job.types";
import { formatCurrency } from "./job-format";

export function JobSalary({ salary, compact = false }: { salary: Salary; compact?: boolean }) {
  const amount = salary.minimum !== null || salary.maximum !== null;
  const text = !amount || !salary.currency ? "Salary not disclosed" : salary.minimum !== null && salary.maximum !== null
    ? `${formatCurrency(salary.minimum, salary.currency)} – ${formatCurrency(salary.maximum, salary.currency)}`
    : salary.minimum !== null ? `From ${formatCurrency(salary.minimum, salary.currency)}` : `Up to ${formatCurrency(salary.maximum!, salary.currency)}`;
  return <div className={`job-salary ${compact ? "job-salary-compact" : ""}`}><CircleDollarSign size={15} /><span>{text}</span></div>;
}
