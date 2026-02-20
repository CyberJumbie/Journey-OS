"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { WovenField } from "@web/components/brand/woven-field";
import { Reveal } from "@web/components/landing/reveal";
import {
  C,
  personas,
  type PersonaKey,
} from "@web/components/landing/landing-data";

interface BenefitsSectionProps {
  activePersona: PersonaKey;
}

export function BenefitsSection({ activePersona }: BenefitsSectionProps) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const sectionPad = isMobile ? "64px 0" : isTablet ? "76px 0" : "90px 0";

  const currentPersona = personas[activePersona];

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: sectionPad,
        background: C.cream,
        borderBottom: `1px solid ${C.borderLight}`,
      }}
    >
      <WovenField
        color={C.navyDeep}
        opacity={0.012}
        density={isMobile ? 10 : 20}
      />
      <div
        className="relative z-[1] mx-auto"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
        }}
      >
        <Reveal>
          <div style={{ marginBottom: isMobile ? 28 : 48 }}>
            <div className="mb-3.5 flex items-center gap-2">
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
                Benefits
              </span>
            </div>
            <h2
              className="font-serif font-bold"
              style={{
                fontSize: isMobile ? 24 : 32,
                lineHeight: 1.25,
                color: C.navyDeep,
              }}
            >
              What changes for {currentPersona.short.toLowerCase()}
            </h2>
          </div>
        </Reveal>

        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: isMobile ? 12 : 16,
          }}
        >
          {currentPersona.benefits.map((b, i) => (
            <Reveal key={`${activePersona}-benefit-${i}`} delay={i * 0.08}>
              <div
                className="rounded-[10px] transition-all"
                style={{
                  background: C.white,
                  border: `1px solid ${C.borderLight}`,
                  padding: isMobile ? 20 : 24,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.blueMid;
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(0,44,118,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.borderLight;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <h3
                  className="mb-2 font-sans font-bold"
                  style={{
                    fontSize: isMobile ? 15 : 16,
                    lineHeight: 1.35,
                    color: C.navyDeep,
                  }}
                >
                  {b.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: C.textSecondary,
                    lineHeight: 1.7,
                  }}
                >
                  {b.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Student callout — only for non-student personas */}
        {activePersona !== "students" && (
          <Reveal delay={0.3}>
            <div
              className="items-center rounded-xl"
              style={{
                marginTop: isMobile ? 20 : 32,
                background: `linear-gradient(135deg, ${C.navyDeep} 0%, ${C.blue} 100%)`,
                padding: isMobile ? "20px" : "28px 32px",
                display: isMobile ? "block" : "flex",
                gap: 24,
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-[10px]"
                style={{
                  width: 48,
                  height: 48,
                  background: "rgba(255,255,255,0.12)",
                  marginBottom: isMobile ? 12 : 0,
                }}
              >
                <span style={{ fontSize: 22 }}>🎓</span>
              </div>
              <div>
                <h4
                  className="mb-1 font-sans font-bold text-white"
                  style={{ fontSize: 15 }}
                >
                  And for students?
                </h4>
                <p
                  style={{
                    fontSize: 14,
                    color: C.bluePale,
                    lineHeight: 1.65,
                  }}
                >
                  Practice materials aligned to their actual courses. A mastery
                  map that shows where they stand — concept by concept — before
                  exam day. Adaptive study that targets weak spots. Learning
                  that connects the way medicine actually connects.
                </p>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
