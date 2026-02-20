"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";

interface DashboardTopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  user: { initials: string };
}

export function DashboardTopbar({
  sidebarOpen,
  onToggleSidebar,
  user,
}: DashboardTopbarProps) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between"
      style={{
        background: "rgba(255,255,255,0.949)" /* token: --white */,
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-light)",
        padding: isMobile ? "12px 16px" : "14px 28px",
      }}
    >
      <div className="flex items-center gap-3.5">
        {/* Hamburger on mobile/tablet */}
        {!isDesktop && (
          <button
            onClick={onToggleSidebar}
            className="flex cursor-pointer flex-col gap-1 border-none bg-transparent p-1"
            aria-label="Toggle sidebar"
          >
            <span
              className="block rounded-sm bg-navy-deep"
              style={{
                width: 20,
                height: 2,
                transition: "all 0.2s",
                transform: sidebarOpen
                  ? "rotate(45deg) translateY(6px)"
                  : "none",
              }}
            />
            <span
              className="block rounded-sm bg-navy-deep"
              style={{
                width: 20,
                height: 2,
                transition: "all 0.2s",
                opacity: sidebarOpen ? 0 : 1,
              }}
            />
            <span
              className="block rounded-sm bg-navy-deep"
              style={{
                width: 20,
                height: 2,
                transition: "all 0.2s",
                transform: sidebarOpen
                  ? "rotate(-45deg) translateY(-6px)"
                  : "none",
              }}
            />
          </button>
        )}
        <div>
          <h1
            className="font-serif font-bold text-navy-deep"
            style={{ fontSize: isMobile ? 18 : 22, lineHeight: 1.2 }}
          >
            Dashboard
          </h1>
          <p
            className="font-mono text-text-muted"
            style={{ fontSize: 10, letterSpacing: "0.06em", marginTop: 2 }}
          >
            {new Date()
              .toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              .toUpperCase()}
          </p>
        </div>
      </div>

      <div className="flex items-center" style={{ gap: isMobile ? 10 : 16 }}>
        {/* Search */}
        {!isMobile && (
          <div
            className="flex items-center gap-2 rounded-lg bg-parchment"
            style={{
              border: "1px solid var(--border-light)",
              padding: "8px 14px",
              width: isTablet ? 180 : 220,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#718096" /* token: --text-muted */
              strokeWidth="1.5"
            >
              <circle cx="6.5" cy="6.5" r="5.5" />
              <path d="M11 11l3.5 3.5" />
            </svg>
            <input
              placeholder="Search courses, topics..."
              className="w-full border-none bg-transparent font-sans text-[13px] text-text-primary outline-none"
            />
          </div>
        )}

        {/* Notification bell */}
        <button
          className="relative cursor-pointer border-none bg-transparent p-1.5"
          aria-label="Notifications"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="#4a5568" /* token: --text-secondary */
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M10 18c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM16 13V9c0-3.07-1.63-5.64-4.5-6.32V2c0-.83-.67-1.5-1.5-1.5S8.5 1.17 8.5 2v.68C5.64 3.36 4 5.92 4 9v4l-1.5 1.5V16h15v-1.5L16 13z" />
          </svg>
          <div
            className="absolute rounded-full bg-error"
            style={{
              top: 4,
              right: 4,
              width: 7,
              height: 7,
              border: "1.5px solid var(--white)",
            }}
          />
        </button>

        {/* Avatar (mobile only) */}
        {isMobile && (
          <div
            className="flex items-center justify-center rounded-lg bg-navy-deep font-mono text-white"
            style={{
              width: 32,
              height: 32,
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            {user.initials}
          </div>
        )}
      </div>
    </header>
  );
}
