import type { Metadata } from "next";
import { ApplicationReviewQueue } from "@web/components/admin/application-review-queue";

export const metadata: Metadata = {
  title: "Application Review — Journey OS Admin",
  description: "Review and manage waitlist applications.",
};

export default function AdminApplicationsPage() {
  return (
    <div className="min-h-screen bg-[#f5f3ef] p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 font-serif text-2xl font-bold text-[#002c76]">
          Application Review Queue
        </h1>
        <ApplicationReviewQueue />
      </div>
    </div>
  );
}
