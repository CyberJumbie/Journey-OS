"use client";

import { useState } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { Reveal } from "@web/components/landing/reveal";
import { C, researchItems } from "@web/components/landing/landing-data";

export function ResearchSection() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const [hoveredResearch, setHoveredResearch] = useState<number | null>(null);

  return (
    <section
      style={{
        padding: isMobile ? "52px 0" : "72px 0",
        background: C.cream,
        borderTop: `1px solid ${C.borderLight}`,
        borderBottom: `1px solid ${C.borderLight}`,
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
        }}
      >
        <Reveal>
          <div
            style={{
              textAlign: isMobile ? "left" : "center",
              marginBottom: isMobile ? 24 : 36,
            }}
          >
            <div
              className="mb-3.5 flex items-center gap-2"
              style={{
                justifyContent: isMobile ? "flex-start" : "center",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  background: C.greenDark,
                }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  color: C.greenDark,
                  letterSpacing: "0.1em",
                }}
              >
                Research-grounded
              </span>
            </div>
            <h2
              className="font-serif font-bold"
              style={{
                fontSize: isMobile ? 22 : 26,
                lineHeight: 1.3,
                color: C.navyDeep,
              }}
            >
              Built on real science, not just AI hype
            </h2>
          </div>
        </Reveal>

        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? 10 : 12,
          }}
        >
          {researchItems.map((r, i) => (
            <Reveal key={r.framework} delay={i * 0.06}>
              <div
                className="flex cursor-default flex-col justify-center rounded-lg text-center transition-all"
                style={{
                  background: C.white,
                  border: `1px solid ${hoveredResearch === i ? C.blueMid : C.borderLight}`,
                  padding: isMobile ? 14 : 18,
                  minHeight: isMobile ? 0 : 140,
                  boxShadow:
                    hoveredResearch === i
                      ? "0 4px 20px rgba(0,44,118,0.06)"
                      : "none",
                }}
                onMouseEnter={() => setHoveredResearch(i)}
                onMouseLeave={() => setHoveredResearch(null)}
              >
                <div
                  className="mb-1.5 font-mono uppercase"
                  style={{
                    fontSize: 9,
                    color: C.greenDark,
                    letterSpacing: "0.08em",
                  }}
                >
                  {r.area}
                </div>
                <div
                  className="font-serif font-semibold"
                  style={{
                    fontSize: isMobile ? 13 : 14,
                    color: C.navyDeep,
                    marginBottom: hoveredResearch === i ? 8 : 4,
                    lineHeight: 1.35,
                    transition: "margin 0.2s",
                  }}
                >
                  {r.framework}
                </div>
                {hoveredResearch === i ? (
                  <div
                    style={{
                      fontSize: isMobile ? 11 : 12,
                      color: C.textSecondary,
                      lineHeight: 1.6,
                    }}
                  >
                    {r.detail}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: isMobile ? 11 : 12,
                      color: C.textMuted,
                    }}
                  >
                    {r.author}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
