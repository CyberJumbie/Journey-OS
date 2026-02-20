import type { Metadata } from "next";
import { InstitutionListDashboard } from "@web/components/admin/institution-list-dashboard";

export const metadata: Metadata = {
  title: "Institutions — Journey OS Admin",
  description: "Manage all institutions on the platform.",
};

export default function AdminInstitutionsPage() {
  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 font-serif text-2xl font-bold text-[#002c76]">
          Institutions
        </h1>
        <InstitutionListDashboard />
      </div>
    </div>
  );
}
