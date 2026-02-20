"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { Reveal } from "@web/components/landing/reveal";
import { C, chainSteps } from "@web/components/landing/landing-data";

export function CoverageChainSection() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const sectionPad = isMobile ? "64px 0" : isTablet ? "76px 0" : "90px 0";

  return (
    <section
      className="relative"
      style={{ padding: sectionPad, background: C.white }}
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
              maxWidth: 540,
              margin: isMobile ? "0" : "0 auto",
              marginBottom: isMobile ? 32 : 48,
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
                  background: C.navyDeep,
                }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  color: C.textMuted,
                  letterSpacing: "0.1em",
                }}
              >
                The coverage chain
              </span>
            </div>
            <h2
              className="mb-3 font-serif font-bold"
              style={{
                fontSize: isMobile ? 24 : 30,
                lineHeight: 1.25,
                color: C.navyDeep,
              }}
            >
              From what you teach to what you can prove
            </h2>
            <p
              style={{
                fontSize: isMobile ? 15 : 16,
                color: C.textSecondary,
                lineHeight: 1.75,
              }}
            >
              Five links. One unbroken thread. Every step lives in the knowledge
              graph and traces back to the ones before it.
            </p>
          </div>
        </Reveal>

        {/* Mobile: vertical chain */}
        {isMobile ? (
          <div className="mb-8 flex flex-col gap-0">
            {chainSteps.map((step, i) => (
              <Reveal key={step.label} delay={i * 0.06}>
                <div className="flex items-start gap-3.5">
                  <div className="flex shrink-0 flex-col items-center">
                    <div
                      className="shrink-0 rounded-full"
                      style={{
                        width: 10,
                        height: 10,
                        background: step.color,
                      }}
                    />
                    {i < chainSteps.length - 1 && (
                      <div
                        className="rounded-sm"
                        style={{
                          width: 2,
                          height: 36,
                          background: C.borderLight,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      paddingBottom: i < chainSteps.length - 1 ? 16 : 0,
                    }}
                  >
                    <div
                      className="mb-0.5 font-mono font-semibold"
                      style={{
                        fontSize: 11,
                        color: step.color,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: C.textMuted,
                        lineHeight: 1.5,
                      }}
                    >
                      {step.desc}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          /* Desktop/Tablet: horizontal chain */
          <div
            className="mb-10 flex items-stretch justify-center"
            style={{ flexWrap: isTablet ? "wrap" : "nowrap" }}
          >
            {chainSteps.map((step, i) => (
              <Reveal key={step.label} delay={i * 0.08}>
                <div className="flex items-center">
                  <div
                    className="rounded-[10px] text-center"
                    style={{
                      padding: isTablet ? "16px 12px" : "20px 16px",
                      background: C.parchment,
                      border: `1px solid ${C.borderLight}`,
                      minWidth: isTablet ? 130 : 150,
                    }}
                  >
                    <div
                      className="mb-1.5 inline-block rounded font-mono font-semibold"
                      style={{
                        fontSize: 11,
                        color: step.color,
                        letterSpacing: "0.08em",
                        background: `${step.color}0A`,
                        padding: "3px 10px",
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        lineHeight: 1.5,
                      }}
                    >
                      {step.desc}
                    </div>
                  </div>
                  {i < chainSteps.length - 1 && (
                    <div style={{ padding: "0 4px" }}>
                      <svg width="20" height="12" viewBox="0 0 24 12">
                        <path
                          d="M0,6 Q6,2 12,6 T24,6"
                          stroke={C.warmGray}
                          strokeWidth="1.5"
                          fill="none"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={0.4}>
          <div
            className="mx-auto rounded-[10px]"
            style={{
              background: C.parchment,
              border: `1px solid ${C.borderLight}`,
              padding: isMobile ? "18px 20px" : "20px 24px",
              maxWidth: 600,
              textAlign: isMobile ? "left" : "center",
            }}
          >
            <p
              style={{
                fontSize: isMobile ? 14 : 15,
                color: C.textSecondary,
                lineHeight: 1.7,
              }}
            >
              When accreditation reviewers ask{" "}
              <strong style={{ color: C.navyDeep }}>
                &ldquo;how do you know your students can do this?&rdquo;
              </strong>{" "}
              — the answer is already woven into the system. No scrambling
              across five platforms. One thread, traced from start to finish.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
