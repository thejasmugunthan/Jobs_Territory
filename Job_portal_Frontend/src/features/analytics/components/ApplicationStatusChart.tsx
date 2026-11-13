import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { StatusDistributionItem } from "../analytics.service";

interface ApplicationStatusChartProps {
  data: StatusDistributionItem[];
}

const STATUS_COLORS: Record<string, string> = {
  applied: "#6d3df5", // purple
  under_review: "#3b82f6", // blue
  shortlisted: "#10b981", // green
  interview_scheduled: "#f59e0b", // amber
  selected: "#059669", // emerald
  rejected: "#ef4444", // red
  withdrawn: "#94a3b8", // slate
};

export const ApplicationStatusChart: React.FC<ApplicationStatusChartProps> = ({
  data,
}) => {
  const activeItems = data.filter((item) => item.count > 0);
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0 || activeItems.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-800">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          No status distribution data available.
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Once you submit applications, their distribution will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center">
      <div className="relative h-60 w-60 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeItems}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
            >
              {activeItems.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] || "#8b5cf6"}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as StatusDistributionItem;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {item.count} {item.count === 1 ? "application" : "applications"} ({item.percentage}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label in donut */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {total}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Total
          </span>
        </div>
      </div>

      {/* Accessible Legend */}
      <div className="w-full flex-1">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list">
          {data.map((item) => {
            const color = STATUS_COLORS[item.status] || "#8b5cf6";
            return (
              <li
                key={item.status}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs dark:border-slate-800/80 dark:bg-slate-900/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-right">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {item.count}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({item.percentage}%)
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

