import { BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} to="/" aria-label="Jobs Territory home">
      <span className="brand-mark"><BriefcaseBusiness size={19} strokeWidth={2.2} /></span>
      <span>Jobs<span className="brand-accent">Territory</span></span>
    </Link>
  );
}
