"use client";

import { useState } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { JourneyLogo } from "@web/components/brand/journey-logo";
import { navItems } from "@web/components/dashboard/mock-data";

const C = {
  navyDeep: "#002c76",
  greenDark: "#5d7203",
  white: "#ffffff",
  parchment: "#faf9f6",
  borderLight: "#edeae4",
  textPrimary: "#1b232a",
  textSecondary: "#4a5568",
  textMuted: "#718096",
};

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
  const bp = useBreakpoint();
  const isDesktop = bp === "desktop";
  const isTablet = bp === "tablet";
  const [activeNav, setActiveNav] = useState("dashboard");

  const sidebarWidth = isDesktop ? 240 : isTablet ? 220 : 260;

  return (
    <>
      {/* Overlay for mobile/tablet */}
      {!isDesktop && open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40"
          style={{
            background: "rgba(0,44,118,0.12)",
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
          background: C.white,
          borderRight: `1px solid ${C.borderLight}`,
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px 20px",
          transform:
            !isDesktop && !open
              ? `translateX(-${sidebarWidth}px)`
              : "translateX(0)",
          transition: "transform 0.25s ease",
          boxShadow:
            !isDesktop && open ? "4px 0 24px rgba(0,44,118,0.06)" : "none",
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
                  activeNav === item.key ? C.parchment : "transparent",
                color: activeNav === item.key ? C.navyDeep : C.textSecondary,
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
            borderTop: `1px solid ${C.borderLight}`,
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

          <div className="mt-2 flex items-center gap-2.5 px-3 pt-3">
            <div
              className="flex items-center justify-center rounded-lg font-mono text-white"
              style={{
                width: 34,
                height: 34,
                background: C.navyDeep,
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
