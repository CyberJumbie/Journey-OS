"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { MonthlyTrend } from "@journey-os/types";

export interface UsageChartProps {
  title: string;
  data: readonly MonthlyTrend[];
  type: "line" | "bar";
}

export function UsageChart({ title, data, type }: UsageChartProps) {
  const chartData = data.map((d) => ({ ...d }));

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        {type === "line" ? (
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb" /* token: --color-border-light */
            />
            <XAxis
              dataKey="month"
              tick={{
                fontSize: 11,
                fill: "#6b7280" /* token: --color-text-muted */,
              }}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 11,
                fill: "#6b7280" /* token: --color-text-muted */,
              }}
              tickLine={false}
            />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#69a338" /* token: --color-green */
              strokeWidth={2}
              dot={{ r: 3, fill: "#69a338" /* token: --color-green */ }}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb" /* token: --color-border-light */
            />
            <XAxis
              dataKey="month"
              tick={{
                fontSize: 11,
                fill: "#6b7280" /* token: --color-text-muted */,
              }}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 11,
                fill: "#6b7280" /* token: --color-text-muted */,
              }}
              tickLine={false}
            />
            <Tooltip />
            <Bar
              dataKey="value"
              fill="#002c76"
              /* token: --color-navy-deep */ radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
