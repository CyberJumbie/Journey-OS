"use client";

import { useState, useSyncExternalStore } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { JourneyLogo } from "@web/components/brand/journey-logo";
import { C } from "@web/components/landing/landing-data";

function useScrollY() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("scroll", cb, { passive: true });
      return () => window.removeEventListener("scroll", cb);
    },
    () => window.scrollY,
    () => 0,
  );
}

export function LandingNav() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";
  const scrollY = useScrollY();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Derive: auto-close mobile nav on desktop
  const mobileNav = isDesktop ? false : mobileNavOpen;

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-[100]"
      style={{
        background: scrollY > 40 ? `${C.white}F0` : C.white,
        backdropFilter: scrollY > 40 ? "blur(12px)" : "none",
        borderBottom: `1px solid ${scrollY > 40 ? C.borderLight : "transparent"}`,
        transition: "all 0.3s ease",
      }}
    >
      <div
        className="mx-auto flex items-center justify-between"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
          height: isMobile ? 56 : 64,
        }}
      >
        <JourneyLogo size={isMobile ? "sm" : "md"} />

        {!isMobile && (
          <div className="flex items-center gap-6">
            <a
              href="#how-it-works"
              className="font-sans text-sm font-medium text-text-secondary no-underline"
            >
              How It Works
            </a>
            <a
              href="#waitlist"
              className="rounded-md font-sans text-[13px] font-semibold text-white no-underline transition-colors"
              style={{
                background: C.navyDeep,
                padding: "8px 20px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.blue;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.navyDeep;
              }}
            >
              Request Early Access
            </a>
          </div>
        )}

        {isMobile && (
          <button
            onClick={() => setMobileNavOpen(!mobileNav)}
            className="flex cursor-pointer flex-col justify-center gap-[5px] border-none bg-transparent p-2"
            aria-label="Menu"
          >
            <span
              className="block rounded-sm bg-navy-deep"
              style={{
                width: 22,
                height: 2,
                transition: "all 0.2s",
                transform: mobileNav ? "rotate(45deg) translateY(7px)" : "none",
              }}
            />
            <span
              className="block rounded-sm bg-navy-deep"
              style={{
                width: 22,
                height: 2,
                transition: "all 0.2s",
                opacity: mobileNav ? 0 : 1,
              }}
            />
            <span
              className="block rounded-sm bg-navy-deep"
              style={{
                width: 22,
                height: 2,
                transition: "all 0.2s",
                transform: mobileNav
                  ? "rotate(-45deg) translateY(-7px)"
                  : "none",
              }}
            />
          </button>
        )}
      </div>

      {isMobile && mobileNav && (
        <div
          className="flex flex-col gap-3"
          style={{
            background: C.white,
            borderTop: `1px solid ${C.borderLight}`,
            padding: "16px 18px 20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <a
            href="#how-it-works"
            onClick={() => setMobileNavOpen(false)}
            className="font-sans text-base font-medium text-text-secondary no-underline"
            style={{ padding: "8px 0" }}
          >
            How It Works
          </a>
          <a
            href="#waitlist"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-md text-center font-sans text-sm font-semibold text-white no-underline"
            style={{
              background: C.navyDeep,
              padding: "12px 20px",
            }}
          >
            Request Early Access
          </a>
        </div>
      )}
    </nav>
  );
}
