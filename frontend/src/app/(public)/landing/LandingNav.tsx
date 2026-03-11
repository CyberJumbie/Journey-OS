'use client';

import { C, sans, serif, mono } from '@/lib/design-tokens';

interface LandingNavProps {
  scrollY: number;
  isMobile: boolean;
  mobileNav: boolean;
  setMobileNav: (v: boolean) => void;
  wrap: React.CSSProperties;
}

export function LandingNav({ scrollY, isMobile, mobileNav, setMobileNav, wrap }: LandingNavProps) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrollY > 40 ? `${C.white}F0` : C.white,
      backdropFilter: scrollY > 40 ? "blur(12px)" : "none",
      borderBottom: `1px solid ${scrollY > 40 ? C.borderLight : "transparent"}`,
      transition: "all 0.3s ease",
    }}>
      <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? 56 : 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: serif, fontSize: isMobile ? 19 : 22, fontWeight: 700, color: C.navyDeep }}>Journey</span>
          <span style={{ fontFamily: mono, fontSize: 9, color: C.greenDark, letterSpacing: "0.1em", border: `1.5px solid ${C.greenDark}`, padding: "2px 7px", borderRadius: 3 }}>OS</span>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#how-it-works" style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, textDecoration: "none", fontWeight: 500 }}>How It Works</a>
            <a href="#waitlist" style={{
              fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.white,
              background: C.navyDeep, padding: "8px 20px", borderRadius: 6, textDecoration: "none", transition: "all 0.2s",
            }}
              onMouseEnter={e => (e.target as HTMLElement).style.background = C.blue}
              onMouseLeave={e => (e.target as HTMLElement).style.background = C.navyDeep}>
              Request Early Access
            </a>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileNav(!mobileNav)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", flexDirection: "column", gap: 5 }} aria-label="Menu">
            <span style={{ display: "block", width: 22, height: 2, background: C.navyDeep, borderRadius: 1, transition: "all 0.2s", transform: mobileNav ? "rotate(45deg) translateY(7px)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: C.navyDeep, borderRadius: 1, transition: "all 0.2s", opacity: mobileNav ? 0 : 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: C.navyDeep, borderRadius: 1, transition: "all 0.2s", transform: mobileNav ? "rotate(-45deg) translateY(-7px)" : "none" }} />
          </button>
        )}
      </div>
      {isMobile && mobileNav && (
        <div style={{ background: C.white, borderTop: `1px solid ${C.borderLight}`, padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
          <a href="#how-it-works" onClick={() => setMobileNav(false)} style={{ fontFamily: sans, fontSize: 16, color: C.textSecondary, textDecoration: "none", fontWeight: 500, padding: "8px 0" }}>How It Works</a>
          <a href="#waitlist" onClick={() => setMobileNav(false)} style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, background: C.navyDeep, padding: "12px 20px", borderRadius: 6, textDecoration: "none", textAlign: "center" }}>Request Early Access</a>
        </div>
      )}
    </nav>
  );
}
