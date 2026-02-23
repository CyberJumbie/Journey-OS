"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { JourneyLogo } from "@web/components/brand/journey-logo";
import { navItems } from "@web/components/dashboard/mock-data";
import { createBrowserClient } from "@web/lib/supabase";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
  user: { name: string; initials: string; department: string };
}

export function DashboardSidebar({
  open,
  onClose,
  user,
}: DashboardSidebarProps) {
  const router = useRouter();
  const bp = useBreakpoint();
  const isDesktop = bp === "desktop";
  const isTablet = bp === "tablet";
  const [activeNav, setActiveNav] = useState("dashboard");

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    if (!isDesktop) onClose();
    router.push("/login");
    router.refresh();
  }

  const sidebarWidth = isDesktop ? 240 : isTablet ? 220 : 260;

  return (
    <>
      {/* Overlay for mobile/tablet */}
      {!isDesktop && open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40"
          style={{
            background: "rgba(0,44,118,0.12)" /* token: --navy-deep */,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          width: sidebarWidth,
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 50,
          background: "var(--white)",
          borderRight: "1px solid var(--border-light)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px 20px",
          transform:
            !isDesktop && !open
              ? `translateX(-${sidebarWidth}px)`
              : "translateX(0)",
          transition: "transform 0.25s ease",
          boxShadow: !isDesktop && open ? "var(--shadow-sidebar)" : "none",
        }}
      >
        {/* Logo */}
        <div className="mb-2 px-2">
          <JourneyLogo size="md" />
        </div>
        <div
          className="mb-7 px-2 font-mono uppercase text-text-muted"
          style={{ fontSize: 9, letterSpacing: "0.06em" }}
        >
          MOREHOUSE SCHOOL OF MEDICINE
        </div>

        {/* Nav items */}
        <nav className="flex-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setActiveNav(item.key);
                if (!isDesktop) onClose();
              }}
              className="font-sans"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                marginBottom: 2,
                borderRadius: 6,
                border: "none",
                background:
                  activeNav === item.key ? "var(--parchment)" : "transparent",
                color:
                  activeNav === item.key
                    ? "var(--navy-deep)"
                    : "var(--text-secondary)",
                fontSize: 14,
                fontWeight: activeNav === item.key ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
                textAlign: "left",
              }}
            >
              <span
                className="font-serif"
                style={{
                  fontSize: 14,
                  width: 20,
                  textAlign: "center",
                  opacity: activeNav === item.key ? 1 : 0.5,
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom: Settings + user */}
        <div
          style={{
            borderTop: "1px solid var(--border-light)",
            paddingTop: 16,
          }}
        >
          <button
            className="font-sans text-text-muted"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 14 }}>⚙</span>
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="font-sans text-text-muted"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>

          <div className="mt-2 flex items-center gap-2.5 px-3 pt-3">
            <div
              className="flex items-center justify-center rounded-lg bg-navy-deep font-mono text-white"
              style={{
                width: 34,
                height: 34,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.04em",
              }}
            >
              {user.initials}
            </div>
            <div>
              <div className="font-sans text-[13px] font-semibold text-text-primary">
                {user.name}
              </div>
              <div
                className="font-mono uppercase text-text-muted"
                style={{ fontSize: 9, letterSpacing: "0.06em" }}
              >
                {user.department}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
