import { useState, useMemo } from "react";
import {
  Bookmark,
  BriefcaseBusiness,
  Search,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../../components/common/EmptyState";
import { JobPagination } from "../components/JobPagination";
import { SavedJobCard } from "../components/SavedJobCard";
import { useSavedJobs } from "../hooks/useSavedJobs";

export default function SavedJobsPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const { data, loading, error, retry } = useSavedJobs(page, sort);

  const items = data?.items ?? [];

  // Filter items by client search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.job?.title.toLowerCase().includes(q) ||
        item.job?.company.name.toLowerCase().includes(q) ||
        item.job?.skills.some((s) => s.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Metrics
  const totalCount = data?.pagination.total_items ?? items.length;
  const activeCount = items.filter((i) => i.is_available).length;
  const remoteCount = items.filter(
    (i) => i.job?.work_mode?.toLowerCase() === "remote"
  ).length;

  return (
    <div className="content-stack space-y-7">
      {/* Header */}
      <div className="page-intro">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6C3BEB] dark:text-purple-400 mb-1">
              <Bookmark size={14} />
              <span>SAVED OPPORTUNITIES</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl flex items-center gap-3">
              Saved Jobs
              {!loading && <span className="count-pill">{totalCount}</span>}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Keep your preferred roles and target employers in one place. Return to them when you are ready to tailor your application.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all self-start sm:self-auto"
          >
            <BriefcaseBusiness size={15} />
            <span>Explore Jobs</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row (When items exist) */}
      {!loading && totalCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Bookmarked</span>
            <div className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white">{totalCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Saved across all positions</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Openings</span>
            <div className="mt-1.5 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Accepting candidate applications</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remote Roles</span>
            <div className="mt-1.5 text-2xl font-extrabold text-[#6C3BEB] dark:text-purple-400">{remoteCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Work from anywhere positions</p>
          </div>
        </div>
      )}

      {/* Toolbar: Search & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search within saved jobs */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter saved jobs by title, company, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#6C3BEB] focus:outline-none focus:ring-1 focus:ring-[#6C3BEB] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sort by:</span>
          <select
            aria-label="Sort saved jobs"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#6C3BEB] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="latest">Recently Saved</option>
            <option value="oldest">Oldest Saved</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse space-y-3"
            >
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={<Search size={24} />}
            title="Saved jobs could not be loaded"
            description={error}
            action={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20"
                onClick={retry}
              >
                <span>Try Again</span>
              </button>
            }
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={<Bookmark size={32} className="text-[#6C3BEB]" />}
            title={searchQuery ? "No matching saved jobs found" : "No saved jobs yet"}
            description={
              searchQuery
                ? `No saved positions matched "${searchQuery}". Try a different keyword.`
                : "When you find roles you want to bookmark, click the bookmark icon on any job card to save it here for quick access."
            }
            action={
              searchQuery ? (
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:text-[#6C3BEB] dark:border-slate-800 dark:text-slate-300"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </button>
              ) : (
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3BEB] to-[#5426C9] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:from-[#5e32d1] hover:to-[#4a20b5] transition-all"
                >
                  <span>Explore Open Jobs</span>
                  <ArrowRight size={14} />
                </Link>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => (
              <SavedJobCard key={item.id} savedJob={item} onRemoved={retry} />
            ))}
          </div>

          {data?.pagination && (
            <div className="pt-4">
              <JobPagination pagination={data.pagination} onPage={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
