'use client';

import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: '◈', path: '/dashboard' },
  { key: 'courses', label: 'Courses', icon: '◆', path: '/courses' },
  { key: 'generate', label: 'Generate', icon: '✦', path: '/generation/wizard' },
  { key: 'assessments', label: 'Assessments', icon: '◇', path: '/questions/review' },
  { key: 'students', label: 'Students', icon: '▢', path: '/student/progress' },
  { key: 'analytics', label: 'Analytics', icon: '▣', path: '/analytics' },
];

function getActiveNav(pathname: string): string {
  if (pathname.startsWith('/courses')) return 'courses';
  if (pathname.startsWith('/generation') || pathname.startsWith('/generate')) return 'generate';
  if (pathname.startsWith('/questions') || pathname.startsWith('/assessments')) return 'assessments';
  if (pathname.startsWith('/student')) return 'students';
  if (pathname.startsWith('/analytics')) return 'analytics';
  return 'dashboard';
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  isDesktop: boolean;
  user?: { name: string; initials: string; department: string };
}

export default function Sidebar({ open, onClose, isDesktop, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeNav = getActiveNav(pathname);
  const width = isDesktop ? 240 : 260;

  const handleNav = (path: string) => {
    router.push(path);
    if (!isDesktop) onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {!isDesktop && open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[var(--navy)]/10 backdrop-blur-sm"
        />
      )}

      <div
        style={{ width, transform: (!isDesktop && !open) ? `translateX(-${width}px)` : 'translateX(0)' }}
        className="fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-[var(--gray-300)]/40 bg-white px-4 py-6 transition-transform duration-250"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-1">
          <span className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--navy)]">Journey</span>
          <span className="font-[family-name:var(--font-label)] text-[8px] tracking-widest text-[var(--green)] border border-[var(--green)] px-1.5 py-px rounded-sm">
            OS
          </span>
        </div>
        <div className="font-[family-name:var(--font-label)] text-[9px] tracking-wider text-[var(--gray-600)] px-2 mb-7">
          MOREHOUSE SCHOOL OF MEDICINE
        </div>

        {/* Nav items */}
        <nav className="flex-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => handleNav(item.path)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 mb-0.5 text-left text-sm transition-all ${
                activeNav === item.key
                  ? 'bg-[var(--parchment)] font-semibold text-[var(--navy)]'
                  : 'text-[var(--gray-600)] hover:bg-[var(--parchment)]'
              }`}
            >
              <span className={`font-[family-name:var(--font-heading)] text-sm w-5 text-center ${
                activeNav === item.key ? 'opacity-100' : 'opacity-50'
              }`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom: Settings + user */}
        <div className="border-t border-[var(--gray-300)]/40 pt-4">
          <button
            onClick={() => handleNav('/settings')}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm text-[var(--gray-600)] hover:bg-[var(--parchment)]"
          >
            <span className="text-sm">⚙</span>
            Settings
          </button>

          {user && (
            <div className="flex items-center gap-2.5 px-3 pt-3 mt-2">
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-[var(--navy)] font-[family-name:var(--font-label)] text-[11px] font-medium text-white tracking-wide">
                {user.initials}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[var(--navy)]">{user.name}</div>
                <div className="font-[family-name:var(--font-label)] text-[9px] uppercase tracking-wider text-[var(--gray-600)]">
                  {user.department}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
