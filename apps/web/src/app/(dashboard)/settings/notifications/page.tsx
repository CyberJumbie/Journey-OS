import { NotificationPreferencesPanel } from "@web/components/settings/notification-preferences-panel";

/**
 * Settings > Notifications page.
 * [STORY-F-16] Per-type, per-channel notification preference matrix.
 */
// Next.js App Router requires default export for page.tsx
export default function SettingsNotificationsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-4 text-text-primary">
        Notification Preferences
      </h1>
      <p className="mb-6 text-sm text-text-secondary">
        Choose how you want to be notified about different events. Email
        delivery is coming soon.
      </p>
      <NotificationPreferencesPanel />
    </div>
  );
}
