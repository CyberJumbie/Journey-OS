'use client';

import { C, sans, serif, mono } from '@/lib/design-tokens';

interface LandingFooterProps {
  isMobile: boolean;
}

export function LandingFooter({ isMobile }: LandingFooterProps) {
  return (
    <footer style={{ padding: isMobile ? "28px 18px" : "36px 24px", borderTop: `1px solid ${C.borderLight}`, background: C.parchment, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: C.navyDeep }}>Journey</span>
        <span style={{ fontFamily: mono, fontSize: 8, color: C.greenDark, border: `1px solid ${C.greenDark}`, padding: "1px 5px", borderRadius: 2, letterSpacing: "0.1em" }}>OS</span>
      </div>
      <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginBottom: 4 }}>The assessment intelligence platform for medical education</p>
      <p style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>Built at Morehouse School of Medicine &middot; &copy; {new Date().getFullYear()}</p>
      <a href="/login" style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, textDecoration: "none", display: "inline-block", marginTop: 10, transition: "color 0.2s" }}
        onMouseEnter={e => (e.target as HTMLElement).style.color = C.navyDeep}
        onMouseLeave={e => (e.target as HTMLElement).style.color = C.textMuted}>
        Already have access? Sign in &rarr;
      </a>
    </footer>
  );
}
