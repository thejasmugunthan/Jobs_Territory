import { useCallback, useEffect, useState, type DragEvent } from "react";
import {
  FileSearch,
  FileUp,
  ExternalLink,
  Trash2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  Briefcase,
  GraduationCap,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  UploadCloud,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "../../services/api";
import { profileService } from "../profile/services/profile.service";

interface Resume {
  resume_id: string;
  filename: string;
  status: string;
  is_current?: boolean;
  uploaded_at?: string;
}

interface SkillItem {
  name: string;
  category: string;
  confidence: number;
  evidence: string;
}

interface EducationItem {
  degree: string;
  institution: string | null;
  field_of_study: string | null;
  graduation_year: number | null;
  confidence: number;
}

interface ExperienceItem {
  job_title: string;
  company: string | null;
  date_range: string;
  responsibilities: string[];
  confidence: number;
}

interface ProjectItem {
  title: string;
  description: string | null;
  technologies: string[];
}

interface CertificationItem {
  name: string;
}

interface Analysis {
  version: number;
  skills: SkillItem[];
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  suggestions: string[];
}

export default function ResumeAnalyzerPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selected, setSelected] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmedSkills, setConfirmedSkills] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: Resume[] }>("/api/v1/resumes");
      setResumes(data.data);
      const current = data.data.find((x) => x.is_current) ?? data.data[0];
      if (current && !selected) setSelected(current.resume_id);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedResume = resumes.find((x) => x.resume_id === selected);

  const refreshAnalysis = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/v1/resumes/${selected}/analysis`);
      setAnalysis(data.analysis);
      setPreview(data.preview_url);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [selected, load]);

  useEffect(() => {
    if (!selected) return;
    void refreshAnalysis();
    // Poll while processing
    if (selectedResume?.status === "processing" || selectedResume?.status === "uploaded") {
      const timer = window.setInterval(() => void refreshAnalysis(), 3000);
      return () => window.clearInterval(timer);
    }
  }, [selected, selectedResume?.status, refreshAnalysis]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume file must be 5 MB or smaller.");
      return;
    }
    const body = new FormData();
    body.append("resume", file);
    setBusy(true);
    try {
      const { data } = await api.post("/api/v1/resumes/upload", body, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      toast.success("Resume uploaded. Analysis has started.");
      await load();
      setSelected(data.resume_id);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Resume upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!selected) return;
    try {
      await api.post(`/api/v1/resumes/${selected}/retry`);
      toast.success("Analysis restarted.");
      await refreshAnalysis();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm("Are you sure you want to delete this resume and its analysis?")) return;
    try {
      await api.delete(`/api/v1/resumes/${selected}`);
      setAnalysis(null);
      setPreview("");
      setSelected("");
      toast.success("Resume and analysis deleted.");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const confirmSkill = async (name: string) => {
    try {
      const candidates = await profileService.skills.search(name);
      const match = candidates.find(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      );
      if (!match) {
        toast.error(`${name} is not in the verified skill catalog. Add it manually from your profile.`);
        return;
      }
      await profileService.skills.add(match.id, "intermediate");
      setConfirmedSkills((old) => [...old, name]);
      toast.success(`${name} added to your confirmed profile skills.`);
    } catch (e) {
      toast.error(getApiErrorMessage(e, `Could not add ${name} to your profile.`));
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) {
      void upload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="content-stack space-y-7">
      {/* Header */}
      <div className="page-intro">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6C3BEB] dark:text-purple-400 mb-1">
              <Sparkles size={14} />
              <span>AI RESUME INTELLIGENCE</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl flex items-center gap-3">
              Resume Analyzer & Skills Extractor
              {resumes.length > 0 && <span className="count-pill">{resumes.length}</span>}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Extract verified technical skills, career history, and education credentials from your PDF resume. Review evidence before adding skills to your official profile.
            </p>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors self-start sm:self-auto"
          >
            <span>Candidate Profile</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Top Overview Cards (When Analysis Exists) */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Analysis Status</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 size={16} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">Ready</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Version {analysis.version} processed</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Extracted Skills</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-[#6C3BEB] dark:bg-purple-950/40 dark:text-purple-400">
                <Sparkles size={16} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {analysis.skills.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Identified with evidence</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Experience Roles</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Briefcase size={16} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {analysis.experience.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Positions detected</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Education Credentials</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <GraduationCap size={16} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {analysis.education.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Academic records</p>
          </div>
        </div>
      )}

      {/* Upload Zone & Resume History Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Upload Card */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upload New Resume Document
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accepts PDF format (up to 5 MB). Text-based PDFs will be analyzed automatically.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all cursor-pointer self-start sm:self-auto">
              <FileUp size={16} />
              <span>{busy ? "Uploading & Analyzing..." : "Choose PDF"}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                hidden
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {/* Drag & Drop Target */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              dragging
                ? "border-[#6C3BEB] bg-purple-50/50 dark:bg-purple-950/20"
                : "border-slate-200 hover:border-purple-300 dark:border-slate-800 dark:hover:border-purple-800 bg-slate-50/50 dark:bg-slate-800/40"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-[#6C3BEB] dark:bg-slate-800 dark:text-purple-400 mb-3">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Drag and drop your PDF resume here, or browse files
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PDF documents with selectable text are supported · Up to 5 MB
            </p>
          </div>
        </div>

        {/* Resume History Card */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Resume Versions
            </h3>
            <span className="text-xs text-slate-400">{resumes.length} saved</span>
          </div>

          {resumes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">
              No resumes uploaded yet. Upload your first PDF to generate skills and analysis.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {resumes.map((r) => {
                const isCurrent = r.resume_id === selected;
                return (
                  <button
                    key={r.resume_id}
                    type="button"
                    onClick={() => setSelected(r.resume_id)}
                    className={`w-full text-left rounded-xl p-3 border transition-all ${
                      isCurrent
                        ? "border-[#6C3BEB] bg-purple-50/60 ring-1 ring-[#6C3BEB] dark:bg-purple-950/30 dark:border-purple-600"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate max-w-[170px]">
                        {r.filename}
                      </span>
                      {r.is_current && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-[#6C3BEB] dark:bg-purple-900/50 dark:text-purple-300">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="capitalize">{r.status.replace(/_/g, " ")}</span>
                      {r.uploaded_at && (
                        <span>
                          {new Intl.DateTimeFormat(undefined, { dateStyle: "short" }).format(
                            new Date(r.uploaded_at)
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Resume Status Bar */}
      {selectedResume && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#6C3BEB] dark:bg-slate-800 dark:text-purple-400">
                <FileSearch size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedResume.filename}
                  </h4>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {selectedResume.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedResume.status === "needs_ocr"
                    ? "This PDF does not contain selectable text. Scanned resumes require OCR processing."
                    : selectedResume.status === "processing"
                    ? "Analysis is currently processing in the background..."
                    : "Extracted machine findings ready for candidate review."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                onClick={() => void refreshAnalysis()}
                disabled={loading}
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>

              {preview && (
                <a
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                  target="_blank"
                  rel="noreferrer"
                  href={preview}
                >
                  <span>Review PDF</span>
                  <ExternalLink size={13} />
                </a>
              )}

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                onClick={() => void remove()}
                aria-label="Delete resume"
                title="Delete resume"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {["failed", "malformed_pdf", "encrypted_pdf", "too_many_pages", "empty_pdf"].includes(
            selectedResume.status
          ) && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertTriangle size={15} />
                <span>Processing encountered an issue. You can re-attempt analysis.</span>
              </div>
              <button
                type="button"
                onClick={() => void retry()}
                className="rounded-xl bg-[#6C3BEB] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#5426C9] transition-colors"
              >
                Retry Analysis
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !analysis && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex justify-center">
            <RefreshCw size={24} className="animate-spin text-[#6C3BEB]" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Analyzing resume content and parsing career milestones...
          </p>
          <p className="text-xs text-slate-400">This usually takes between 3 to 10 seconds.</p>
        </div>
      )}

      {/* Detailed Analysis Results */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Skills, Experience, Education (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Extracted Skills Section */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={17} className="text-[#6C3BEB]" />
                    Extracted Skills & Competencies
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Extracted from resume keywords and context. Click to confirm into your official profile.
                  </p>
                </div>
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-[#6C3BEB] dark:bg-purple-950/40 dark:text-purple-300">
                  {analysis.skills.length} skills found
                </span>
              </div>

              {analysis.skills.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No skills reliably identified in this resume text.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.skills.map((skill, i) => {
                    const isConfirmed = confirmedSkills.includes(skill.name);
                    const pct = Math.round(skill.confidence * 100);
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {skill.name}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                              {skill.category || "Skill"}
                            </span>
                          </div>
                          {skill.evidence && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 mb-2">
                              "{skill.evidence}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 mt-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span>{pct}%</span>
                          </div>

                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={13} /> Added to Profile
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void confirmSkill(skill.name)}
                              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 transition-colors"
                            >
                              <span>+ Add to Profile</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Work Experience Section */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase size={17} className="text-[#6C3BEB]" />
                    Extracted Work Experience
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Roles and responsibilities identified in this resume.
                  </p>
                </div>
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-[#6C3BEB] dark:bg-purple-950/40 dark:text-purple-300">
                  {analysis.experience.length} roles
                </span>
              </div>

              {analysis.experience.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No work experience entries reliably identified.</p>
              ) : (
                <div className="space-y-4">
                  {analysis.experience.map((exp, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {exp.job_title}
                          </h4>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {exp.company || "Company not specified"}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={12} />
                          {exp.date_range}
                        </span>
                      </div>

                      {exp.responsibilities && exp.responsibilities.length > 0 && (
                        <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-slate-600 dark:text-slate-300">
                          {exp.responsibilities.map((resp, rIdx) => (
                            <li key={rIdx}>{resp}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Education Section */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap size={18} className="text-[#6C3BEB]" />
                    Education & Credentials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Degrees and institutions identified in your document.
                  </p>
                </div>
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-[#6C3BEB] dark:bg-purple-950/40 dark:text-purple-300">
                  {analysis.education.length} records
                </span>
              </div>

              {analysis.education.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No academic credentials identified.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.education.map((edu, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {edu.degree}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {edu.institution || "Institution not specified"}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-400">
                        <span>{edu.field_of_study || "Field unspecified"}</span>
                        <span>{edu.graduation_year || "Graduation Year N/A"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Suggestions & Next Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI Improvement Suggestions */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Lightbulb size={17} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Optimization Recommendations
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tips to improve ATS readability & score
                  </p>
                </div>
              </div>

              {analysis.suggestions.length === 0 ? (
                <p className="text-xs text-slate-400">No suggestions identified for this resume.</p>
              ) : (
                <div className="space-y-2.5">
                  {analysis.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
                    >
                      • {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Sync Guide */}
            <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50 to-indigo-50/40 p-6 shadow-sm dark:border-purple-900/50 dark:bg-gradient-to-br dark:from-purple-950/30 dark:to-indigo-950/20">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#6C3BEB]" />
                Profile Synchronization
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Extracted skills and experience are not automatically committed to your profile. Review each item and click <strong>Add to Profile</strong> to ensure only accurate, verified data is used for job matching.
              </p>
              <Link
                to="/profile"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all"
              >
                <span>Open Candidate Profile</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
