'use client';

import { useState, useEffect } from 'react';
import { C, sans } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { LandingNav } from './landing/LandingNav';
import { LandingHero } from './landing/LandingHero';
import { LandingProblem } from './landing/LandingProblem';
import { LandingFeatures } from './landing/LandingFeatures';
import { LandingStats } from './landing/LandingStats';
import { LandingPersonas } from './landing/LandingPersonas';
import { LandingChain } from './landing/LandingChain';
import { LandingResearch } from './landing/LandingResearch';
import { LandingWaitlist } from './landing/LandingWaitlist';
import { LandingFooter } from './landing/LandingFooter';

export default function LandingPage() {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const isDesktop = bp === 'desktop';

  const [scrollY, setScrollY] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isDesktop) setMobileNav(false);
  }, [isDesktop]);

  const wrap: React.CSSProperties = {
    maxWidth: 1120,
    margin: '0 auto',
    padding: isMobile ? '0 18px' : '0 28px',
  };

  const sectionPad = isMobile
    ? '64px 0'
    : isTablet
      ? '76px 0'
      : '90px 0';

  return (
    <div
      style={{
        background: C.white,
        color: C.textPrimary,
        fontFamily: sans,
        minHeight: '100vh',
        overflowX: 'hidden',
        lineHeight: 1.72,
        fontSize: isMobile ? 15 : 16,
      }}
    >
      <LandingNav scrollY={scrollY} isMobile={isMobile} mobileNav={mobileNav} setMobileNav={setMobileNav} wrap={wrap} />
      <LandingHero isMobile={isMobile} isTablet={isTablet} isDesktop={isDesktop} wrap={wrap} />
      <LandingProblem isMobile={isMobile} isDesktop={isDesktop} sectionPad={sectionPad} wrap={wrap} />
      <LandingFeatures isMobile={isMobile} isTablet={isTablet} sectionPad={sectionPad} wrap={wrap} />
      <LandingStats isMobile={isMobile} wrap={wrap} />
      <LandingPersonas isMobile={isMobile} isDesktop={isDesktop} sectionPad={sectionPad} wrap={wrap} />
      <LandingChain isMobile={isMobile} isTablet={isTablet} sectionPad={sectionPad} wrap={wrap} />
      <LandingResearch isMobile={isMobile} wrap={wrap} />
      <LandingWaitlist isMobile={isMobile} isDesktop={isDesktop} wrap={wrap} />
      <LandingFooter isMobile={isMobile} />
    </div>
  );
}
