import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2, ArrowRight, Building2, MapPin } from "lucide-react";
import { api } from "../../services/api";

interface JobSuggestion {
  job_id: string;
  title: string;
  company: string;
  location?: string;
  employment_type?: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced query fetching
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setTotalMatches(0);
      setLoading(false);
      setError(false);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(false);
    setIsOpen(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      api
        .get(`/api/v1/search/jobs?q=${encodeURIComponent(trimmed)}&limit=6`, {
          signal: controller.signal,
        })
        .then(({ data }) => {
          setSuggestions(data.items || []);
          setTotalMatches(data.pagination?.total_items || data.items?.length || 0);
          setLoading(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setError(true);
            setLoading(false);
            setSuggestions([]);
          }
        });
    }, 280);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      navigate(`/jobs/${suggestions[activeIndex].job_id}`);
      setIsOpen(false);
      setQuery("");
    } else {
      const trimmed = query.trim();
      setIsOpen(false);
      navigate(trimmed ? `/jobs?q=${encodeURIComponent(trimmed)}` : "/jobs");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true);
      } else if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} role="search" className="top-search relative flex items-center">
        <label htmlFor="global-job-search-input" className="sr-only">
          Search jobs, companies, skills
        </label>
        <span className="pointer-events-none absolute left-3 text-slate-400 dark:text-slate-500">
          <Search size={16} />
        </span>

        <input
          id="global-job-search-input"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0 && query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search jobs, skills, companies…"
          aria-label="Search jobs, skills, companies"
          aria-autocomplete="list"
          aria-controls="global-search-dropdown"
          aria-expanded={isOpen}
          autoComplete="off"
          className="field-input h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-14 text-xs text-slate-900 transition-colors focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-purple-400"
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {loading && <Loader2 size={14} className="animate-spin text-purple-600 dark:text-purple-400" />}

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          <kbd className="hidden sm:inline-block rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            ↵
          </kbd>
        </div>
      </form>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div
          id="global-search-dropdown"
          role="listbox"
          className="global-search-results absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          {loading && (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 size={13} className="animate-spin text-purple-600" />
              <span>Searching open positions…</span>
            </div>
          )}

          {!loading && error && (
            <div className="p-3 text-xs text-red-600 dark:text-red-400">
              Search is temporarily unavailable. Press Enter to view all jobs.
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                No matching jobs found
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Try searching for titles, skills (e.g. &ldquo;Python&rdquo;, &ldquo;React&rdquo;), or companies.
              </p>
            </div>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <>
              <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:border-slate-800 dark:text-slate-500">
                {totalMatches} {totalMatches === 1 ? "match found" : "matches found"}
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {suggestions.map((item, index) => {
                  const isSelected = index === activeIndex;
                  return (
                    <button
                      type="button"
                      key={item.job_id}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery("");
                        navigate(`/jobs/${item.job_id}`);
                      }}
                      className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-purple-50 text-purple-900 dark:bg-purple-950/50 dark:text-purple-200"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 truncate font-medium">
                            <Building2 size={12} className="flex-shrink-0" />
                            {item.company}
                          </span>
                          {item.location && (
                            <span className="flex items-center gap-0.5 truncate text-slate-400">
                              <MapPin size={11} className="flex-shrink-0" />
                              {item.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-slate-300 dark:text-slate-600">
                        <ArrowRight size={13} />
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleSubmit()}
                className="flex w-full items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] font-semibold text-purple-700 hover:bg-purple-100/50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-purple-300 dark:hover:bg-slate-800 transition-colors"
              >
                <span>View all results for &ldquo;{query.trim()}&rdquo;</span>
                <ArrowRight size={12} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
