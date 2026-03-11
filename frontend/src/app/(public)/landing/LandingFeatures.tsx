'use client';

import { useState } from 'react';
import { C, sans, serif } from '@/lib/design-tokens';
import { WovenField } from '@/components/atoms/WovenField';
import { Reveal } from '@/components/atoms/Reveal';
import { SectionMarker } from './SectionMarker';
import { FEATURES } from './landing-data';

interface LandingFeaturesProps {
  isMobile: boolean;
  isTablet: boolean;
  sectionPad: string;
  wrap: React.CSSProperties;
}

export function LandingFeatures({ isMobile, isTablet, sectionPad, wrap }: LandingFeaturesProps) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <section style={{ position: "relative", padding: sectionPad, background: C.cream, borderTop: `1px solid ${C.borderLight}`, overflow: "hidden" }}>
      <WovenField color={C.greenDark} opacity={0.015} density={isMobile ? 10 : 24} />
      <div style={{ ...wrap, position: "relative", zIndex: 1 }}>
        <Reveal>
          <div style={{ textAlign: isMobile ? "left" : "center", maxWidth: 560, margin: isMobile ? "0" : "0 auto 56px", marginBottom: isMobile ? 36 : 56 }}>
            <SectionMarker color={C.green} label="What Journey does" />
            <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 32, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 12 }}>One system. Every connection.</h2>
            <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, lineHeight: 1.75, fontFamily: sans }}>Journey OS weaves curriculum, assessment, measurement, and compliance into a single knowledge graph -- so every part of your educational mission connects.</p>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 16 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div style={{ background: C.white, border: `1px solid ${hoveredFeature === i ? C.blueMid : C.borderLight}`, borderRadius: 10, padding: isMobile ? 20 : 24, cursor: "default", transition: "all 0.25s", minHeight: isMobile ? 0 : 180, display: "flex", flexDirection: "column", boxShadow: hoveredFeature === i ? "0 4px 20px rgba(0,44,118,0.06)" : "none" }}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}>
                <span style={{ fontFamily: serif, fontSize: 18, color: C.navyDeep, display: "block", marginBottom: 10 }}>{f.icon}</span>
                <h3 style={{ fontFamily: sans, fontSize: isMobile ? 15 : 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.35, color: C.navyDeep }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65, flex: 1, fontFamily: sans }}>{hoveredFeature === i ? f.detail : f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
