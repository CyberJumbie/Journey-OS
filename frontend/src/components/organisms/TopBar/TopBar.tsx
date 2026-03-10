'use client';

import { useRouter } from 'next/navigation';

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
            className="flex flex-col gap-1 bg-transparent border-none p-1 cursor-pointer"
          >
            <span className={`block h-0.5 w-5 rounded-sm bg-[var(--navy)] transition-transform ${sidebarOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block h-0.5 w-5 rounded-sm bg-[var(--navy)] transition-opacity ${sidebarOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 rounded-sm bg-[var(--navy)] transition-transform ${sidebarOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        )}
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--navy)] leading-tight md:text-[22px]">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="font-[family-name:var(--font-label)] text-[10px] tracking-wider text-[var(--gray-600)] mt-0.5">
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 md:gap-4">
        {/* Search */}
        {showSearch && !isMobile && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--gray-300)]/40 bg-[var(--parchment)] px-3.5 py-2 w-[180px] lg:w-[220px]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--gray-600)" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5.5" /><path d="M11 11l3.5 3.5" />
            </svg>
            <input
              placeholder="Search courses, topics..."
              className="border-none bg-transparent text-[13px] text-[var(--navy)] outline-none w-full placeholder:text-[var(--gray-600)]"
            />
          </div>
        )}

        {/* Notification bell */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative bg-transparent border-none p-1.5 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--gray-600)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10 18c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM16 13V9c0-3.07-1.63-5.64-4.5-6.32V2c0-.83-.67-1.5-1.5-1.5S8.5 1.17 8.5 2v.68C5.64 3.36 4 5.92 4 9v4l-1.5 1.5V16h15v-1.5L16 13z" />
          </svg>
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
