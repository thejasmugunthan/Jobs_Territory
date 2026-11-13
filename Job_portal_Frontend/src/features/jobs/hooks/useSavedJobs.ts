import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../../services/api";
import { savedJobsService, type SavedJobsResponse } from "../services/saved-jobs.service";

export function useSavedJobs(page=1,sortBy="latest") {
 const [data,setData]=useState<SavedJobsResponse|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");savedJobsService.list(page,10,sortBy,controller.signal).then(value=>{if(!controller.signal.aborted)setData(value);}).catch(cause=>{if(!controller.signal.aborted){setError(getApiErrorMessage(cause,"Could not load saved jobs."));setData(null);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[page,sortBy,retry]);
 return {data,loading,error,retry:()=>setRetry(value=>value+1)};
}
