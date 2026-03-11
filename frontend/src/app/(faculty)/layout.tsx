import DashboardTemplate from '@/components/templates/DashboardTemplate';
import { requireRole, getInitials } from '@/lib/auth';
import { getNavItems } from '@/config/navigation';

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['faculty', 'superadmin']);
  const navItems = getNavItems(user.role, user.is_course_director);

  return (
    <DashboardTemplate
      user={{
        name: user.display_name ?? 'Faculty',
        initials: getInitials(user.display_name),
        department: 'Faculty',
        role: user.role,
      }}
      navItems={navItems}
    >
      {children}
    </DashboardTemplate>
  );
}
