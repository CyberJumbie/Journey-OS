'use client';

import { C, sans, serif, mono } from '@/lib/design-tokens';
import { Reveal } from '@/components/atoms/Reveal';
import { SectionMarker } from './SectionMarker';
import { PAIN_CARDS } from './landing-data';

interface LandingProblemProps {
  isMobile: boolean;
  isDesktop: boolean;
  sectionPad: string;
  wrap: React.CSSProperties;
}

export function LandingProblem({ isMobile, isDesktop, sectionPad, wrap }: LandingProblemProps) {
  return (
    <section style={{ position: "relative", padding: sectionPad, background: C.white, borderTop: `1px solid ${C.borderLight}` }}>
      <div style={wrap}>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "380px 1fr" : "1fr", gap: isMobile ? 32 : isDesktop ? 56 : 40, alignItems: "start" }}>
          <Reveal>
            <div style={{ position: isDesktop ? "sticky" : "static", top: 100 }}>
              <SectionMarker color={C.navyDeep} label="The problem" />
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 30, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 16 }}>Medical education runs on disconnected threads.</h2>
              <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, lineHeight: 1.75, fontFamily: sans }}>Faculty plan in one system, write exams in another, deliver in a third, grade in a fourth, and report to accreditors from a fifth. Nothing is woven together.</p>
            </div>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {PAIN_CARDS.map((item, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div style={{ background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: isMobile ? "20px" : "24px 28px", display: isMobile ? "block" : "flex", gap: 20, alignItems: "flex-start", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.blueMid}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.borderLight}>
                  <div style={{ flexShrink: 0, marginBottom: isMobile ? 8 : 0 }}>
                    <span style={{ fontFamily: serif, fontSize: isMobile ? 32 : 36, fontWeight: 700, color: C.navyDeep, lineHeight: 1 }}>{item.stat}</span>
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginTop: 2 }}>{item.unit}</span>
                  </div>
                  <p style={{ fontSize: isMobile ? 14 : 15, color: C.textSecondary, lineHeight: 1.7, paddingTop: isMobile ? 0 : 4, fontFamily: sans }}>{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
