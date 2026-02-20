"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { WovenField } from "@web/components/brand/woven-field";
import { AscendingSquares } from "@web/components/brand/ascending-squares";
import { Sparkline } from "@web/components/dashboard/sparkline";

interface KpiData {
  label: string;
  value: string;
  change: string;
  trend: "up" | "stable" | "down";
  spark: number[];
}

interface KpiStripProps {
  kpis: KpiData[];
  userName: string;
}

export function KpiStrip({ kpis, userName }: KpiStripProps) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const lastName = userName.split(" ").pop();

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-navy-deep"
      style={{
        padding: isMobile ? "20px 18px" : "24px 28px",
        marginBottom: isMobile ? 20 : 24,
      }}
    >
      <WovenField
        color="#ffffff" /* token: --white */
        opacity={0.015}
        density={10}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Greeting row */}
        <div
          className="flex flex-wrap items-start justify-between gap-3"
          style={{ marginBottom: isMobile ? 18 : 22 }}
        >
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <AscendingSquares
                colors={[
                  "var(--color-blue-pale)",
                  "var(--color-blue-light)",
                  "var(--color-blue-mid)",
                  "var(--color-green)",
                ]}
                size={8}
                gap={3}
              />
              <span
                className="font-mono uppercase text-blue-pale"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  opacity: 0.7,
                }}
              >
                Faculty Overview
              </span>
            </div>
            <h2
              className="font-serif font-bold text-white"
              style={{
                fontSize: isMobile ? 20 : 24,
                lineHeight: 1.25,
              }}
            >
              Good afternoon, {lastName}
            </h2>
            <p
              className="font-sans text-blue-pale"
              style={{
                fontSize: 14,
                opacity: 0.8,
                marginTop: 4,
              }}
            >
              3 courses active · 2 items need review · coverage on track
            </p>
          </div>
          {!isMobile && (
            <button
              className="font-sans font-semibold text-white"
              style={{
                fontSize: 13,
                background: "rgba(255,255,255,0.12)" /* token: --white */,
                border: "1px solid rgba(255,255,255,0.15)" /* token: --white */,
                borderRadius: 6,
                padding: "9px 18px",
                cursor: "pointer",
                transition: "all 0.2s",
                backdropFilter: "blur(4px)",
              }}
            >
              + Generate Items
            </button>
          )}
        </div>

        {/* KPI cards */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? 10 : 14,
          }}
        >
          {kpis.map((k, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.06)" /* token: --white */,
                border: "1px solid rgba(255,255,255,0.08)" /* token: --white */,
                borderRadius: 8,
                padding: isMobile ? "14px 12px" : "16px 18px",
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                className="font-mono uppercase text-blue-pale"
                style={{
                  fontSize: 9,
                  opacity: 0.6,
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                {k.label}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div
                    className="font-serif font-bold text-white"
                    style={{
                      fontSize: isMobile ? 22 : 28,
                      lineHeight: 1,
                    }}
                  >
                    {k.value}
                  </div>
                  <div
                    className="font-sans text-blue-pale"
                    style={{
                      fontSize: 11,
                      opacity: 0.65,
                      marginTop: 4,
                    }}
                  >
                    {k.change}
                  </div>
                </div>
                {!isMobile && (
                  <Sparkline
                    data={k.spark}
                    color="#a3d9ff" /* token: --blue-pale */
                    width={60}
                    height={24}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
