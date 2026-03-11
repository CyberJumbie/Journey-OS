'use client';

import { useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';

interface TopBarProps {
  pageTitle: string;
  pageSubtitle?: string;
  showSearch?: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  userInitials?: string;
}

export default function TopBar({
  pageTitle,
  pageSubtitle,
  showSearch = false,
  isDesktop,
  isMobile,
  sidebarOpen,
  onToggleSidebar,
  userInitials = 'DU',
}: TopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--gray-300)]/40 bg-white/95 px-4 py-3 backdrop-blur-md md:px-7">
      <div className="flex items-center gap-3.5">
        {/* Hamburger on mobile/tablet */}
        {!isDesktop && (
          <button
            onClick={onToggleSidebar}
            className="flex flex-col gap-1 border-none bg-transparent p-1 cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <span
              className={`block h-0.5 w-5 rounded-sm bg-[var(--navy)] transition-transform ${
                sidebarOpen ? 'rotate-45 translate-y-1.5' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-sm bg-[var(--navy)] transition-opacity ${
                sidebarOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-sm bg-[var(--navy)] transition-transform ${
                sidebarOpen ? '-rotate-45 -translate-y-1.5' : ''
              }`}
            />
          </button>
        )}
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-lg font-bold leading-tight text-[var(--navy)] md:text-[22px]">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="mt-0.5 font-[family-name:var(--font-label)] text-[10px] tracking-wider text-[var(--gray-600)]">
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 md:gap-4">
        {/* Search */}
        {showSearch && !isMobile && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--gray-300)]/40 bg-[var(--parchment)] px-3.5 py-2 w-[180px] lg:w-[220px]">
            <Search size={14} className="text-[var(--gray-600)]" />
            <input
              placeholder="Search courses, topics..."
              className="w-full border-none bg-transparent text-[13px] text-[var(--navy)] outline-none placeholder:text-[var(--gray-600)]"
            />
          </div>
        )}

        {/* Notification bell */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative border-none bg-transparent p-1.5 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={18} className="text-[var(--gray-600)]" />
          <div className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[var(--red)]" />
        </button>

        {/* Avatar (mobile only) */}
        {isMobile && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--navy)] font-[family-name:var(--font-label)] text-[10px] font-medium text-white">
            {userInitials}
          </div>
        )}
      </div>
    </header>
  );
}
