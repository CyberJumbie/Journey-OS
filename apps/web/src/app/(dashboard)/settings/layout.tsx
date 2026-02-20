"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Profile", href: "/settings/profile", enabled: true },
  { label: "Notifications", href: "/settings/notifications", enabled: false },
  { label: "Appearance", href: "/settings/appearance", enabled: false },
];

// Next.js App Router requires default export for layouts
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-6, 24px)",
        minHeight: "100%",
      }}
    >
      {/* Left nav */}
      <nav
        style={{
          width: 240,
          flexShrink: 0,
          backgroundColor: "var(--surface-parchment, #f0ebe3)",
          borderRadius: "var(--radius-md, 8px)",
          padding: "var(--space-4, 16px)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-serif, Georgia, serif)",
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "var(--space-4, 16px)",
            color: "var(--color-text-primary, #1a1a2e)",
          }}
        >
          Settings
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li
                key={item.href}
                style={{ marginBottom: "var(--space-1, 4px)" }}
              >
                {item.enabled ? (
                  <Link
                    href={item.href}
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm, 6px)",
                      textDecoration: "none",
                      fontFamily: "var(--font-sans, system-ui, sans-serif)",
                      fontSize: "0.875rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? "var(--color-primary, #1a1a2e)"
                        : "var(--color-text-secondary, #6b7280)",
                      backgroundColor: isActive
                        ? "var(--surface-white, #ffffff)"
                        : "transparent",
                    }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      fontFamily: "var(--font-sans, system-ui, sans-serif)",
                      fontSize: "0.875rem",
                      color: "var(--color-text-disabled, #9ca3af)",
                      cursor: "not-allowed",
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Right content */}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
