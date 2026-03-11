import AdminDashboardTemplate from '@/components/templates/AdminDashboardTemplate';
import { requireRole, getInitials } from '@/lib/auth';
import { getNavItems } from '@/config/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['superadmin']);
  const navItems = getNavItems('superadmin', false);

  return (
    <AdminDashboardTemplate
      user={{
        name: user.display_name ?? 'Admin',
        initials: getInitials(user.display_name),
        department: 'Administration',
      }}
      navItems={navItems}
    >
      {children}
    </AdminDashboardTemplate>
  );
}
