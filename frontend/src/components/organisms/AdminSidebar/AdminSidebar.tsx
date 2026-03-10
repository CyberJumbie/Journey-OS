'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wand2,
  Network,
  BookOpen,
  Users,
  GraduationCap,
  Settings,
} from 'lucide-react';

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/setup', label: 'Setup Wizard', icon: Wand2 },
  { path: '/admin/frameworks', label: 'Frameworks', icon: Network },
  { path: '/admin/knowledge', label: 'Knowledge', icon: BookOpen },
  { path: '/admin/faculty', label: 'Faculty', icon: Users },
  { path: '/admin/courses', label: 'Courses', icon: GraduationCap, disabled: true },
  { path: '/admin/settings', label: 'Settings', icon: Settings, disabled: true },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r border-[var(--gray-300)]/40 bg-white p-4">
      <div className="mb-8">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-1">
            <span className="text-lg font-[family-name:var(--font-heading)] font-bold text-[var(--navy)] tracking-tight">Journey</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-[var(--navy)] text-[8px] font-[family-name:var(--font-label)] text-[var(--navy)] uppercase tracking-wider">
              OS
            </span>
          </div>
        </div>
        <div className="px-3 mt-1">
          <div className="text-[10px] font-[family-name:var(--font-label)] uppercase tracking-widest text-[var(--gray-600)]">Admin Panel</div>
        </div>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.disabled ? '#' : item.path}
              onClick={(e) => item.disabled && e.preventDefault()}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                item.disabled
                  ? 'text-[var(--gray-600)] cursor-not-allowed opacity-50'
                  : isActive
                  ? 'bg-[var(--blue)] text-[var(--navy)] font-semibold shadow-sm'
                  : 'text-[var(--gray-600)] hover:bg-[var(--parchment)] hover:text-[var(--navy)]'
              }`}
            >
              <Icon className="size-5" />
              <span className="text-sm">{item.label}</span>
              {item.disabled && (
                <span className="ml-auto text-[10px] font-[family-name:var(--font-label)] uppercase tracking-wider text-[var(--gray-600)]">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
