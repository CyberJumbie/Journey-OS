'use client';

import { useState } from 'react';
import { C, serif, mono } from '@/lib/design-tokens';
import { Reveal } from '@/components/atoms/Reveal';
import { SectionMarker } from './SectionMarker';

interface LandingResearchProps {
  isMobile: boolean;
  wrap: React.CSSProperties;
}

const RESEARCH = [
  { author: "Mislevy et al.", framework: "Evidence-Centered Design", area: "Assessment Validity", detail: "A framework for designing assessments where every question is built from a chain of claims about what students know, evidence that would support those claims, and tasks that produce that evidence." },
  { author: "Corbett & Anderson", framework: "Bayesian Knowledge Tracing", area: "Mastery Estimation", detail: "A probabilistic model that estimates what a student knows based on their response history." },
  { author: "Roediger & Karpicke", framework: "Testing Effect", area: "Learning Science", detail: "The finding that actively retrieving information from memory strengthens long-term retention more effectively than re-reading." },
  { author: "Van der Linden", framework: "Item Response Theory", area: "Psychometric Measurement", detail: "A statistical framework that models how individual test questions behave -- their difficulty, how well they distinguish strong from weak students." },
];

export function LandingResearch({ isMobile, wrap }: LandingResearchProps) {
  const [hoveredResearch, setHoveredResearch] = useState<number | null>(null);

  return (
    <section style={{ padding: isMobile ? "52px 0" : "72px 0", background: C.cream, borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}` }}>
      <div style={wrap}>
        <Reveal>
          <div style={{ textAlign: isMobile ? "left" : "center", marginBottom: isMobile ? 24 : 36 }}>
            <SectionMarker color={C.greenDark} label="Research-grounded" />
            <h2 style={{ fontFamily: serif, fontSize: isMobile ? 22 : 26, fontWeight: 700, lineHeight: 1.3, color: C.navyDeep }}>Built on real science, not just AI hype</h2>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 12 }}>
          {RESEARCH.map((r, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div style={{ background: C.white, border: `1px solid ${hoveredResearch === i ? C.blueMid : C.borderLight}`, borderRadius: 8, padding: isMobile ? 14 : 18, textAlign: "center", cursor: "default", transition: "all 0.25s", minHeight: isMobile ? 0 : 140, display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: hoveredResearch === i ? "0 4px 20px rgba(0,44,118,0.06)" : "none" }}
                onMouseEnter={() => setHoveredResearch(i)}
                onMouseLeave={() => setHoveredResearch(null)}>
                <div style={{ fontFamily: mono, fontSize: 9, color: C.greenDark, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{r.area}</div>
                <div style={{ fontFamily: serif, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.navyDeep, marginBottom: hoveredResearch === i ? 8 : 4, lineHeight: 1.35, transition: "margin 0.2s" }}>{r.framework}</div>
                {hoveredResearch === i ? (
                  <div style={{ fontSize: isMobile ? 11 : 12, color: C.textSecondary, lineHeight: 1.6 }}>{r.detail}</div>
                ) : (
                  <div style={{ fontSize: isMobile ? 11 : 12, color: C.textMuted }}>{r.author}</div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
