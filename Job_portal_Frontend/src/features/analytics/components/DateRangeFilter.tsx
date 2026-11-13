import React from "react";
import { Calendar, RotateCcw } from "lucide-react";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  period: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onQuickPreset: (days: number) => void;
  onReset: () => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  period,
  onStartDateChange,
  onEndDateChange,
  onPeriodChange,
  onQuickPreset,
  onReset,
}) => {
  return (
    <section className="card analytics-filters p-4 md:p-5">
      <div className="flex flex-col gap-4 w-full">
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Calendar size={15} className="text-purple-600 dark:text-purple-400" />
            <span>Range Presets:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onQuickPreset(30)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => onQuickPreset(90)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Last 90 Days
            </button>
            <button
              type="button"
              onClick={() => onQuickPreset(180)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Last 6 Months
            </button>
            <button
              type="button"
              onClick={() => onQuickPreset(365)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Last 1 Year
            </button>
            <button
              type="button"
              onClick={onReset}
              title="Reset to default 90-day range"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Interval</span>
            <select
              className="field-input h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              aria-label="Trend interval"
            >
              <option value="daily">Daily View</option>
              <option value="weekly">Weekly View</option>
              <option value="monthly">Monthly View</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>From Date</span>
            <input
              className="field-input h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => onStartDateChange(e.target.value)}
              aria-label="Start date"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>To Date</span>
            <input
              className="field-input h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => onEndDateChange(e.target.value)}
              aria-label="End date"
            />
          </label>
        </div>
      </div>
    </section>
  );
};

