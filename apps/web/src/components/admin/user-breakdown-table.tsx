"use client";

import type { UserBreakdownEntry } from "@journey-os/types";

const ROLE_LABELS: Record<string, string> = {
  institutional_admin: "Institutional Admin",
  faculty: "Faculty",
  student: "Student",
  advisor: "Advisor",
  superadmin: "Super Admin",
};

export interface UserBreakdownTableProps {
  breakdown: readonly UserBreakdownEntry[];
}

export function UserBreakdownTable({ breakdown }: UserBreakdownTableProps) {
  const total = breakdown.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">
        User Breakdown
      </h3>
      {breakdown.length === 0 ? (
        <p className="text-sm text-gray-400">No users found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="pb-2">Role</th>
              <th className="pb-2 text-right">Count</th>
              <th className="pb-2 pl-4">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((entry) => {
              const pct = total > 0 ? (entry.count / total) * 100 : 0;
              return (
                <tr key={entry.role} className="border-b last:border-0">
                  <td className="py-2 font-medium text-gray-700">
                    {ROLE_LABELS[entry.role] ?? entry.role}
                  </td>
                  <td className="py-2 text-right text-gray-600">
                    {entry.count.toLocaleString()}
                  </td>
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full max-w-[120px] rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-[#69a338]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
