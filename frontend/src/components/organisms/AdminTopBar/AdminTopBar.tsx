'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useSignOut } from '@/lib/auth-client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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

export default function AdminTopBar() {
  const router = useRouter();
  const signOut = useSignOut();
  const { data: user } = useCurrentUser();

  const displayName = user?.displayName ?? 'Admin';
  const email = user?.email ?? '';
  const initials = user?.initials ?? '??';
  const roleLabel = user?.roleLabel ?? 'Administrator';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--gray-300)]/40 bg-white shadow-sm">
      <div className="flex h-16 items-center px-6">
        <Link href="/admin" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="text-[22px] font-[family-name:var(--font-heading)] font-bold text-[var(--navy)] tracking-tight">
            Journey
          </span>
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
            <Badge
              variant="danger"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
            >
              2
            </Badge>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-[var(--parchment)]">
                <Avatar>
                  <AvatarFallback className="bg-[var(--blue)] text-[var(--navy)] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end">
              <div className="flex flex-col space-y-1 p-3">
                <p className="text-sm font-semibold leading-none text-[var(--navy)]">{displayName}</p>
                <p className="text-[13px] leading-none text-[var(--gray-600)]">{email}</p>
                <Badge variant="admin" className="mt-2 w-fit">{roleLabel}</Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/admin')}>Admin Dashboard</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard')}>Faculty Dashboard</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/help')}>Help & Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-[var(--red)] focus:text-[var(--red)]"
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
