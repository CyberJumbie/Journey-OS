"use client";

import { useState } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { DashboardSidebar } from "@web/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@web/components/dashboard/dashboard-topbar";
import { mockUser } from "@web/components/dashboard/mock-data";

const C = {
  cream: "#f5f3ef",
};

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const bp = useBreakpoint();
  const isDesktop = bp === "desktop";
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarWidth = isDesktop ? 240 : isTablet ? 220 : 260;

  return (
    <div className="min-h-screen font-sans" style={{ background: C.cream }}>
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={mockUser}
      />

      <div
        style={{ marginLeft: isDesktop ? sidebarWidth : 0, minHeight: "100vh" }}
      >
        <DashboardTopbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          user={mockUser}
        />

        <main
          style={{
            padding: isMobile
              ? "20px 16px"
              : isTablet
                ? "24px 24px"
                : "28px 32px",
            maxWidth: 1200,
            position: "relative",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
