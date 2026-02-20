import { AdminDashboard } from "@web/components/admin/admin-dashboard";

export default function InstitutionDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-text-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Institution overview and key metrics.
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
}
