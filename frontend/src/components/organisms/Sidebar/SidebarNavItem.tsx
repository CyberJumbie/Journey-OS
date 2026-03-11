'use client';

import { resolveIcon } from '@/config/icon-map';

interface SidebarNavItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  showLabel: boolean;
  collapsed: boolean;
  onClick: () => void;
  muted?: boolean;
}

export default function SidebarNavItem({
  icon,
  label,
  isActive,
  showLabel,
  collapsed,
  onClick,
  muted = false,
}: SidebarNavItemProps) {
  const Icon = resolveIcon(icon);

  const baseClasses = 'relative flex w-full items-center rounded-md mb-0.5 text-sm transition-all cursor-pointer border-none';

  const layoutClasses = collapsed
    ? 'justify-center py-2.5 px-0'
    : 'gap-2.5 py-2.5 px-3';

  const colorClasses = muted
    ? 'text-[var(--gray-600)] hover:bg-[var(--parchment)] bg-transparent'
    : isActive
    ? 'bg-[var(--parchment)] font-semibold text-[var(--navy)]'
    : 'text-[var(--gray-600)] hover:bg-[var(--parchment)] bg-transparent';

  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`${baseClasses} ${layoutClasses} ${colorClasses}`}
    >
      <Icon
        size={18}
        strokeWidth={isActive ? 2.5 : 2}
        className="shrink-0"
      />
      {showLabel && <span>{label}</span>}

      {/* Active indicator bar for collapsed state */}
      {collapsed && isActive && (
        <div className="absolute right-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-l-sm bg-[var(--navy)]" />
      )}
    </button>
  );
}
