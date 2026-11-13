import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { WeeklyActivityItem } from "../analytics.service";

interface WeeklyActivityChartProps {
  data: WeeklyActivityItem[];
}

export const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-800">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          No weekly activity recorded in this period.
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Applications submitted will be summarized by calendar week (Monday to Sunday).
        </p>
      </div>
    );
  }

  // Format tick labels
  const formatTick = (value: string, index: number) => {
    if (!value) return "";
    const total = data.length;
    const step = Math.ceil(total / 8);
    if (index % step === 0 || index === total - 1) {
      return value.slice(5); // MM-DD
    }
    return "";
  };

  return (
    <div className="h-72 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            className="dark:stroke-slate-800"
          />
          <XAxis
            dataKey="week_start"
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-slate-500 dark:text-slate-400"
            stroke="currentColor"
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-slate-500 dark:text-slate-400"
            stroke="currentColor"
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as WeeklyActivityItem;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {item.label || `${item.week_start} to ${item.week_end}`}
                    </p>
                    <p className="mt-1 text-xs font-bold text-purple-600 dark:text-purple-400">
                      {item.count} {item.count === 1 ? "application" : "applications"}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="count"
            name="Applications"
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

