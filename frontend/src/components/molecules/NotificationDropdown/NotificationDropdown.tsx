'use client';

import { useRef, useEffect } from 'react';
import { CheckCheck } from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';
import NotificationItem from '@/components/atoms/NotificationItem/NotificationItem';

interface NotificationDropdownProps {
  notifications: Notification[];
  open: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (path: string) => void;
  connected: boolean;
}

/**
 * NotificationDropdown — Molecule component.
 * Displays a dropdown list of the last 10 notifications.
 * Pure presentational: receives notifications + callbacks as props.
 */
export default function NotificationDropdown({
  notifications,
  open,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
  connected,
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && e.target instanceof HTMLElement && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (id: string, href: string) => {
    onMarkRead(id);
    onNavigate(href);
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 z-50 w-[360px] rounded-lg border border-[var(--gray-300)]/40 bg-white shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[var(--gray-300)]/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-[family-name:var(--font-heading)] text-sm font-semibold text-[var(--navy)]">
            Notifications
          </h3>
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-[var(--green)]' : 'bg-[var(--gray-300)]'}`}
            title={connected ? 'Live updates active' : 'Live updates unavailable'}
          />
        </div>
        {notifications.length > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 border-none bg-transparent cursor-pointer font-[family-name:var(--font-label)] text-[10px] tracking-wider text-[var(--blue)] hover:text-[var(--navy)]"
          >
            <CheckCheck size={12} />
            MARK ALL READ
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[var(--gray-600)]">No notifications yet</p>
            {!connected && (
              <p className="mt-1 text-xs text-[var(--gray-600)]">
                Live updates unavailable — using polling
              </p>
            )}
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onSelect={handleSelect} />
          ))
        )}
      </div>
    </div>
  );
}
