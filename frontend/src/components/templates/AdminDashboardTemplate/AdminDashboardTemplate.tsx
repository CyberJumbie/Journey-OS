'use client';

import { ReactNode, useState } from 'react';
import Sidebar, { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from '@/components/organisms/Sidebar';
import type { SidebarUser } from '@/components/organisms/Sidebar';
import AdminTopBar from '@/components/organisms/AdminTopBar';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { NavItem } from '@/config/navigation';

interface AdminDashboardTemplateProps {
  children: ReactNode;
  user?: SidebarUser;
  navItems?: NavItem[];
}

export default function AdminDashboardTemplate({
  children,
  user = { name: 'Admin User', initials: 'AD', department: 'Administration' },
  navItems,
}: AdminDashboardTemplateProps) {
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const sidebarWidth = isDesktop
    ? (sidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH)
    : 0;

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <Sidebar
        open={sidebarOpen}
        expanded={sidebarExpanded}
        onClose={() => setSidebarOpen(false)}
        onExpandChange={setSidebarExpanded}
        isDesktop={isDesktop}
        user={user}
        navItems={navItems}
      />

      <div
        style={{ marginLeft: sidebarWidth }}
        className="min-h-screen transition-[margin-left] duration-250"
      >
        <AdminTopBar />

        <main className="overflow-auto bg-[var(--cream)] p-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
