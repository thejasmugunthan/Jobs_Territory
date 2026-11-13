import { LoaderCircle } from "lucide-react";

export function PageLoader({ label = "Loading your workspace" }: { label?: string }) {
  return <div className="page-loader" role="status"><LoaderCircle className="spin" size={24} /><span>{label}</span></div>;
}
