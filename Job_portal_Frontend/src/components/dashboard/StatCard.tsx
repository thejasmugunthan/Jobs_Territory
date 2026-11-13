import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Card } from "../common/Card";

export function StatCard({ title, icon: Icon, tone, description }: { title: string; icon: LucideIcon; tone: "purple" | "blue" | "amber" | "green"; description: string }) {
  return <Card className={`stat-card stat-${tone}`}>
    <div className="stat-top"><span className="stat-icon"><Icon size={17} /></span><span className="stat-label">{title}</span><span className="stat-arrow"><ArrowUpRight size={15} /></span></div>
    <div className="stat-value">—</div>
    <p className="stat-description">{description}</p>
  </Card>;
}
