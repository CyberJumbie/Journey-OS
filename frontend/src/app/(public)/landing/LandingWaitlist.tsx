'use client';

import { useState, useCallback } from 'react';
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { WovenField } from '@/components/atoms/WovenField';
import { AscendingSquares } from '@/components/atoms/AscendingSquares';
import { Reveal } from '@/components/atoms/Reveal';
import { ThreadDivider } from './ThreadDivider';
import { PILLAR_COLORS } from './landing-data';

interface LandingWaitlistProps {
  isMobile: boolean;
  isDesktop: boolean;
  wrap: React.CSSProperties;
}

export function LandingWaitlist({ isMobile, isDesktop, wrap }: LandingWaitlistProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [institution, setInstitution] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (email && role) setSubmitted(true);
  }, [email, role]);

  return (
    <section id="waitlist" style={{ position: "relative", padding: isMobile ? "64px 0" : "100px 0", background: C.white, overflow: "hidden" }}>
      <WovenField color={C.navyDeep} opacity={0.015} density={isMobile ? 10 : 16} />
      <div style={{ ...wrap, position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 420px" : "1fr", gap: isMobile ? 32 : 56, alignItems: "center" }}>
          <Reveal>
            <div>
              <AscendingSquares colors={PILLAR_COLORS} size={isMobile ? 12 : 14} gap={4} style={{ marginBottom: 20 }} />
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 26 : 34, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 16 }}>Be part of the journey.</h2>
              <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, lineHeight: 1.75, marginBottom: 20, fontFamily: sans }}>We&apos;re building Journey OS with the people who&apos;ll use it. Join the waitlist to get early access and help shape the platform.</p>
              <ThreadDivider color={C.warmGray} />
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, marginTop: 16, fontStyle: "italic", fontFamily: sans }}>A single thread is fragile. Many, woven together, gain strength.</p>
            </div>
          </Reveal>
          {submitted ? (
            <Reveal>
              <div style={{ background: C.parchment, border: `1px solid ${C.green}30`, borderRadius: 12, padding: isMobile ? 24 : 32, textAlign: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${C.green}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22, color: C.green }}>&check;</div>
                <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>You&apos;re on the list.</h3>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65, fontFamily: sans }}>We&apos;ll reach out when your spot opens.</p>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.1}>
              <div style={{ background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: isMobile ? 20 : 28, boxShadow: "0 8px 32px rgba(0,44,118,0.04)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@institution.edu"
                      style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontFamily: sans, fontSize: 15, outline: "none", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor = C.blueMid}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                  <div>
                    <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>My role</label>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 6 }}>
                      {[
                        { value: "admin", label: "Institutional Leader" },
                        { value: "faculty", label: "Faculty" },
                        { value: "advisor", label: "Advisor" },
                        { value: "student", label: "Student" },
                      ].map(opt => (
                        <button key={opt.value} onClick={() => setRole(opt.value)} style={{
                          fontFamily: sans, fontSize: 13, fontWeight: 500, padding: isMobile ? "10px 8px" : "8px 12px", borderRadius: 6, cursor: "pointer",
                          background: role === opt.value ? `${C.navyDeep}0A` : C.white,
                          border: `1.5px solid ${role === opt.value ? C.navyDeep : C.border}`,
                          color: role === opt.value ? C.navyDeep : C.textSecondary, transition: "all 0.2s", textAlign: "center",
                        }}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Institution <span style={{ opacity: 0.5 }}>(optional)</span>
                    </label>
                    <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Morehouse School of Medicine"
                      style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontFamily: sans, fontSize: 15, outline: "none", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor = C.blueMid}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                  <button onClick={() => handleSubmit()} disabled={!email || !role} style={{
                    fontFamily: sans, fontSize: 15, fontWeight: 700, padding: isMobile ? "14px 24px" : "13px 24px", borderRadius: 7, border: "none",
                    cursor: (!email || !role) ? "default" : "pointer",
                    background: (!email || !role) ? C.warmGray : C.navyDeep,
                    color: (!email || !role) ? C.textMuted : C.white, transition: "all 0.2s", marginTop: 4,
                  }}
                    onMouseEnter={e => { if (email && role) (e.target as HTMLElement).style.background = C.blue; }}
                    onMouseLeave={e => { if (email && role) (e.target as HTMLElement).style.background = C.navyDeep; }}>
                    Join the Waitlist
                  </button>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
