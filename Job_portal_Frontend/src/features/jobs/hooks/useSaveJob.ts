import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../services/api";
import { savedJobsService } from "../services/saved-jobs.service";

const EVENT = "jobs-saved-state-changed";
type SavedEvent = CustomEvent<{ jobId: string; saved: boolean }>;
export function useSaveJob(jobId: string) {
 const [saved,setSaved]=useState(false);const [loading,setLoading]=useState(true);const [mutating,setMutating]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{const controller=new AbortController();savedJobsService.isSaved(jobId,controller.signal).then(value=>{if(!controller.signal.aborted)setSaved(value);}).catch(cause=>{if(!controller.signal.aborted)setError(getApiErrorMessage(cause,"Saved-job status is unavailable."));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});const listener=(event:Event)=>{const detail=(event as SavedEvent).detail;if(detail.jobId===jobId)setSaved(detail.saved);};window.addEventListener(EVENT,listener);return()=>{controller.abort();window.removeEventListener(EVENT,listener);};},[jobId]);
 const toggle=useCallback(async()=>{if(mutating)return;setMutating(true);setError("");try{if(saved){await savedJobsService.remove(jobId);setSaved(false);toast.success("Removed from saved jobs");window.dispatchEvent(new CustomEvent(EVENT,{detail:{jobId,saved:false}}));}else{await savedJobsService.save(jobId);setSaved(true);toast.success("Job saved for later");window.dispatchEvent(new CustomEvent(EVENT,{detail:{jobId,saved:true}}));}}catch(cause){const message=getApiErrorMessage(cause,"Could not update saved jobs.");setError(message);toast.error(message);}finally{setMutating(false);}},[jobId,mutating,saved]);
 return {saved,loading,mutating,error,toggle};
}
