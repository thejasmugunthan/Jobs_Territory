import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "../../../components/common/EmptyState";
import { getApiErrorMessage } from "../../../services/api";
import { useJobDetails } from "../../jobs/hooks/useJobDetails";
import { JobCompanyInfo } from "../../jobs/components/JobCompanyInfo";
import { JobMetadata } from "../../jobs/components/JobMetadata";
import { JobSalary } from "../../jobs/components/JobSalary";
import { applicationSchema, type ApplicationFormValues } from "../schemas/application.schema";
import { applicationsService } from "../services/applications.service";
import { ApplicationForm } from "../components/ApplicationForm";

export default function ApplyJobPage() {
 const {jobId}=useParams();const {job,loading,error,notFound,retry}=useJobDetails(jobId);const navigate=useNavigate();const [progress,setProgress]=useState<number|null>(null);const [serverError,setServerError]=useState("");const [existingApplication,setExistingApplication]=useState("");
 const {handleSubmit,setValue,watch,formState:{errors,isSubmitting}}=useForm<ApplicationFormValues>({resolver:zodResolver(applicationSchema),defaultValues:{cover_letter:""}});const file=watch("resume");
 const submit=handleSubmit(async(values)=>{if(!jobId)return;setServerError("");setExistingApplication("");setProgress(0);try{const created=await applicationsService.create(jobId,values,setProgress);toast.success("Application submitted");navigate(`/applications/${created.id}`,{replace:true});}catch(cause){if(axios.isAxiosError(cause)&&cause.response?.status===409){setServerError("You may already have applied to this role.");try{const list=await applicationsService.list({page:1,pageSize:100});const previous=list.items.find((item)=>item.job.id===jobId);if(previous)setExistingApplication(previous.id);}catch{/* Keep the conflict message if listing fails. */}}else setServerError(getApiErrorMessage(cause,"We could not submit your application."));}finally{setProgress(null);}});
 if(loading)return <div className="content-stack"><div className="job-detail-skeleton"/></div>;
 if(!job)return <div className="content-stack"><Link className="job-back-link" to="/jobs"><ArrowLeft size={15}/> Back to jobs</Link><EmptyState icon={<BriefcaseBusiness size={22}/>} title={notFound?"This job is unavailable":"Job details unavailable"} description={error} action={<button className="button button-primary" onClick={retry}>Try again</button>}/></div>;
 return <div className="content-stack apply-page"><Link className="job-back-link" to={`/jobs/${job.id}`}><ArrowLeft size={15}/> Back to job</Link><div className="page-intro"><span className="eyebrow">TAKE THE NEXT STEP</span><h2>Apply for {job.title}</h2><p>Send your application directly to {job.company.name}.</p></div><div className="apply-layout"><section className="apply-job-summary"><JobCompanyInfo company={job.company}/><h3>{job.title}</h3><JobMetadata job={job}/><JobSalary salary={job.salary}/><Link to={`/jobs/${job.id}`} className="inline-action">View full job details <ArrowUpRight size={14}/></Link></section><ApplicationForm onSubmit={submit} resume={file} onResumeChange={(next)=>setValue("resume",next,{shouldValidate:true,shouldDirty:true})} resumeError={errors.resume?.message} progress={progress} coverLetter={watch("cover_letter")??""} onCoverLetterChange={(value)=>setValue("cover_letter",value,{shouldValidate:true,shouldDirty:true})} coverLetterError={errors.cover_letter?.message} submitting={isSubmitting} serverError={serverError} existingApplicationId={existingApplication}/></div></div>;
}
