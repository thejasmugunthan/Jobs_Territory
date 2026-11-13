import { Code2 } from "lucide-react";

export function JobSkills({ skills, limit = 5 }: { skills: string[]; limit?: number }) {
  if (!skills.length) return <div className="job-skills-missing">Skills not specified</div>;
  const shown = skills.slice(0, limit);
  return <div className="job-skills"><span className="job-skills-icon"><Code2 size={14} /></span><div>{shown.map((skill) => <span className="job-skill-chip" key={skill}>{skill}</span>)}{skills.length > limit && <span className="job-skill-chip job-skill-more">+{skills.length - limit}</span>}</div></div>;
}
