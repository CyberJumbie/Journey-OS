'use client';

import type { SidebarUser } from './Sidebar';

interface SidebarUserCardProps {
  user: SidebarUser;
  showLabels: boolean;
  onClick: () => void;
}

export default function SidebarUserCard({ user, showLabels, onClick }: SidebarUserCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center mt-2 pt-3 cursor-pointer border-none bg-transparent ${
        showLabels ? 'gap-2.5 px-3' : 'justify-center px-0'
      }`}
    >
      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[var(--navy)] font-[family-name:var(--font-label)] text-[11px] font-medium text-white tracking-wide">
        {user.initials}
      </div>
      {showLabels && (
        <div className="min-w-0 overflow-hidden text-left">
          <div className="truncate text-[13px] font-semibold text-[var(--navy)]">
            {user.name}
          </div>
          <div className="truncate font-[family-name:var(--font-label)] text-[9px] uppercase tracking-wider text-[var(--gray-600)]">
            {user.department}
          </div>
        </div>
      )}
    </button>
  );
}
