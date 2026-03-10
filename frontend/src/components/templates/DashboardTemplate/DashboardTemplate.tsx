'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from '@/components/organisms/Sidebar';
import TopBar from '@/components/organisms/TopBar';

function useBreakpoint() {
  const [bp, setBp] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return bp;
}

interface DashboardTemplateProps {
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  showSearch?: boolean;
  user?: { name: string; initials: string; department: string; role: string };
}

export default function DashboardTemplate({
  children,
  pageTitle = 'Dashboard',
  pageSubtitle,
  showSearch = false,
  user = { name: 'Dr. User', initials: 'DU', department: 'Faculty', role: 'Faculty' },
}: DashboardTemplateProps) {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isDesktop = bp === 'desktop';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isDesktop={isDesktop}
        user={user}
      />

      <div style={{ marginLeft: isDesktop ? 240 : 0 }} className="min-h-screen">
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
