import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ApplyNowButtonProps {
  jobId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ApplyNowButton({ jobId, size = "md", className = "" }: ApplyNowButtonProps) {
  const sizeClasses =
    size === "sm"
      ? "text-xs py-2 px-3 rounded-xl gap-1.5 h-9"
      : size === "lg"
      ? "text-sm py-3 px-5 rounded-xl gap-2 h-11"
      : "text-xs py-2.5 px-4 rounded-xl gap-2 h-10";

  return (
    <Link
      className={`inline-flex items-center justify-center font-bold bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] text-white shadow-sm shadow-purple-500/20 hover:shadow-md hover:shadow-purple-500/30 hover:opacity-95 transition-all whitespace-nowrap active:scale-[0.98] ${sizeClasses} ${className}`}
      to={`/jobs/${jobId}/apply`}
    >
      <span>Apply now</span>
      <ArrowUpRight size={size === "sm" ? 13 : 15} />
    </Link>
  );
}
