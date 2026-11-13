import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
export function ApplyNowButton({jobId}:{jobId:string}){return <Link className="button button-primary" to={`/jobs/${jobId}/apply`}>Apply now <ArrowUpRight size={15}/></Link>;}
