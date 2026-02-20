"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { Reveal } from "@web/components/landing/reveal";
import { C } from "@web/components/landing/landing-data";

const painCards = [
  {
    stat: "40+",
    unit: "hours",
    desc: "to create a single quality exam. Faculty expertise spent on formatting and logistics instead of teaching and mentoring.",
  },
  {
    stat: "0",
    unit: "connections",
    desc: "between your curriculum plan and your assessment data. They exist in separate systems, maintained by separate people, on separate timelines.",
  },
  {
    stat: "62%",
    unit: "gap",
    desc: "between what institutions intend to teach and what their assessments actually measure. Most schools don't know this gap exists until an accreditation visit.",
  },
];

export function ProblemSection() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";
  const sectionPad = isMobile ? "64px 0" : isTablet ? "76px 0" : "90px 0";

  return (
    <section
      className="relative"
      style={{
        padding: sectionPad,
        background: C.white,
        borderTop: `1px solid ${C.borderLight}`,
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
        }}
      >
        <div
          className="grid items-start"
          style={{
            gridTemplateColumns: isDesktop ? "380px 1fr" : "1fr",
            gap: isMobile ? 32 : isTablet ? 40 : 56,
          }}
        >
          <Reveal>
            <div
              style={{
                position: isDesktop ? "sticky" : "static",
                top: 100,
              }}
            >
              <div className="mb-3.5 flex items-center gap-2">
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
                  The problem
                </span>
              </div>
              <h2
                className="font-serif font-bold"
                style={{
                  fontSize: isMobile ? 24 : 30,
                  lineHeight: 1.25,
                  color: C.navyDeep,
                  marginBottom: 16,
                }}
              >
                Medical education runs on disconnected threads.
              </h2>
              <p
                style={{
                  fontSize: isMobile ? 15 : 16,
                  color: C.textSecondary,
                  lineHeight: 1.75,
                }}
              >
                Faculty plan in one system, write exams in another, deliver in a
                third, grade in a fourth, and report to accreditors from a
                fifth. Nothing is woven together.
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col gap-3.5">
            {painCards.map((item, i) => (
              <Reveal key={item.stat} delay={i * 0.1}>
                <div
                  className="rounded-[10px] transition-colors"
                  style={{
                    background: C.parchment,
                    border: `1px solid ${C.borderLight}`,
                    padding: isMobile ? "20px" : "24px 28px",
                    display: isMobile ? "block" : "flex",
                    gap: 20,
                    alignItems: "flex-start",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.blueMid;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.borderLight;
                  }}
                >
                  <div
                    className="shrink-0"
                    style={{ marginBottom: isMobile ? 8 : 0 }}
                  >
                    <span
                      className="font-serif font-bold"
                      style={{
                        fontSize: isMobile ? 32 : 36,
                        color: C.navyDeep,
                        lineHeight: 1,
                      }}
                    >
                      {item.stat}
                    </span>
                    <span
                      className="mt-0.5 block font-mono"
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {item.unit}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: isMobile ? 14 : 15,
                      color: C.textSecondary,
                      lineHeight: 1.7,
                      paddingTop: isMobile ? 0 : 4,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
