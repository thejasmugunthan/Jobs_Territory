import { useEffect, useState, useCallback } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  XCircle,
  Trophy,
  TrendingUp,
  Percent,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../services/api";
import {
  analyticsService,
  type ApplicationAnalytics,
} from "./analytics.service";
import { AnalyticsStatCard } from "./components/AnalyticsStatCard";
import { DateRangeFilter } from "./components/DateRangeFilter";
import { ApplicationTrendChart } from "./components/ApplicationTrendChart";
import { ApplicationStatusChart } from "./components/ApplicationStatusChart";
import { WeeklyActivityChart } from "./components/WeeklyActivityChart";

export default function ApplicationInsightsPage() {
  const [data, setData] = useState<ApplicationAnalytics | null>(null);
  const [period, setPeriod] = useState<string>("weekly");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(
    (signal?: AbortSignal, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({ period });
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      analyticsService
        .applications(params, signal)
        .then((result) => {
          setData(result);
        })
        .catch((err) => {
          if (!signal?.aborted) {
            const msg = getApiErrorMessage(err);
            setError(msg);
            toast.error(msg);
          }
        })
        .finally(() => {
          if (!signal?.aborted) {
            setLoading(false);
            setRefreshing(false);
          }
        });
    },
    [period, startDate, endDate]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAnalytics(controller.signal);
    return () => controller.abort();
  }, [fetchAnalytics]);

  const handleQuickPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const endStr = end.toISOString().split("T")[0];
    const startStr = start.toISOString().split("T")[0];

    setStartDate(startStr);
    setEndDate(endStr);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setPeriod("weekly");
  };

  return (
    <div className="content-stack space-y-6">
      {/* Page Heading & Methodology Explanation */}
      <header className="page-intro">
        <span className="eyebrow">APPLICATION INTELLIGENCE</span>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          Application Insights
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track historical progress, response rates, and application activity over time.
        </p>
        <div className="mt-3 rounded-lg border border-purple-100 bg-purple-50/70 p-3 text-xs text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-300">
          <strong>Metric Definitions:</strong> Shortlist Rate = (Shortlisted ÷ Total Submitted) × 100. Offer Rate = (Selected ÷ Total Submitted) × 100. Withdrawn applications are excluded from submitted totals. These metrics measure historical application progress and are not estimates of future hiring probability.
        </div>
      </header>

      {/* Date Range & Interval Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        period={period}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onPeriodChange={setPeriod}
        onQuickPreset={handleQuickPreset}
        onReset={handleReset}
      />

      {/* Error State */}
      {error && !loading && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchAnalytics(undefined, false)}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold hover:bg-red-200 dark:bg-red-900/60 dark:hover:bg-red-900 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800"
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
            <div className="h-80 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
          </div>
        </div>
      )}

      {/* Content Dashboard */}
      {data && (
        <>
          {/* Refreshing Banner */}
          {refreshing && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 rounded-lg bg-purple-50 p-2 text-xs font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
            >
              <RefreshCw size={14} className="animate-spin" />
              <span>Updating application analytics…</span>
            </div>
          )}

          {/* Statistics Cards Grid */}
          <section aria-label="Application summary metrics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <AnalyticsStatCard
                label="Total Applications"
                value={data.total_applications}
                detail={`${data.submitted_applications} submitted, ${data.applications_by_status.withdrawn ?? 0} withdrawn`}
                icon={<BriefcaseBusiness size={20} />}
                tone="violet"
                hint="Total applications submitted by you in this date range"
              />
              <AnalyticsStatCard
                label="Shortlisted"
                value={data.shortlisted_count}
                detail="Review passed"
                icon={<CheckCircle2 size={20} />}
                tone="green"
                hint="Applications shortlisted for next steps"
              />
              <AnalyticsStatCard
                label="Rejected"
                value={data.rejected_count}
                detail="Not selected"
                icon={<XCircle size={20} />}
                tone="rose"
                hint="Applications closed without offer"
              />
              <AnalyticsStatCard
                label="Selected / Offers"
                value={data.selected_count}
                detail="Offers received"
                icon={<Trophy size={20} />}
                tone="amber"
                hint="Applications where you received a job offer"
              />
              <AnalyticsStatCard
                label="Shortlist Rate"
                value={`${data.shortlist_rate.percentage}%`}
                detail={`${data.shortlist_rate.numerator} of ${data.shortlist_rate.denominator} submitted`}
                icon={<TrendingUp size={20} />}
                tone="blue"
                hint="Shortlisted ÷ non-withdrawn submitted applications"
              />
              <AnalyticsStatCard
                label="Offer Rate"
                value={`${data.offer_rate.percentage}%`}
                detail={`${data.offer_rate.numerator} of ${data.offer_rate.denominator} submitted`}
                icon={<Percent size={20} />}
                tone="violet"
                hint="Selected ÷ non-withdrawn submitted applications"
              />
            </div>
          </section>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Application Trend */}
            <section className="card p-5 md:p-6" aria-label="Application submission trend">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Application Trend
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submissions grouped by {data.period} interval
                  </p>
                </div>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 capitalize">
                  {data.period}
                </span>
              </div>
              <ApplicationTrendChart data={data.trend} period={data.period} />
            </section>

            {/* Status Distribution */}
            <section className="card p-5 md:p-6" aria-label="Application status distribution">
              <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Status Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current status of applications in this date range
                </p>
              </div>
              <div className="pt-2">
                <ApplicationStatusChart data={data.status_distribution} />
              </div>
            </section>
          </div>

          {/* Weekly Activity */}
          <section className="card p-5 md:p-6" aria-label="Weekly application activity">
            <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Weekly Activity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Application count across calendar weeks (Monday through Sunday)
              </p>
            </div>
            <WeeklyActivityChart data={data.weekly_activity} />
          </section>
        </>
      )}
    </div>
  );
}
