import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, Briefcase, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";

export interface DashboardApplication {
  application_id: string;
  job_id: string;
  title: string;
  company: string;
  company_logo?: string;
  location?: string;
  applied_at: string;
  status: string;
  employment_type?: string;
  salary_range?: string;
}

interface ApplicationStatusTableProps {
  applications: DashboardApplication[];
  loading?: boolean;
  onViewDetails?: (appId: string) => void;
}

export function ApplicationStatusTable({
  applications,
  loading = false,
  onViewDetails,
}: ApplicationStatusTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.company.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === "all") return true;

      const norm = app.status.toLowerCase().replace(/\s+/g, "_");
      if (statusFilter === "in_progress") {
        return norm === "applied" || norm === "under_review";
      }
      if (statusFilter === "interview") {
        return norm === "interview_scheduled" || norm === "interview";
      }
      if (statusFilter === "accepted") {
        return norm === "selected" || norm === "accepted";
      }
      if (statusFilter === "rejected") {
        return norm === "rejected";
      }
      return norm === statusFilter;
    });
  }, [applications, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedApplications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedApplications.map((a) => a.application_id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-8 w-44 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Latest Application Status
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time status updates across active submissions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative min-w-[180px] sm:w-52">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-[#6C3BEB] focus:bg-white focus:ring-2 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-purple-950"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="interview">Interview</option>
              <option value="accepted">Accepted / Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table container */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    paginatedApplications.length > 0 &&
                    selectedIds.length === paginatedApplications.length
                  }
                  onChange={toggleSelectAll}
                  aria-label="Select all applications"
                  className="rounded border-slate-300 text-[#6C3BEB] focus:ring-purple-500 accent-[#6C3BEB]"
                />
              </th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Job Position</th>
              <th className="px-4 py-3">Application Status</th>
              <th className="px-4 py-3">Applied Date</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedApplications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 mb-2">
                    <Briefcase size={22} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No matching applications found
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Try adjusting your search query or status filter, or explore new jobs.
                  </p>
                  <Link
                    to="/jobs"
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-[#6C3BEB] hover:bg-purple-100 transition-colors dark:bg-purple-950/40 dark:text-purple-300"
                  >
                    Browse Jobs
                  </Link>
                </td>
              </tr>
            ) : (
              paginatedApplications.map((app) => (
                <tr
                  key={app.application_id}
                  className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(app.application_id)}
                      onChange={() => toggleSelectOne(app.application_id)}
                      aria-label={`Select ${app.title}`}
                      className="rounded border-slate-300 text-[#6C3BEB] focus:ring-purple-500 accent-[#6C3BEB]"
                    />
                  </td>

                  {/* Company */}
                  <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2.5">
                      {app.company_logo ? (
                        <img
                          src={app.company_logo}
                          alt={app.company}
                          className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-[#6C3BEB] font-bold dark:bg-slate-800 dark:text-purple-300">
                          {app.company.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {app.company}
                        </div>
                        {app.location && (
                          <div className="text-[10px] text-slate-400">{app.location}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Job Position */}
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {app.title}
                    </div>
                    {app.employment_type && (
                      <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-500 capitalize">
                        {app.employment_type.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5">
                    <ApplicationStatusBadge status={app.status} />
                  </td>

                  {/* Applied Date */}
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-medium">
                    {formatDate(app.applied_at)}
                  </td>

                  {/* Action Menu */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewDetails ? (
                        <button
                          onClick={() => onViewDetails(app.application_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#6C3BEB] hover:text-[#6C3BEB] transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:text-purple-400"
                        >
                          <Eye size={13} />
                          Details
                        </button>
                      ) : (
                        <Link
                          to={`/applications/${app.application_id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#6C3BEB] hover:text-[#6C3BEB] transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:text-purple-400"
                        >
                          <Eye size={13} />
                          Details
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredApplications.length > pageSize && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredApplications.length)} of{" "}
            {filteredApplications.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-semibold text-slate-800 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
