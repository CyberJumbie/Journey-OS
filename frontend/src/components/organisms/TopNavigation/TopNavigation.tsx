'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TopNavigationProps {
  showSearch?: boolean;
}

export default function TopNavigation({ showSearch = false }: TopNavigationProps) {
  const router = useRouter();

  const handleSignOut = () => {
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--gray-300)]/40 bg-white shadow-sm">
      <div className="flex h-16 items-center px-6">
        {/* Logo and Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-1">
            <span className="text-[22px] font-[family-name:var(--font-heading)] font-bold text-[var(--navy)] tracking-tight">Journey</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-[family-name:var(--font-label)] text-[var(--green)] uppercase tracking-wider border border-[var(--green)]/30 bg-[var(--green)]/5">
              OS
            </span>
          </div>
        </Link>

        {/* Navigation Links - Desktop */}
        <nav className="ml-12 hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium text-[var(--navy)] transition-colors hover:text-[var(--blue)]">
            Dashboard
          </Link>
          <Link href="/courses" className="text-sm font-medium text-[var(--blue)] transition-colors hover:text-[var(--navy)]">
            Courses
          </Link>
          <Link href="/repository" className="text-sm font-medium text-[var(--blue)] transition-colors hover:text-[var(--navy)]">
            Repository
          </Link>
          <Link href="/analytics/personal" className="text-sm font-medium text-[var(--blue)] transition-colors hover:text-[var(--navy)]">
            Analytics
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {/* Search */}
          {showSearch && (
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-600)]" />
              <Input type="search" placeholder="Search questions..." className="w-64 pl-9" />
            </div>
          )}

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="md:hidden text-[var(--navy)] hover:bg-[var(--parchment)]">
            <Menu className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-[var(--navy)] hover:bg-[var(--parchment)]"
            onClick={() => router.push('/notifications')}
          >
            <Bell className="h-5 w-5" />
            <Badge
              variant="danger"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
            >
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-[var(--parchment)]">
                <Avatar>
                  <AvatarFallback className="bg-[var(--green)] text-[var(--navy)] font-semibold">
                    DS
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end">
              <div className="flex flex-col space-y-1 p-3">
                <p className="text-sm font-semibold leading-none text-[var(--navy)]">Dr. Sarah Johnson</p>
                <p className="text-[13px] leading-none text-[var(--gray-600)]">sarah.johnson@msm.edu</p>
                <Badge variant="faculty" className="mt-2 w-fit">Faculty</Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard')}>Dashboard</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/courses')}>All Courses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/templates')}>Question Templates</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/analytics/personal')}>My Questions</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/help')}>Help & Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-[var(--red)] focus:text-[var(--red)]">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
