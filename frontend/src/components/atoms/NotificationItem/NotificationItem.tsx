'use client';

import { ExternalLink } from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';
import { getNotificationMessage, getNotificationHref } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onSelect: (id: string, href: string) => void;
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getEventIcon(event: Notification['event']): string {
  switch (event) {
    case 'batch:completed': return 'Batch';
    case 'batch:item:completed': return 'Item';
    case 'review:needed': return 'Review';
    case 'sync:failed': return 'Sync';
  }
}

export default function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  return (
    <button
      onClick={() => onSelect(notification.id, getNotificationHref(notification))}
      className={`flex w-full items-start gap-3 border-none px-4 py-3 text-left cursor-pointer transition-colors hover:bg-[var(--parchment)] ${
        notification.read ? 'bg-white' : 'bg-[var(--cream)]/50'
      }`}
    >
      <div className="mt-1.5 flex-shrink-0">
        {!notification.read && (
          <span className="block h-2 w-2 rounded-full bg-[var(--blue)]" />
        )}
        {notification.read && <span className="block h-2 w-2" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-label)] text-[10px] tracking-wider text-[var(--gray-600)]">
            {getEventIcon(notification.event)}
          </span>
          <span className="text-[10px] text-[var(--gray-600)]">
            {formatTime(notification.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-tight text-[var(--navy)]">
          {getNotificationMessage(notification)}
        </p>
      </div>

      <ExternalLink size={12} className="mt-1 flex-shrink-0 text-[var(--gray-300)]" />
    </button>
  );
}
