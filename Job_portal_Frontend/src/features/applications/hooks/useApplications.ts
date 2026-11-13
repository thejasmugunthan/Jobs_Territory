import { useEffect, useState } from "react";
import axios from "axios";
import { getApiErrorMessage } from "../../../services/api";
import { applicationsService } from "../services/applications.service";
import type { ApplicationsResponse } from "../types/application.types";

export function useApplications(status?: string, page = 1, sortBy = "latest", q = "") {
  const [data,setData]=useState<ApplicationsResponse|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [unauthorized,setUnauthorized]=useState(false); const [retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");applicationsService.list({status,page,sortBy,q},controller.signal).then(value=>{if(!controller.signal.aborted)setData(value);}).catch(cause=>{if(!controller.signal.aborted){setData(null);setError(getApiErrorMessage(cause,"Could not load your applications."));setUnauthorized(axios.isAxiosError(cause)&&cause.response?.status===401);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[status,page,sortBy,q,retry]);
  return {data,loading,error,unauthorized,retry:()=>setRetry(value=>value+1)};
}
