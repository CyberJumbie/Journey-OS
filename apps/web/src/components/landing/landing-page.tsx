"use client";

import { useState } from "react";
import { LandingNav } from "@web/components/landing/landing-nav";
import { LandingFooter } from "@web/components/landing/landing-footer";
import { HeroSection } from "@web/components/landing/sections/hero-section";
import { ProblemSection } from "@web/components/landing/sections/problem-section";
import { FeaturesSection } from "@web/components/landing/sections/features-section";
import { StatsSection } from "@web/components/landing/sections/stats-section";
import { HowItWorksSection } from "@web/components/landing/sections/how-it-works-section";
import { BenefitsSection } from "@web/components/landing/sections/benefits-section";
import { CoverageChainSection } from "@web/components/landing/sections/coverage-chain-section";
import { ResearchSection } from "@web/components/landing/sections/research-section";
import { WaitlistSection } from "@web/components/landing/sections/waitlist-section";
import { C, type PersonaKey } from "@web/components/landing/landing-data";

export function LandingPage() {
  const [activePersona, setActivePersona] = useState<PersonaKey>("faculty");

  return (
    <div
      className="min-h-screen overflow-x-hidden font-sans"
      style={{
        background: C.white,
        color: C.textPrimary,
        lineHeight: 1.72,
      }}
    >
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <StatsSection />
      <HowItWorksSection
        key={activePersona}
        activePersona={activePersona}
        onPersonaChange={setActivePersona}
      />
      <BenefitsSection activePersona={activePersona} />
      <CoverageChainSection />
      <ResearchSection />
      <WaitlistSection />
      <LandingFooter />
    </div>
  );
}
