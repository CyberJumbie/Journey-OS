'use client';

import { C, serif, mono } from '@/lib/design-tokens';
import { Reveal } from '@/components/atoms/Reveal';
import { Counter } from '@/components/atoms/Counter';
import { STATS } from './landing-data';

interface LandingStatsProps {
  isMobile: boolean;
  wrap: React.CSSProperties;
}

export function LandingStats({ isMobile, wrap }: LandingStatsProps) {
  return (
    <section style={{ padding: isMobile ? "40px 0" : "56px 0", background: C.navyDeep }}>
      <div style={{ ...wrap, display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 28 : 24, textAlign: "center" }}>
        {STATS.map((s, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <div>
              <div style={{ fontFamily: serif, fontSize: isMobile ? 34 : 42, fontWeight: 700, color: C.white, marginBottom: 4 }}>
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontFamily: mono, fontSize: isMobile ? 10 : 11, color: C.bluePale, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.8 }}>{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
