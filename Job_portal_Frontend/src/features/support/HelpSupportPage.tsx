import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  Search,
  User,
  BriefcaseBusiness,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "../../services/api";

interface FAQItem {
  id: string;
  category: "account" | "jobs" | "resume" | "applications";
  categoryLabel: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  // 1. Account Help
  {
    id: "acc-1",
    category: "account",
    categoryLabel: "Account Help",
    question: "How do I register a new candidate account?",
    answer:
      "Click 'Register' on the top navigation. Enter your full name, a valid email address, and a secure password (minimum 8 characters). Once submitted, your candidate profile workspace is immediately initialized.",
  },
  {
    id: "acc-2",
    category: "account",
    categoryLabel: "Account Help",
    question: "How do I sign in or recover my password?",
    answer:
      "Sign in with your registered email and password. If you forgot your password, click 'Forgot password' on the login screen to request a reset link. You can also update your password anytime under Settings > Security.",
  },
  {
    id: "acc-3",
    category: "account",
    categoryLabel: "Account Help",
    question: "How do I manage my candidate profile details?",
    answer:
      "Navigate to 'My Profile' in the sidebar. You can manage your professional headline, summary, location, total years of experience, education records, work history, projects, certifications, and skills.",
  },
  {
    id: "acc-4",
    category: "account",
    categoryLabel: "Account Help",
    question: "How do I control recruiter visibility?",
    answer:
      "Under Settings > Profile Visibility, you can choose whether your profile appears in recruiter candidate searches, whether your contact info is visible, and whether recruiters can see that you have a resume on file.",
  },

  // 2. Job Search Help
  {
    id: "job-1",
    category: "jobs",
    categoryLabel: "Job Search Help",
    question: "How do I search and filter for jobs?",
    answer:
      "Visit 'Job Listings' in the sidebar or use the Global Search bar in the top navigation. You can filter openings by keyword, location, employment type (full-time, contract, internship), work mode (remote, hybrid, on-site), experience range, salary, and required skills.",
  },
  {
    id: "job-2",
    category: "jobs",
    categoryLabel: "Job Search Help",
    question: "How do I apply for a job?",
    answer:
      "Open any active job details page and click 'Apply Now'. You can submit with your current candidate profile and uploaded resume, along with an optional cover letter highlighting your background.",
  },
  {
    id: "job-3",
    category: "jobs",
    categoryLabel: "Job Search Help",
    question: "How does saving jobs work?",
    answer:
      "Click the bookmark icon on any job card to save it to your 'Saved Jobs' list for easy reference later. Saved jobs persist in your account until you remove them or the job closes.",
  },
  {
    id: "job-4",
    category: "jobs",
    categoryLabel: "Job Search Help",
    question: "How do I compare multiple jobs side-by-side?",
    answer:
      "Click 'Compare' on any job card or job details page. You can add up to 4 active jobs to your comparison matrix under 'Compare Jobs' to evaluate salary, requirements, skills, and work modes side by side.",
  },

  // 3. Resume Help
  {
    id: "res-1",
    category: "resume",
    categoryLabel: "Resume Help",
    question: "How do I upload my resume?",
    answer:
      "Go to 'My Profile' or 'Resume Analyzer' and select your resume file. We support PDF, DOCX, and TXT files up to 5 MB. Your resume is securely stored in cloud storage.",
  },
  {
    id: "res-2",
    category: "resume",
    categoryLabel: "Resume Help",
    question: "How does automated resume analysis work?",
    answer:
      "Once uploaded, our background analyzer extracts key sections including skills, education credentials, previous work history, projects, and certifications to help accelerate profile completion.",
  },
  {
    id: "res-3",
    category: "resume",
    categoryLabel: "Resume Help",
    question: "How does job matching and compatibility work?",
    answer:
      "Our matching algorithm compares your verified skills, experience level, and preferred job attributes with published job requirements to generate a compatibility percentage and breakdown.",
  },

  // 4. Application Help
  {
    id: "app-1",
    category: "applications",
    categoryLabel: "Application Help",
    question: "Where can I track my submitted applications?",
    answer:
      "Visit 'My Applications' in the sidebar to review all applications, their current status (Submitted, Under Review, Shortlisted, Interview, Selected, Rejected, Withdrawn), and timeline events.",
  },
  {
    id: "app-2",
    category: "applications",
    categoryLabel: "Application Help",
    question: "What does shortlisting mean?",
    answer:
      "When a recruiter updates your status to 'Shortlisted', your application has passed the preliminary screening and is being considered for interview scheduling or further evaluation.",
  },
  {
    id: "app-3",
    category: "applications",
    categoryLabel: "Application Help",
    question: "How do in-app notifications and job alerts work?",
    answer:
      "You receive instant in-app notifications when an employer changes your application status or schedules an interview. Active job alerts also notify you when matching jobs are posted.",
  },
  {
    id: "app-4",
    category: "applications",
    categoryLabel: "Application Help",
    question: "What is Application Insights?",
    answer:
      "Located at 'Application Insights', this analytics dashboard visualizes your submission trends, status distribution, weekly cadence, and calculates your historical Shortlist Rate and Offer Rate.",
  },
];

type CategoryFilter = "all" | "account" | "jobs" | "resume" | "applications";

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  // Support request form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<
    "account" | "jobs" | "applications" | "resume" | "technical" | "other"
  >("account");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQS.filter((faq) => {
      const matchesCategory =
        activeCategory === "all" || faq.category === activeCategory;
      const matchesQuery =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.categoryLabel.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, activeCategory]);

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 5) {
      toast.error("Subject must be at least 5 characters long.");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Description must be at least 20 characters long.");
      return;
    }

    setSubmitting(true);
    setSubmittedStatus(null);

    try {
      const { data } = await api.post("/api/v1/support/requests", {
        subject: subject.trim(),
        category,
        description: description.trim(),
      });
      setSubmittedStatus(data.status || "received");
      setSubject("");
      setDescription("");
      toast.success(
        `Support request submitted successfully (Status: ${data.status || "received"}).`
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content-stack space-y-8 max-w-4xl mx-auto pb-12">
      {/* 1. Help Center Header & Intro */}
      <header className="page-intro">
        <span className="eyebrow">CANDIDATE ASSISTANCE</span>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          Help &amp; Support
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Find answers to common questions regarding account management, job search, resume tools, and applications.
        </p>
      </header>

      {/* 2. Search Articles */}
      <section className="card p-6 md:p-8 space-y-4" aria-label="Search help center">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Search Knowledge Base
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type keywords to locate relevant answers across all help topics
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles…"
              className="field-input h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {(
            [
              { key: "all", label: "All Topics", icon: HelpCircle },
              { key: "account", label: "Account Help", icon: User },
              { key: "jobs", label: "Job Search", icon: BriefcaseBusiness },
              { key: "resume", label: "Resume & Matching", icon: FileText },
              { key: "applications", label: "Applications & Insights", icon: Clock },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === key
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Frequently Asked Questions List */}
      <section className="space-y-4" aria-label="Frequently Asked Questions">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Frequently Asked Questions ({filteredFaqs.length})
          </h3>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Clear search
            </button>
          )}
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <HelpCircle size={32} className="mx-auto text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              No help articles matched &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try searching with broader keywords or submit a support inquiry below.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => (
              <details
                key={faq.id}
                className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all open:shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold text-slate-900 dark:text-white list-none">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 uppercase tracking-wider">
                      {faq.categoryLabel}
                    </span>
                    <span>{faq.question}</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className="text-slate-400 transition-transform group-open:rotate-180 flex-shrink-0"
                  />
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 pl-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* 4. Contact Support Request Form */}
      <section className="card p-6 md:p-8 space-y-6" aria-labelledby="contact-support-heading">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 id="contact-support-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Contact Support
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Need assistance with an issue not covered above? Submit a ticket directly to our support log.
            </p>
          </div>
          <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            Database Logged
          </span>
        </div>

        {submittedStatus && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Support request recorded successfully</p>
              <p className="mt-0.5">
                Your request has been stored with status &ldquo;{submittedStatus}&rdquo;. Our administrative team reviews support entries during standard operating hours. No outbound email has been dispatched.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitSupport} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Subject
              </label>
              <input
                type="text"
                required
                minLength={5}
                maxLength={160}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your question or issue"
                className="field-input h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <span className="mt-1 block text-[10px] text-slate-400">
                {subject.length}/160 characters (min 5)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as
                      | "account"
                      | "jobs"
                      | "applications"
                      | "resume"
                      | "technical"
                      | "other"
                  )
                }
                className="field-input h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="account">Account &amp; Login</option>
                <option value="jobs">Job Search &amp; Listings</option>
                <option value="applications">Applications &amp; Tracking</option>
                <option value="resume">Resume Upload &amp; Analysis</option>
                <option value="technical">Technical Issue</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              required
              minLength={20}
              maxLength={5000}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide relevant details about your question, steps taken, or error messages encountered…"
              className="field-input w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
            <span className="mt-1 block text-[10px] text-slate-400">
              {description.length}/5000 characters (min 20)
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting || subject.length < 5 || description.length < 20}
              className="button button-primary inline-flex items-center gap-2 text-xs"
            >
              <Send size={14} />
              <span>{submitting ? "Submitting request…" : "Submit Support Request"}</span>
            </button>
            <p className="text-[11px] text-slate-400">
              Rate limited to 5 requests per hour.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
