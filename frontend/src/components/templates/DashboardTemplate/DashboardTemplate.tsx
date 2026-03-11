'use client';

import { ReactNode, useState } from 'react';
import Sidebar, { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from '@/components/organisms/Sidebar';
import TopBar from '@/components/organisms/TopBar';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { NavItem } from '@/config/navigation';

interface DashboardTemplateProps {
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  showSearch?: boolean;
  user?: { name: string; initials: string; department: string; role: string };
  navItems?: NavItem[];
}

export default function DashboardTemplate({
  children,
  pageTitle = 'Dashboard',
  pageSubtitle,
  showSearch = false,
  user = { name: 'Dr. User', initials: 'DU', department: 'Faculty', role: 'Faculty' },
  navItems,
}: DashboardTemplateProps) {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
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
        <TopBar
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          showSearch={showSearch}
          isDesktop={isDesktop}
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          userInitials={user.initials}
        />

        <main className="relative max-w-[1200px] px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
