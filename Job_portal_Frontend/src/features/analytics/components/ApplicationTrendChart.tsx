import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendItem } from "../analytics.service";

interface ApplicationTrendChartProps {
  data: TrendItem[];
  period: string;
}

export const ApplicationTrendChart: React.FC<ApplicationTrendChartProps> = ({
  data,
  period,
}) => {
  if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-800">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          No application activity in this date range.
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Applications submitted in this interval will appear on the trend line.
        </p>
      </div>
    );
  }

  // Format tick label for axis to prevent overlap
  const formatTick = (value: string, index: number) => {
    if (!value) return "";
    const total = data.length;
    // Show approx 6-8 ticks
    const step = Math.ceil(total / 8);
    if (index % step === 0 || index === total - 1) {
      if (period === "daily") {
        return value.slice(5); // MM-DD
      }
      return value.slice(0, 7); // YYYY-MM or week
    }
    return "";
  };

  return (
    <div className="h-72 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
          <XAxis
            dataKey="period"
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
                const item = payload[0].payload as TrendItem;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {item.label || item.period}
                    </p>
                    <p className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-bold">
                      {item.count} {item.count === 1 ? "application" : "applications"}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            name="Applications"
            stroke="#6d3df5"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#6d3df5", strokeWidth: 1 }}
            activeDot={{ r: 6, fill: "#5930d4", stroke: "#ffffff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

