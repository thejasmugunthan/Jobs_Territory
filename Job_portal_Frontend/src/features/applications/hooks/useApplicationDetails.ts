import { useEffect, useState } from "react";
import axios from "axios";
import { getApiErrorMessage } from "../../../services/api";
import { applicationsService } from "../services/applications.service";
import type { ApplicationDetails, ApplicationHistoryResponse, ApplicationStatusResponse } from "../types/application.types";

export function useApplicationDetails(id: string | undefined) {
 const [application,setApplication]=useState<ApplicationDetails|null>(null);const [history,setHistory]=useState<ApplicationHistoryResponse|null>(null);const [status,setStatus]=useState<ApplicationStatusResponse|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [notFound,setNotFound]=useState(false);const [retry,setRetry]=useState(0);
 useEffect(()=>{if(!id){setLoading(false);setNotFound(true);setError("Application link is invalid.");return;}const controller=new AbortController();setLoading(true);setError("");Promise.all([applicationsService.details(id,controller.signal),applicationsService.history(id,controller.signal),applicationsService.status(id,controller.signal)]).then(([app,events,current])=>{if(!controller.signal.aborted){setApplication(app);setHistory(events);setStatus(current);}}).catch(cause=>{if(!controller.signal.aborted){setApplication(null);setHistory(null);setStatus(null);setNotFound(axios.isAxiosError(cause)&&cause.response?.status===404);setError(getApiErrorMessage(cause,"Could not load this application."));}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[id,retry]);
 return {application,history,status,loading,error,notFound,retry:()=>setRetry(v=>v+1)};
}
