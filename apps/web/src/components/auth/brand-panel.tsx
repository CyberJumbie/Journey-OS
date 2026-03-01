"use client";

import { useSyncExternalStore } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { WovenField } from "@web/components/brand/woven-field";
import { AscendingSquares } from "@web/components/brand/ascending-squares";
import { JourneyLogo } from "@web/components/brand/journey-logo";

const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

const pillars = [
  { label: "Curriculum", sub: "Knowledge Graph", bg: "var(--navy-deep)" },
  { label: "Assessment", sub: "AI-Generated", bg: "var(--blue)" },
  { label: "Measurement", sub: "Student Mastery", bg: "var(--green)" },
  { label: "Compliance", sub: "Accreditation", bg: "var(--blue-mid)" },
];

interface BrandPanelProps {
  headline: string;
  subheadline?: string;
}

export function BrandPanel({ headline, subheadline }: BrandPanelProps) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const mounted = useMounted();

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div
      style={{
        flex: isMobile ? "none" : isTablet ? "0 0 340px" : "0 0 480px",
        position: "relative",
        overflow: "hidden",
        background: "var(--white)",
        borderRight: isMobile ? "none" : "1px solid var(--border-light)",
        borderBottom: isMobile ? "1px solid var(--border-light)" : "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: isMobile ? "auto" : "100vh",
        padding: isMobile
          ? "32px 24px 28px"
          : isTablet
            ? "40px 32px"
            : "48px 44px",
      }}
    >
      <WovenField
        color="#002c76" /* token: --navy-deep */
        opacity={0.02}
        density={14}
      />

      {/* Top: Logo + headline */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ ...fadeIn(0.1), marginBottom: isMobile ? 24 : 48 }}>
          <JourneyLogo size={isMobile ? "md" : "lg"} />
        </div>

        <div style={fadeIn(0.18)}>
          <AscendingSquares
            colors={[
              "var(--navy-deep)",
              "var(--blue)",
              "var(--blue-mid)",
              "var(--green)",
            ]}
            size={isMobile ? 10 : 14}
            gap={4}
            className="mb-4 md:mb-6"
          />
        </div>

        <div style={fadeIn(0.24)}>
          <h1
            className="font-serif font-bold text-navy-deep"
            style={{
              fontSize: isMobile ? 26 : isTablet ? 28 : 36,
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              marginBottom: isMobile ? 12 : 20,
              maxWidth: 360,
            }}
          >
            {headline}
          </h1>
        </div>

        {subheadline && (
          <div style={fadeIn(0.3)}>
            <p
              className="text-text-secondary"
              style={{
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.75,
                maxWidth: 340,
                marginBottom: isMobile ? 0 : 32,
              }}
            >
              {subheadline}
            </p>
          </div>
        )}
      </div>

      {/* Bottom: Pillar grid — hidden on mobile */}
      {!isMobile && (
        <div style={{ position: "relative", zIndex: 1, ...fadeIn(0.4) }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              maxWidth: isTablet ? 240 : 280,
            }}
          >
            {pillars.map((p, i) => (
              <div
                key={i}
                style={{
                  background: p.bg,
                  borderRadius: 8,
                  padding: isTablet ? "14px 12px" : "16px 14px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.06,
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 5px),
                      repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 5px)`,
                  }}
                />
                <span
                  className="font-mono"
                  style={{
                    fontSize: 8,
                    color: "rgba(255,255,255,0.5)" /* token: --white @ 50% */,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 2,
                    position: "relative",
                  }}
                >
                  {p.sub}
                </span>
                <span
                  className="font-serif font-semibold text-white"
                  style={{
                    fontSize: isTablet ? 12 : 13,
                    position: "relative",
                  }}
                >
                  {p.label}
                </span>
              </div>
            ))}
          </div>

          <svg
            style={{ marginTop: 16, opacity: 0.2, maxWidth: 160 }}
            height="8"
            viewBox="0 0 160 8"
            preserveAspectRatio="none"
          >
            <path
              d="M0,4 Q20,1 40,4 T80,4 T120,4 T160,4"
              stroke="#d7d3c8" /* token: --warm-gray */
              strokeWidth="1.2"
              fill="none"
            />
          </svg>

          <p
            className="font-sans text-text-muted"
            style={{ fontSize: 12, marginTop: 12 }}
          >
            Morehouse School of Medicine
          </p>
        </div>
      )}
    </div>
  );
}
