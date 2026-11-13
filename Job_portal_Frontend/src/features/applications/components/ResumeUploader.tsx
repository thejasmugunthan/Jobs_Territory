import { FileText, Trash2, UploadCloud } from "lucide-react";
import type { ChangeEvent } from "react";
export function ResumeUploader({file,onChange,error,progress}: {file?:File;onChange:(file?:File)=>void;error?:string;progress:number|null}) {
 const choose=(event:ChangeEvent<HTMLInputElement>)=>{onChange(event.target.files?.[0]);event.currentTarget.value="";};
 return <div className="resume-uploader"><label className="resume-uploader-label"><input type="file" accept="application/pdf,.pdf" onChange={choose}/><UploadCloud size={19}/><strong>{file?"Replace resume":"Upload resume"}</strong><span>PDF only · Maximum 5 MB · Optional</span></label>{file&&<div className="selected-resume"><FileText size={17}/><div><strong>{file.name}</strong><small>{(file.size/1024/1024).toFixed(2)} MB</small></div><button type="button" aria-label="Remove selected resume" onClick={()=>onChange(undefined)}><Trash2 size={15}/></button></div>}{error&&<p role="alert" className="field-error">{error}</p>}{progress!==null&&<div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${progress}%`}}/></div>}</div>;
}
