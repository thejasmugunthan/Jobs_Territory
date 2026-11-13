import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";
import { useSaveJob } from "../hooks/useSaveJob";

export function SaveJobButton({ title, jobId }: { title: string; jobId: string }) {
  const {saved,loading,mutating,toggle,error}=useSaveJob(jobId);
  return <button type="button" className={`button button-outline job-save-button ${saved?"job-saved":""}`} disabled={loading||mutating} aria-label={`${saved?"Remove":"Save"} ${title}`} aria-pressed={saved} title={error||undefined} onClick={toggle}>{mutating?<LoaderCircle className="spin" size={15}/>:saved?<BookmarkCheck size={15}/>:<Bookmark size={15}/>} {saved?"Saved":"Save job"}</button>;
}
