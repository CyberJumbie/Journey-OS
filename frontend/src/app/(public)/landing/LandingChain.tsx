'use client';

import { C, sans, serif, mono } from '@/lib/design-tokens';
import { Reveal } from '@/components/atoms/Reveal';
import { SectionMarker } from './SectionMarker';
import { CHAIN_STEPS } from './landing-data';

interface LandingChainProps {
  isMobile: boolean;
  isTablet: boolean;
  sectionPad: string;
  wrap: React.CSSProperties;
}

export function LandingChain({ isMobile, isTablet, sectionPad, wrap }: LandingChainProps) {
  return (
    <section style={{ position: "relative", padding: sectionPad, background: C.white }}>
      <div style={wrap}>
        <Reveal>
          <div style={{ textAlign: isMobile ? "left" : "center", maxWidth: 540, margin: isMobile ? "0" : "0 auto", marginBottom: isMobile ? 32 : 48 }}>
            <SectionMarker color={C.navyDeep} label="The coverage chain" />
            <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 30, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 12 }}>From what you teach to what you can prove</h2>
            <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, lineHeight: 1.75, fontFamily: sans }}>Five links. One unbroken thread. Every step lives in the knowledge graph and traces back to the ones before it.</p>
          </div>
        </Reveal>
        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
            {CHAIN_STEPS.map((step, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: step.color, flexShrink: 0 }} />
                    {i < CHAIN_STEPS.length - 1 && <div style={{ width: 2, height: 36, background: C.borderLight, borderRadius: 1 }} />}
                  </div>
                  <div style={{ paddingBottom: i < CHAIN_STEPS.length - 1 ? 16 : 0 }}>
                    <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: step.color, letterSpacing: "0.08em", marginBottom: 2 }}>{step.label}</div>
                    <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, fontFamily: sans }}>{step.desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "stretch", justifyContent: "center", gap: 0, marginBottom: 40, flexWrap: isTablet ? "wrap" : "nowrap" }}>
            {CHAIN_STEPS.map((step, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ textAlign: "center", padding: isTablet ? "16px 12px" : "20px 16px", background: C.parchment, borderRadius: 10, border: `1px solid ${C.borderLight}`, minWidth: isTablet ? 130 : 150 }}>
                    <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: step.color, letterSpacing: "0.08em", marginBottom: 6, background: `${step.color}0A`, padding: "3px 10px", borderRadius: 4, display: "inline-block" }}>{step.label}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, fontFamily: sans }}>{step.desc}</div>
                  </div>
                  {i < CHAIN_STEPS.length - 1 && (
                    <div style={{ padding: "0 4px", color: C.warmGray, fontSize: 16 }}>
                      <svg width="20" height="12" viewBox="0 0 24 12"><path d="M0,6 Q6,2 12,6 T24,6" stroke={C.warmGray} strokeWidth="1.5" fill="none" /></svg>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        )}
        <Reveal delay={0.4}>
          <div style={{ background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: isMobile ? "18px 20px" : "20px 24px", maxWidth: 600, margin: "0 auto", textAlign: isMobile ? "left" : "center" }}>
            <p style={{ fontSize: isMobile ? 14 : 15, color: C.textSecondary, lineHeight: 1.7, fontFamily: sans }}>
              When accreditation reviewers ask <strong style={{ color: C.navyDeep }}>&ldquo;how do you know your students can do this?&rdquo;</strong> -- the answer is already woven into the system.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
