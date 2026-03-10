import AdminDashboardTemplate from '@/components/templates/AdminDashboardTemplate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminDashboardTemplate>{children}</AdminDashboardTemplate>;
}
