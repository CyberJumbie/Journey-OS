"use client";

import { useSyncExternalStore } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { AscendingSquares } from "@web/components/brand/ascending-squares";
import { BrandPanel } from "@web/components/auth/brand-panel";

const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

interface AuthLayoutProps {
  headline: string;
  subheadline?: string;
  children: React.ReactNode;
}

export function AuthLayout({
  headline,
  subheadline,
  children,
}: AuthLayoutProps) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const mounted = useMounted();

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div
      className="flex min-h-screen bg-cream font-sans"
      style={{ flexDirection: isMobile ? "column" : "row" }}
    >
      {/* Left: Brand Panel */}
      <BrandPanel headline={headline} subheadline={subheadline} />

      {/* Right: Form Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "32px 20px 40px" : "40px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!isMobile && (
          <div
            style={{
              position: "absolute",
              top: 32,
              right: 32,
              opacity: 0.06,
            }}
          >
            <AscendingSquares
              colors={[
                "var(--border-light)",
                "var(--warm-gray)",
                "var(--border)",
                "var(--border-light)",
              ]}
              size={10}
              gap={3}
            />
          </div>
        )}

        <div
          style={{
            width: "100%",
            maxWidth: 440,
            ...fadeIn(isMobile ? 0.1 : 0.3),
          }}
        >
          <div
            className="bg-white"
            style={{
              borderRadius: 12,
              border: "1px solid var(--border-light)",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
              padding: isMobile ? "28px 20px" : "36px 32px",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
