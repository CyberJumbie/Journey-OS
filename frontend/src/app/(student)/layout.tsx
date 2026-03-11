import DashboardTemplate from '@/components/templates/DashboardTemplate';
import { requireRole, getInitials } from '@/lib/auth';
import { getNavItems } from '@/config/navigation';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['student']);
  const navItems = getNavItems('student', false);

  return (
    <DashboardTemplate
      user={{
        name: user.display_name ?? 'Student',
        initials: getInitials(user.display_name),
        department: 'Student',
        role: user.role,
      }}
      navItems={navItems}
    >
      {children}
    </DashboardTemplate>
  );
}
