'use client';

import { Bell } from 'lucide-react';

interface NotificationBellProps {
  /** Number of unread notifications. 0 hides the badge. */
  unreadCount: number;
  /** Click handler — typically toggles the dropdown. */
  onClick: () => void;
}

/**
 * NotificationBell — Atom component.
 *
 * Displays a bell icon with an optional red badge showing unread count.
 * Pure display: receives count + onClick as props.
 * WRONG_ATOMIC_LEVEL: atoms never fetch data.
 */
export default function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative border-none bg-transparent p-1.5 cursor-pointer"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell size={18} className="text-[var(--gray-600)]" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--red)] px-1 font-[family-name:var(--font-label)] text-[10px] font-medium text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
