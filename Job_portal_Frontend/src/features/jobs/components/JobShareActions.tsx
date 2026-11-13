import { Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { JobDetails } from "../types/job.types";

function publicUrl(job: JobDetails) {
  const url = new URL(`/public/jobs/${encodeURIComponent(job.id)}`, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error("Invalid public job URL");
  return url.toString();
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value; input.setAttribute("readonly", ""); input.style.position = "fixed"; input.style.opacity = "0";
  document.body.appendChild(input); input.select();
  const copied = document.execCommand("copy"); input.remove();
  if (!copied) throw new Error("Copy is unavailable in this browser");
}

export function JobShareActions({ job }: { job: JobDetails }) {
  const getUrl = () => publicUrl(job);
  const copy = async () => { try { await copyText(getUrl()); toast.success("Public job link copied."); } catch { toast.error("Could not copy the job link."); } };
  const share = async () => {
    const url = getUrl();
    try {
      if (navigator.share) await navigator.share({ title: job.title, text: `${job.title} at ${job.company.name}`, url });
      else await copyText(url);
    } catch (error) { if (error instanceof Error && error.name !== "AbortError") toast.error("Could not share this job."); }
  };
  const message = encodeURIComponent(`${job.title} at ${job.company.name}: ${getUrl()}`);
  return <div className="job-share-actions" aria-label="Share this job">
    <button type="button" className="button button-outline" onClick={() => void share()}><Share2 size={15}/> Share</button>
    <button type="button" className="button button-outline" onClick={() => void copy()}><Copy size={15}/> Copy link</button>
    <a className="button button-outline" href={`mailto:?subject=${encodeURIComponent(`Job opportunity: ${job.title}`)}&body=${message}`}><Mail size={15}/> Email</a>
    <a className="button button-outline" href={`https://wa.me/?text=${message}`} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a>
  </div>;
}
