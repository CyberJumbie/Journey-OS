import type { Metadata } from "next";
import { InstitutionDetailDashboard } from "@web/components/admin/institution-detail-dashboard";

export const metadata: Metadata = {
  title: "Institution Detail — Journey OS Admin",
  description: "View institution usage metrics, user breakdown, and activity.",
};

export default function InstitutionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6">
      <div className="mx-auto max-w-7xl">
        <InstitutionDetailDashboard institutionId={params.id} />
      </div>
    </div>
  );
}
