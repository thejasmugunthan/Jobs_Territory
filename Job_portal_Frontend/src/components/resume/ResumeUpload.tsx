import { useRef, useState, type DragEvent } from "react";
import { FileCheck2, FileText, FolderOpen, UploadCloud, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "../../services/api";

const MAX_BYTES = 5 * 1024 * 1024;
const VALID_EXTENSION = /\.(pdf|doc|docx|rtf)$/i;

export function ResumeUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const acceptFile = (file?: File) => {
    if (!file) return;
    if (!VALID_EXTENSION.test(file.name)) {
      toast.error("Choose a PDF, DOC, DOCX, or RTF file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Your resume must be 5 MB or smaller.");
      return;
    }
    setSelectedFile(file);
    setSelectedName(file.name);
    setUploaded(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Resume analysis currently supports PDF format. Please choose a PDF file.");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("resume", selectedFile);
    try {
      await api.post("/api/v1/resumes/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploaded(true);
      toast.success("Resume uploaded successfully! Analysis has started.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Resume upload failed."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="resume-upload-section">
      <div className="section-heading">
        <div>
          <h2>Resume</h2>
          <p>Your resume is a helpful introduction. Keep it clear, current, and easy to read.</p>
        </div>
        <Link to="/resume-analyzer" className="inline-action text-xs font-semibold">
          <span>Open Analyzer</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      <div
        className={`resume-dropzone ${dragging ? "resume-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".pdf,.doc,.docx,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf"
          onChange={(event) => acceptFile(event.target.files?.[0])}
          aria-label="Choose a resume file"
        />
        <div className="upload-icon">
          <UploadCloud size={25} />
        </div>
        <p className="drop-title">
          {selectedName ? "Resume selected on this device" : "Drag your resume here, or browse files"}
        </p>

        {selectedName && (
          <div className="selected-file">
            <FileCheck2 size={16} />
            <span>{selectedName}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
          <button
            type="button"
            className="button button-outline upload-browse"
            onClick={() => inputRef.current?.click()}
          >
            <FolderOpen size={16} /> Choose a file
          </button>

          {selectedFile && !uploaded && (
            <button
              type="button"
              className="button button-primary"
              disabled={uploading}
              onClick={handleUpload}
            >
              {uploading ? "Uploading..." : "Upload & Analyze Resume"}
            </button>
          )}

          {uploaded && (
            <Link to="/resume-analyzer" className="button button-secondary text-xs">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>View Analysis</span>
            </Link>
          )}
        </div>

        <p className="supported-formats mt-3">
          Supported formats: PDF, DOC, DOCX, RTF <span>·</span> Up to 5 MB
        </p>

        <p className="upload-notice" role="status">
          {uploaded
            ? "Resume document uploaded securely to your profile."
            : "File selection is local only. Resume storage is not connected, so nothing has been uploaded."}
        </p>
      </div>

      <div className="resume-builder-callout">
        <span className="builder-illustration">
          <FileText size={28} />
        </span>
        <div>
          <strong>Don’t have a resume yet?</strong>
          <p>Use your profile details to prepare the next version of your story.</p>
        </div>
        <span className="builder-note">Resume builder coming later</span>
      </div>
    </section>
  );
}
