import DashboardTemplate from '@/components/templates/DashboardTemplate';
import { requireRole, getInitials } from '@/lib/auth';
import { getNavItems } from '@/config/navigation';

export default async function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['advisor', 'superadmin']);
  const navItems = getNavItems('advisor', false);

  return (
    <DashboardTemplate
      user={{
        name: user.display_name ?? 'Advisor',
        initials: getInitials(user.display_name),
        department: 'Academic Advisor',
        role: user.role,
      }}
      navItems={navItems}
    >
      {children}
    </DashboardTemplate>
  );
}
