import { DashboardShell } from "@web/components/dashboard/dashboard-shell";

// Next.js App Router requires default export for layouts
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
