'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wand2,
  Network,
  BookOpen,
  Users,
  GraduationCap,
  Settings,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/setup', label: 'Setup Wizard', icon: Wand2 },
  { path: '/admin/frameworks', label: 'Frameworks', icon: Network },
  { path: '/admin/ilos', label: 'ILO Management', icon: BookOpen },
  { path: '/admin/knowledge', label: 'Knowledge Browser', icon: BookOpen },
  { path: '/admin/faculty', label: 'Faculty', icon: Users },
  { path: '/admin/courses', label: 'Courses', icon: GraduationCap, disabled: true },
  { path: '/admin/settings', label: 'Settings', icon: Settings, disabled: true },
];

interface AdminDashboardTemplateProps {
  children: ReactNode;
}

export default function AdminDashboardTemplate({ children }: AdminDashboardTemplateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarHovered, setSidebarHovered] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--gray-300)]/40 bg-white shadow-sm">
        <div className="flex h-16 items-center px-6">
          <Link href="/admin" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="text-[22px] font-[family-name:var(--font-heading)] font-bold text-[var(--navy)] tracking-tight">Journey</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-[family-name:var(--font-label)] text-[var(--green)] uppercase tracking-wider border border-[var(--green)]/30 bg-[var(--green)]/5">
              OS
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-[var(--navy)] hover:bg-[var(--parchment)]"
              onClick={() => router.push('/notifications')}
            >
              <Bell className="h-5 w-5" />
              <Badge variant="danger" className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                2
              </Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-[var(--parchment)]">
                  <Avatar>
                    <AvatarFallback className="bg-[var(--blue)] text-[var(--navy)] font-semibold">AD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72" align="end">
                <div className="flex flex-col space-y-1 p-3">
                  <p className="text-sm font-semibold leading-none text-[var(--navy)]">Admin User</p>
                  <p className="text-[13px] leading-none text-[var(--gray-600)]">admin@msm.edu</p>
                  <Badge variant="admin" className="mt-2 w-fit">Administrator</Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/admin')}>Admin Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>Faculty Dashboard</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/help')}>Help & Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/login')} className="text-[var(--red)] focus:text-[var(--red)]">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Collapsible Sidebar */}
        <aside
          className={`sticky top-16 h-[calc(100vh-4rem)] border-r border-[var(--gray-300)]/40 bg-white transition-all duration-300 ${
            sidebarHovered ? 'w-64' : 'w-16'
          }`}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.disabled ? '#' : item.path}
                      onClick={(e) => item.disabled && e.preventDefault()}
                      title={!sidebarHovered ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                        item.disabled
                          ? 'text-[var(--gray-600)] cursor-not-allowed opacity-50'
                          : isActive
                          ? 'bg-[var(--parchment)] text-[var(--navy)] font-semibold shadow-sm'
                          : 'text-[var(--gray-600)] hover:bg-[var(--parchment)] hover:text-[var(--navy)]'
                      }`}
                    >
                      <Icon className="size-5 shrink-0" />
                      {sidebarHovered && (
                        <>
                          <span className="text-sm whitespace-nowrap">{item.label}</span>
                          {item.disabled && (
                            <span className="ml-auto text-[10px] font-[family-name:var(--font-label)] uppercase tracking-wider text-[var(--gray-600)]">Soon</span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[var(--cream)] p-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
