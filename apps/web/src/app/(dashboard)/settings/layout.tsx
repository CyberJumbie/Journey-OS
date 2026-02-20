"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Profile", href: "/settings/profile", enabled: true },
  { label: "Generation", href: "/settings/generation", enabled: true },
  { label: "Notifications", href: "/settings/notifications", enabled: true },
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
    <div className="flex gap-6 min-h-full">
      {/* Left nav */}
      <nav className="w-60 shrink-0 bg-parchment rounded-md p-4">
        <h2 className="font-serif text-lg font-semibold mb-4 text-text-primary">
          Settings
        </h2>
        <ul className="list-none p-0 m-0">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="mb-1">
                {item.enabled ? (
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 rounded-sm text-sm no-underline font-sans ${
                      isActive
                        ? "font-semibold text-primary bg-white"
                        : "font-normal text-text-secondary"
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="block px-3 py-2 font-sans text-sm text-text-muted cursor-not-allowed">
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Right content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
