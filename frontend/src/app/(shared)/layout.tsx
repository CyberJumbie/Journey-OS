import DashboardTemplate from '@/components/templates/DashboardTemplate';
import { requireAuth, getInitials } from '@/lib/auth';
import { getNavItems } from '@/config/navigation';

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const navItems = getNavItems(user.role, user.is_course_director);

  return (
    <DashboardTemplate
      user={{
        name: user.display_name ?? 'User',
        initials: getInitials(user.display_name),
        department: user.role.replace('_', ' '),
        role: user.role,
      }}
      navItems={navItems}
    >
      {children}
    </DashboardTemplate>
  );
}
