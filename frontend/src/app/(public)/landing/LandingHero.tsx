'use client';

import { C, sans, serif, mono } from '@/lib/design-tokens';
import { WovenField } from '@/components/atoms/WovenField';
import { AscendingSquares } from '@/components/atoms/AscendingSquares';
import { Reveal } from '@/components/atoms/Reveal';

interface LandingHeroProps {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  wrap: React.CSSProperties;
}

export function LandingHero({ isMobile, isTablet, isDesktop, wrap }: LandingHeroProps) {
  return (
    <section style={{
      position: "relative", overflow: "hidden", minHeight: isMobile ? "auto" : "100vh",
      display: "flex", alignItems: "center", paddingTop: isMobile ? 80 : 0, paddingBottom: isMobile ? 48 : 0,
      background: `linear-gradient(170deg, ${C.white} 0%, ${C.cream} 40%, ${C.parchment} 100%)`,
    }}>
      <WovenField color={C.navyDeep} opacity={0.025} density={isMobile ? 12 : 22} />
      {!isMobile && (
        <>
          <div style={{ position: "absolute", top: 120, right: 60, opacity: 0.12 }}>
            <AscendingSquares colors={[C.navyDeep, C.blue, C.blueMid, C.green]} size={32} gap={8} />
          </div>
          <div style={{ position: "absolute", bottom: 80, left: 40, opacity: 0.08 }}>
            <AscendingSquares colors={[C.greenDark, C.green, C.blueLight, C.bluePale]} size={20} gap={5} />
          </div>
        </>
      )}
      <div style={{ ...wrap, position: "relative", zIndex: 1, paddingTop: isMobile ? 24 : 100, paddingBottom: isMobile ? 24 : 80 }}>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 340px" : "1fr", gap: isMobile ? 36 : 60, alignItems: "center" }}>
          <div>
            <Reveal>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 14 : 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: C.green }} />
                <span style={{ fontFamily: mono, fontSize: isMobile ? 10 : 11, color: C.greenDark, letterSpacing: "0.1em", textTransform: "uppercase" }}>Built at Morehouse School of Medicine</span>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 style={{ fontFamily: serif, fontSize: isMobile ? 30 : isTablet ? 38 : 54, fontWeight: 700, lineHeight: 1.18, marginBottom: 20, letterSpacing: "-0.015em", color: C.navyDeep, maxWidth: isMobile ? "100%" : 600 }}>
                Every thread of your curriculum, woven into one connected system.
              </h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p style={{ fontSize: isMobile ? 16 : 18, color: C.textSecondary, lineHeight: 1.8, maxWidth: isMobile ? "100%" : 520, marginBottom: 12 }}>
                Faculty create better assessments in less time. Advisors see where students need help before grades tell the story. Institutions prove educational quality with evidence that traces itself.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p style={{ fontSize: isMobile ? 15 : 16, color: C.textMuted, lineHeight: 1.75, maxWidth: isMobile ? "100%" : 520, marginBottom: isMobile ? 28 : 36 }}>
                And students? They get practice aligned to what they&apos;re actually learning, with a mastery map that grows alongside them.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="#waitlist" style={{ fontFamily: sans, fontSize: isMobile ? 14 : 15, fontWeight: 600, color: C.white, background: C.navyDeep, padding: isMobile ? "12px 24px" : "13px 28px", borderRadius: 7, textDecoration: "none", transition: "all 0.2s", display: "inline-block", flex: isMobile ? "1 1 100%" : "none", textAlign: "center" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = C.blue; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = C.navyDeep; }}>Request Early Access</a>
                <a href="#how-it-works" style={{ fontFamily: sans, fontSize: isMobile ? 14 : 15, fontWeight: 500, color: C.navyDeep, border: `1.5px solid ${C.border}`, padding: isMobile ? "12px 24px" : "13px 28px", borderRadius: 7, textDecoration: "none", transition: "all 0.2s", display: "inline-block", flex: isMobile ? "1 1 100%" : "none", textAlign: "center" }}
                  onMouseEnter={e => { const el = e.target as HTMLElement; el.style.borderColor = C.blueMid; el.style.color = C.blue; }}
                  onMouseLeave={e => { const el = e.target as HTMLElement; el.style.borderColor = C.border; el.style.color = C.navyDeep; }}>See How It Works</a>
              </div>
            </Reveal>
          </div>
          {!isMobile && (
            <Reveal delay={0.25}>
              <div style={{ position: "relative", maxWidth: isTablet ? 280 : 340, margin: isTablet ? "0 auto" : undefined }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, transform: "rotate(2deg)" }}>
                  {[
                    { bg: C.navyDeep, label: "Curriculum", sub: "Knowledge Graph" },
                    { bg: C.blue, label: "Assessment", sub: "AI-Generated" },
                    { bg: C.green, label: "Measurement", sub: "Student Mastery" },
                    { bg: C.blueMid, label: "Compliance", sub: "Accreditation" },
                  ].map((sq, i) => (
                    <div key={i} style={{ background: sq.bg, borderRadius: 10, padding: isTablet ? 16 : 20, aspectRatio: "1", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px)` }} />
                      <span style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2, position: "relative" }}>{sq.sub}</span>
                      <span style={{ fontFamily: serif, fontSize: isTablet ? 14 : 16, color: C.white, fontWeight: 600, position: "relative" }}>{sq.label}</span>
                    </div>
                  ))}
                </div>
                <svg style={{ position: "absolute", top: -20, left: -20, right: -20, bottom: -20, pointerEvents: "none" }} viewBox="0 0 380 380">
                  <path d="M0,190 Q95,170 190,190 T380,190" stroke={C.warmGray} strokeWidth="1" fill="none" opacity="0.4" />
                  <path d="M190,0 Q170,95 190,190 T190,380" stroke={C.warmGray} strokeWidth="1" fill="none" opacity="0.3" />
                </svg>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
