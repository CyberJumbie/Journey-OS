import DashboardTemplate from '@/components/templates/DashboardTemplate';
import { requireRole, getInitials } from '@/lib/auth';
import { getNavItems } from '@/config/navigation';

export default async function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['institutional_admin', 'superadmin']);
  const navItems = getNavItems(user.role, false);

  return (
    <DashboardTemplate
      user={{
        name: user.display_name ?? 'Admin',
        initials: getInitials(user.display_name),
        department: 'Institution Admin',
        role: user.role,
      }}
      navItems={navItems}
    >
      {children}
    </DashboardTemplate>
  );
}
