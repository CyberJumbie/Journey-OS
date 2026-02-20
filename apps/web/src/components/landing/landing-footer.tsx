"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { JourneyLogo } from "@web/components/brand/journey-logo";
import { C } from "@web/components/landing/landing-data";

export function LandingFooter() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  return (
    <footer
      className="text-center"
      style={{
        padding: isMobile ? "28px 18px" : "36px 24px",
        borderTop: `1px solid ${C.borderLight}`,
        background: C.parchment,
      }}
    >
      <div className="mb-2 flex items-center justify-center">
        <JourneyLogo size="sm" />
      </div>
      <p className="mb-1 font-sans text-[13px] text-text-muted">
        The assessment intelligence platform for medical education
      </p>
      <p className="font-sans text-xs text-text-muted">
        Built at Morehouse School of Medicine · © {new Date().getFullYear()}
      </p>
      <a
        href="/login"
        className="mt-2.5 inline-block font-sans text-xs text-text-muted no-underline transition-colors hover:text-navy-deep"
      >
        Already have access? Sign in →
      </a>
    </footer>
  );
}
