'use client';

import { useState, useEffect } from 'react';
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { AscendingSquares } from '@/components/atoms/AscendingSquares';
import { Reveal } from '@/components/atoms/Reveal';
import { SectionMarker } from './SectionMarker';
import { PERSONAS } from './landing-data';

interface LandingPersonasProps {
  isMobile: boolean;
  isDesktop: boolean;
  sectionPad: string;
  wrap: React.CSSProperties;
}

export function LandingPersonas({ isMobile, isDesktop, sectionPad, wrap }: LandingPersonasProps) {
  const [activePersona, setActivePersona] = useState("faculty");
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => { setActiveStep(0); }, [activePersona]);

  const currentPersona = PERSONAS[activePersona];
  const personaKeys = Object.keys(PERSONAS);

  return (
    <>
      {/* How it works (persona stepper) */}
      <section id="how-it-works" style={{ position: "relative", padding: sectionPad, background: C.white, borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={wrap}>
          <Reveal>
            <div style={{ marginBottom: isMobile ? 32 : 48 }}>
              <SectionMarker color={C.navyDeep} label="How it works" />
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 32, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 8 }}>Designed for everyone in the ecosystem</h2>
              <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, maxWidth: 520, fontFamily: sans }}>Different roles, different needs, one connected system.</p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div style={{ display: "flex", gap: 4, marginBottom: isMobile ? 28 : 40, background: C.parchment, borderRadius: 8, padding: 4, border: `1px solid ${C.borderLight}`, width: isMobile ? "100%" : "fit-content", overflowX: isMobile ? "auto" : "visible" }}>
              {personaKeys.map(key => (
                <button key={key} onClick={() => setActivePersona(key)} style={{
                  fontFamily: sans, fontSize: 13, fontWeight: activePersona === key ? 700 : 500,
                  color: activePersona === key ? C.white : C.textSecondary,
                  background: activePersona === key ? (PERSONAS[key].color === C.green ? C.navyDeep : PERSONAS[key].color) : "transparent",
                  border: "none", padding: isMobile ? "10px 16px" : "9px 20px", borderRadius: 5, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap", flex: isMobile ? "1 0 auto" : "none",
                }}>{PERSONAS[key].short}</button>
              ))}
            </div>
          </Reveal>
          <Reveal key={`tagline-${activePersona}`}>
            <p style={{ fontFamily: serif, fontSize: isMobile ? 18 : 22, fontWeight: 500, color: C.navyDeep, marginBottom: isMobile ? 24 : 36, maxWidth: 540, lineHeight: 1.45 }}>
              &ldquo;{currentPersona.tagline}&rdquo;
            </p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 400px" : "1fr", gap: isMobile ? 20 : 40, alignItems: "start" }}>
            <div>
              {currentPersona.steps.map((step, i) => (
                <div key={`${activePersona}-step-${i}`} onClick={() => setActiveStep(i)} style={{ display: "flex", gap: isMobile ? 12 : 16, alignItems: "flex-start", padding: isMobile ? "12px" : "14px 16px", borderRadius: 8, cursor: "pointer", marginBottom: 6, background: activeStep === i ? C.parchment : "transparent", border: `1px solid ${activeStep === i ? C.borderLight : "transparent"}`, transition: "all 0.2s" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 2 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: activeStep === i ? `${C.navyDeep}10` : "transparent", border: `1.5px solid ${activeStep === i ? C.navyDeep : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 11, color: activeStep === i ? C.navyDeep : C.textMuted, fontWeight: activeStep === i ? 600 : 400, transition: "all 0.2s" }}>{i + 1}</div>
                    {i < currentPersona.steps.length - 1 && <div style={{ width: 1.5, height: 16, background: C.borderLight, marginTop: 4, borderRadius: 1 }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, marginBottom: 2, color: activeStep === i ? C.navyDeep : C.textSecondary, transition: "color 0.2s" }}>{step.title}</h4>
                    {activeStep === i && <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65, marginTop: 4, fontFamily: sans }}>{step.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: isMobile ? 20 : 28, position: isDesktop ? "sticky" : "static", top: 100 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <AscendingSquares colors={currentPersona.steps.map((_, i) => i <= activeStep ? C.navyDeep : C.borderLight)} size={8} gap={3} />
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", marginLeft: 8 }}>STEP {activeStep + 1} OF {currentPersona.steps.length}</span>
              </div>
              <h3 style={{ fontFamily: serif, fontSize: isMobile ? 18 : 20, fontWeight: 700, marginBottom: 10, lineHeight: 1.3, color: C.navyDeep }}>{currentPersona.steps[activeStep].title}</h3>
              <p style={{ fontSize: isMobile ? 14 : 15, color: C.textSecondary, lineHeight: 1.75, fontFamily: sans }}>{currentPersona.steps[activeStep].desc}</p>
              <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                <button onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0} style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, padding: isMobile ? "10px 16px" : "8px 16px", borderRadius: 6, cursor: activeStep === 0 ? "default" : "pointer", background: "transparent", border: `1px solid ${activeStep === 0 ? C.borderLight : C.border}`, color: activeStep === 0 ? C.textMuted : C.textSecondary, transition: "all 0.2s" }}>&larr; Back</button>
                <button onClick={() => setActiveStep(Math.min(currentPersona.steps.length - 1, activeStep + 1))} disabled={activeStep === currentPersona.steps.length - 1} style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, padding: isMobile ? "10px 16px" : "8px 16px", borderRadius: 6, cursor: activeStep === currentPersona.steps.length - 1 ? "default" : "pointer", background: activeStep === currentPersona.steps.length - 1 ? "transparent" : C.navyDeep, border: `1px solid ${activeStep === currentPersona.steps.length - 1 ? C.borderLight : C.navyDeep}`, color: activeStep === currentPersona.steps.length - 1 ? C.textMuted : C.white, transition: "all 0.2s" }}>Next &rarr;</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Persona Benefits */}
      <LandingBenefits
        isMobile={isMobile}
        sectionPad={sectionPad}
        wrap={wrap}
        activePersona={activePersona}
        currentPersona={currentPersona}
      />
    </>
  );
}

/* Benefits sub-section -- co-located because it depends on persona state */
function LandingBenefits({ isMobile, sectionPad, wrap, activePersona, currentPersona }: {
  isMobile: boolean;
  sectionPad: string;
  wrap: React.CSSProperties;
  activePersona: string;
  currentPersona: typeof PERSONAS[string];
}) {
  return (
    <section style={{ position: "relative", padding: sectionPad, background: C.cream, borderBottom: `1px solid ${C.borderLight}`, overflow: "hidden" }}>
      <div style={{ ...wrap, position: "relative", zIndex: 1 }}>
        <Reveal>
          <div style={{ marginBottom: isMobile ? 28 : 48 }}>
            <SectionMarker color={C.green} label="Benefits" />
            <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 32, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep }}>What changes for {currentPersona.short.toLowerCase()}</h2>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: isMobile ? 12 : 16 }}>
          {currentPersona.benefits.map((b, i) => (
            <Reveal key={`${activePersona}-benefit-${i}`} delay={i * 0.08}>
              <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: isMobile ? 20 : 24, transition: "border-color 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,44,118,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.boxShadow = "none"; }}>
                <h3 style={{ fontFamily: sans, fontSize: isMobile ? 15 : 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.35, color: C.navyDeep }}>{b.title}</h3>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, fontFamily: sans }}>{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
        {activePersona !== "students" && (
          <Reveal delay={0.3}>
            <div style={{ marginTop: isMobile ? 20 : 32, background: `linear-gradient(135deg, ${C.navyDeep} 0%, ${C.blue} 100%)`, borderRadius: 12, padding: isMobile ? "20px" : "28px 32px", display: isMobile ? "block" : "flex", gap: 24, alignItems: "center" }}>
              <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: isMobile ? 12 : 0 }}>
                <span style={{ fontSize: 22 }}>&#127891;</span>
              </div>
              <div>
                <h4 style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>And for students?</h4>
                <p style={{ fontSize: 14, color: C.bluePale, lineHeight: 1.65, fontFamily: sans }}>Practice materials aligned to their actual courses. A mastery map that shows where they stand -- concept by concept -- before exam day.</p>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
