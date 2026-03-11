'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { NavItem } from '@/config/navigation';
import SidebarLogo from './SidebarLogo';
import SidebarNavItem from './SidebarNavItem';
import SidebarUserCard from './SidebarUserCard';

export interface SidebarUser {
  name: string;
  initials: string;
  department: string;
}

interface SidebarProps {
  open: boolean;
  expanded: boolean;
  onClose: () => void;
  onExpandChange: (expanded: boolean) => void;
  isDesktop: boolean;
  user?: SidebarUser;
  navItems?: NavItem[];
  /** Institution name displayed below the logo */
  institutionName?: string;
}

export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const SIDEBAR_EXPANDED_WIDTH = 240;

export default function Sidebar({
  open,
  expanded,
  onClose,
  onExpandChange,
  isDesktop,
  user,
  navItems = [],
  institutionName,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeKey = navItems.find(item => {
    if (pathname === item.path) return true;
    if (item.path !== '/' && pathname.startsWith(item.path + '/')) return true;
    return false;
  })?.key ?? navItems[0]?.key ?? '';

  const showLabels = expanded || !isDesktop;
  const width = isDesktop
    ? (expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH)
    : 260;

  const handleNav = (path: string) => {
    router.push(path);
    if (!isDesktop) onClose();
  };

  return (
    <>
      {!isDesktop && open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[var(--navy)]/10 backdrop-blur-sm transition-opacity"
        />
      )}

      <div
        onMouseEnter={() => isDesktop && onExpandChange(true)}
        onMouseLeave={() => isDesktop && onExpandChange(false)}
        style={{
          width,
          transform: (!isDesktop && !open) ? `translateX(-${width}px)` : 'translateX(0)',
        }}
        className="fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-[var(--gray-300)]/40 bg-white transition-all duration-250"
      >
        <div className={`${isDesktop && !expanded ? 'px-3 py-6' : 'px-4 py-6'}`}>
          <SidebarLogo showLabels={showLabels} institutionName={institutionName} />
        </div>

        <nav className="flex-1 px-2">
          {navItems.map(item => (
            <SidebarNavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              isActive={activeKey === item.key}
              showLabel={showLabels}
              collapsed={isDesktop && !expanded}
              onClick={() => handleNav(item.path)}
            />
          ))}
        </nav>

        <div className="border-t border-[var(--gray-300)]/40 px-2 pt-4 pb-5">
          <SidebarNavItem
            icon="Settings"
            label="Settings"
            isActive={pathname.startsWith('/settings')}
            showLabel={showLabels}
            collapsed={isDesktop && !expanded}
            onClick={() => handleNav('/settings')}
            muted
          />
          {user && (
            <SidebarUserCard
              user={user}
              showLabels={showLabels}
              onClick={() => handleNav('/profile')}
            />
          )}
        </div>
      </div>
    </>
  );
}
