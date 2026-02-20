"use client";

import { useRouter } from "next/navigation";
import { useInstitutionDetail } from "@web/hooks/use-institution-detail";
import { InstitutionDetailHeader } from "@web/components/admin/institution-detail-header";
import { InstitutionMetricsGrid } from "@web/components/admin/institution-metrics-grid";
import { UserBreakdownTable } from "@web/components/admin/user-breakdown-table";
import { InstitutionActivityTimeline } from "@web/components/admin/institution-activity-timeline";
import { UsageChart } from "@web/components/admin/usage-chart";

export interface InstitutionDetailDashboardProps {
  institutionId: string;
}

export function InstitutionDetailDashboard({
  institutionId,
}: InstitutionDetailDashboardProps) {
  const router = useRouter();
  const { detail, status, errorMsg, refetch } =
    useInstitutionDetail(institutionId);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/admin/institutions")}
        className="text-sm text-[#2b71b9] hover:underline"
      >
        &larr; Back to Institutions
      </button>

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-lg bg-white" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-lg bg-white" />
            <div className="h-64 animate-pulse rounded-lg bg-white" />
          </div>
        </div>
      )}

      {/* Not found */}
      {status === "not_found" && (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <h2 className="font-serif text-xl font-bold text-[#002c76]">
            Institution Not Found
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            The institution you are looking for does not exist.
          </p>
          <button
            onClick={() => router.push("/admin/institutions")}
            className="mt-4 rounded bg-[#2b71b9] px-4 py-2 text-sm text-white hover:bg-[#1e5a96]"
          >
            Back to Institutions
          </button>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-red-600">{errorMsg}</p>
          <button
            onClick={refetch}
            className="mt-4 rounded bg-[#2b71b9] px-4 py-2 text-sm text-white hover:bg-[#1e5a96]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Data */}
      {status === "data" && detail && (
        <>
          <InstitutionDetailHeader detail={detail} />

          <InstitutionMetricsGrid
            metrics={detail.metrics}
            storage={detail.storage}
          />

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <UsageChart
              title="Monthly Active Users"
              data={detail.monthly_active_users}
              type="line"
            />
            <UsageChart
              title="Questions Generated"
              data={detail.monthly_questions}
              type="bar"
            />
          </div>

          {/* Tables */}
          <div className="grid gap-4 lg:grid-cols-2">
            <UserBreakdownTable breakdown={detail.user_breakdown} />
            <InstitutionActivityTimeline events={detail.activity_timeline} />
          </div>
        </>
      )}
    </div>
  );
}
