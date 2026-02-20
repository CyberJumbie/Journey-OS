"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { WovenField } from "@web/components/brand/woven-field";
import { AscendingSquares } from "@web/components/brand/ascending-squares";
import { Reveal } from "@web/components/landing/reveal";
import { C } from "@web/components/landing/landing-data";

export function HeroSection() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{
        minHeight: isMobile ? "auto" : "100vh",
        paddingTop: isMobile ? 80 : 0,
        paddingBottom: isMobile ? 48 : 0,
        background: `linear-gradient(170deg, ${C.white} 0%, ${C.cream} 40%, ${C.parchment} 100%)`,
      }}
    >
      <WovenField
        color={C.navyDeep}
        opacity={0.025}
        density={isMobile ? 12 : 22}
      />

      {!isMobile && (
        <>
          <div
            className="absolute"
            style={{ top: 120, right: 60, opacity: 0.12 }}
          >
            <AscendingSquares
              colors={[C.navyDeep, C.blue, C.blueMid, C.green]}
              size={32}
              gap={8}
            />
          </div>
          <div
            className="absolute"
            style={{ bottom: 80, left: 40, opacity: 0.08 }}
          >
            <AscendingSquares
              colors={[C.greenDark, C.green, C.blueLight, C.bluePale]}
              size={20}
              gap={5}
            />
          </div>
        </>
      )}

      <div
        className="relative z-[1] mx-auto"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
          paddingTop: isMobile ? 24 : 100,
          paddingBottom: isMobile ? 24 : 80,
        }}
      >
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: isDesktop ? "1fr 340px" : "1fr",
            gap: isMobile ? 36 : 60,
          }}
        >
          {/* Left: Copy */}
          <div>
            <Reveal>
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: isMobile ? 14 : 20 }}
              >
                <div
                  className="rounded-sm"
                  style={{
                    width: 8,
                    height: 8,
                    background: C.green,
                  }}
                />
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    color: C.greenDark,
                    letterSpacing: "0.1em",
                  }}
                >
                  Built at Morehouse School of Medicine
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h1
                className="font-serif font-bold"
                style={{
                  fontSize: isMobile ? 30 : isTablet ? 38 : 54,
                  lineHeight: 1.18,
                  marginBottom: 20,
                  letterSpacing: "-0.015em",
                  color: C.navyDeep,
                  maxWidth: isMobile ? "100%" : 600,
                }}
              >
                Every thread of your curriculum, woven into one connected
                system.
              </h1>
            </Reveal>

            <Reveal delay={0.15}>
              <p
                style={{
                  fontSize: isMobile ? 16 : 18,
                  color: C.textSecondary,
                  lineHeight: 1.8,
                  maxWidth: isMobile ? "100%" : 520,
                  marginBottom: 12,
                }}
              >
                Faculty create better assessments in less time. Advisors see
                where students need help before grades tell the story.
                Institutions prove educational quality with evidence that traces
                itself.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p
                style={{
                  fontSize: isMobile ? 15 : 16,
                  color: C.textMuted,
                  lineHeight: 1.75,
                  maxWidth: isMobile ? "100%" : 520,
                  marginBottom: isMobile ? 28 : 36,
                }}
              >
                And students? They get practice aligned to what they&apos;re
                actually learning, with a mastery map that grows alongside them.
              </p>
            </Reveal>

            <Reveal delay={0.22}>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#waitlist"
                  className="inline-block rounded-[7px] text-center font-sans font-semibold text-white no-underline transition-colors"
                  style={{
                    fontSize: isMobile ? 14 : 15,
                    background: C.navyDeep,
                    padding: isMobile ? "12px 24px" : "13px 28px",
                    flex: isMobile ? "1 1 100%" : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.blue;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.navyDeep;
                  }}
                >
                  Request Early Access
                </a>
                <a
                  href="#how-it-works"
                  className="inline-block rounded-[7px] text-center font-sans font-medium no-underline transition-colors"
                  style={{
                    fontSize: isMobile ? 14 : 15,
                    color: C.navyDeep,
                    border: `1.5px solid ${C.border}`,
                    padding: isMobile ? "12px 24px" : "13px 28px",
                    flex: isMobile ? "1 1 100%" : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.blueMid;
                    e.currentTarget.style.color = C.blue;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.color = C.navyDeep;
                  }}
                >
                  See How It Works
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right: Woven grid visual */}
          {!isMobile && (
            <Reveal delay={0.25}>
              <div
                className="relative"
                style={{
                  maxWidth: isTablet ? 280 : 340,
                  margin: isTablet ? "0 auto" : undefined,
                }}
              >
                <div
                  className="grid grid-cols-2 gap-2"
                  style={{ transform: "rotate(2deg)" }}
                >
                  {[
                    {
                      bg: C.navyDeep,
                      label: "Curriculum",
                      sub: "Knowledge Graph",
                    },
                    {
                      bg: C.blue,
                      label: "Assessment",
                      sub: "AI-Generated",
                    },
                    {
                      bg: C.green,
                      label: "Measurement",
                      sub: "Student Mastery",
                    },
                    {
                      bg: C.blueMid,
                      label: "Compliance",
                      sub: "Accreditation",
                    },
                  ].map((sq) => (
                    <div
                      key={sq.label}
                      className="relative flex flex-col justify-end overflow-hidden rounded-[10px]"
                      style={{
                        background: sq.bg,
                        padding: isTablet ? 16 : 20,
                        aspectRatio: "1",
                      }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          opacity: 0.08,
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px),
                            repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px)`,
                        }}
                      />
                      <span
                        className="relative font-mono uppercase"
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.6)",
                          letterSpacing: "0.08em",
                          marginBottom: 2,
                        }}
                      >
                        {sq.sub}
                      </span>
                      <span
                        className="relative font-serif font-semibold text-white"
                        style={{ fontSize: isTablet ? 14 : 16 }}
                      >
                        {sq.label}
                      </span>
                    </div>
                  ))}
                </div>
                <svg
                  className="pointer-events-none absolute"
                  style={{ top: -20, left: -20, right: -20, bottom: -20 }}
                  viewBox="0 0 380 380"
                >
                  <path
                    d="M0,190 Q95,170 190,190 T380,190"
                    stroke={C.warmGray}
                    strokeWidth="1"
                    fill="none"
                    opacity="0.4"
                  />
                  <path
                    d="M190,0 Q170,95 190,190 T190,380"
                    stroke={C.warmGray}
                    strokeWidth="1"
                    fill="none"
                    opacity="0.3"
                  />
                </svg>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
