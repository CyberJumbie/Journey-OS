"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { Reveal } from "@web/components/landing/reveal";
import { Counter } from "@web/components/landing/counter";
import { C, stats } from "@web/components/landing/landing-data";

export function StatsSection() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  return (
    <section
      style={{
        padding: isMobile ? "40px 0" : "56px 0",
        background: C.navyDeep,
      }}
    >
      <div
        className="mx-auto grid text-center"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? 28 : 24,
        }}
      >
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <div>
              <div
                className="mb-1 font-serif font-bold text-white"
                style={{ fontSize: isMobile ? 34 : 42 }}
              >
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div
                className="font-mono uppercase"
                style={{
                  fontSize: isMobile ? 10 : 11,
                  color: C.bluePale,
                  letterSpacing: "0.05em",
                  opacity: 0.8,
                }}
              >
                {s.label}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
