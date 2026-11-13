import { useRef, useState, type DragEvent } from "react";
import { FileCheck2, FileText, FolderOpen, UploadCloud } from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 2 * 1024 * 1024;
const VALID_EXTENSION = /\.(pdf|doc|docx|rtf)$/i;

export function ResumeUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState("");
  const [dragging, setDragging] = useState(false);
  const acceptFile = (file?: File) => {
    if (!file) return;
    if (!VALID_EXTENSION.test(file.name)) {
      toast.error("Choose a PDF, DOC, DOCX, or RTF file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Your resume must be 2 MB or smaller.");
      return;
    }
    setSelectedName(file.name);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  };
  return <section className="resume-upload-section">
    <div className="section-heading"><div><h2>Resume</h2><p>Your resume is a helpful introduction. Keep it clear, current, and easy to read.</p></div></div>
    <div className={`resume-dropzone ${dragging ? "resume-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.doc,.docx,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf" onChange={(event) => acceptFile(event.target.files?.[0])} aria-label="Choose a resume file" />
      <div className="upload-icon"><UploadCloud size={25} /></div>
      <p className="drop-title">{selectedName ? "Resume selected on this device" : "Drag your resume here, or browse files"}</p>
      {selectedName && <div className="selected-file"><FileCheck2 size={16} /><span>{selectedName}</span></div>}
      <button type="button" className="button button-outline upload-browse" onClick={() => inputRef.current?.click()}><FolderOpen size={16} /> Choose a file</button>
      <p className="supported-formats">Supported formats: PDF, DOC, DOCX, RTF <span>·</span> Up to 2 MB</p>
      <p className="upload-notice" role="status">File selection is local only. Resume storage is not connected, so nothing has been uploaded.</p>
    </div>
    <div className="resume-builder-callout"><span className="builder-illustration"><FileText size={28} /></span><div><strong>Don’t have a resume yet?</strong><p>Use your profile details to prepare the next version of your story.</p></div><span className="builder-note">Resume builder coming later</span></div>
  </section>;
}
