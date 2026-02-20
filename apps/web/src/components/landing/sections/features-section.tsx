"use client";

import { useState } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { WovenField } from "@web/components/brand/woven-field";
import { Reveal } from "@web/components/landing/reveal";
import { C, features } from "@web/components/landing/landing-data";

export function FeaturesSection() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const sectionPad = isMobile ? "64px 0" : isTablet ? "76px 0" : "90px 0";
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: sectionPad,
        background: C.cream,
        borderTop: `1px solid ${C.borderLight}`,
      }}
    >
      <WovenField
        color={C.greenDark}
        opacity={0.015}
        density={isMobile ? 10 : 24}
      />
      <div
        className="relative z-[1] mx-auto"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
        }}
      >
        <Reveal>
          <div
            style={{
              textAlign: isMobile ? "left" : "center",
              maxWidth: 560,
              margin: isMobile ? "0" : "0 auto",
              marginBottom: isMobile ? 36 : 56,
            }}
          >
            <div
              className="mb-3.5 flex items-center gap-2"
              style={{ justifyContent: isMobile ? "flex-start" : "center" }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  background: C.green,
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
                What Journey does
              </span>
            </div>
            <h2
              className="font-serif font-bold"
              style={{
                fontSize: isMobile ? 24 : 32,
                lineHeight: 1.25,
                color: C.navyDeep,
                marginBottom: 12,
              }}
            >
              One system. Every connection.
            </h2>
            <p
              style={{
                fontSize: isMobile ? 15 : 16,
                color: C.textSecondary,
                lineHeight: 1.75,
              }}
            >
              Journey OS weaves curriculum, assessment, measurement, and
              compliance into a single knowledge graph — so every part of your
              educational mission connects.
            </p>
          </div>
        </Reveal>

        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile
              ? "1fr"
              : isTablet
                ? "1fr 1fr"
                : "repeat(3, 1fr)",
            gap: isMobile ? 12 : 16,
          }}
        >
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div
                className="flex cursor-default flex-col rounded-[10px] transition-all"
                style={{
                  background: C.white,
                  border: `1px solid ${hoveredFeature === i ? C.blueMid : C.borderLight}`,
                  padding: isMobile ? 20 : 24,
                  minHeight: isMobile ? 0 : 180,
                  boxShadow:
                    hoveredFeature === i
                      ? "0 4px 20px rgba(0,44,118,0.06)"
                      : "none",
                }}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <span
                  className="mb-2.5 block font-serif"
                  style={{ fontSize: 18, color: C.navyDeep }}
                >
                  {f.icon}
                </span>
                <h3
                  className="mb-2 font-sans font-bold"
                  style={{
                    fontSize: isMobile ? 15 : 16,
                    lineHeight: 1.35,
                    color: C.navyDeep,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  className="flex-1"
                  style={{
                    fontSize: 14,
                    color: C.textSecondary,
                    lineHeight: 1.65,
                  }}
                >
                  {hoveredFeature === i ? f.detail : f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
