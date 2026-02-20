"use client";

import { useState } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { AscendingSquares } from "@web/components/brand/ascending-squares";
import { Reveal } from "@web/components/landing/reveal";
import {
  C,
  personas,
  type PersonaKey,
} from "@web/components/landing/landing-data";

interface HowItWorksSectionProps {
  activePersona: PersonaKey;
  onPersonaChange: (persona: PersonaKey) => void;
}

export function HowItWorksSection({
  activePersona,
  onPersonaChange,
}: HowItWorksSectionProps) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";
  const sectionPad = isMobile
    ? "64px 0"
    : bp === "tablet"
      ? "76px 0"
      : "90px 0";

  const [activeStep, setActiveStep] = useState(0);

  const currentPersona = personas[activePersona];
  const personaKeys = Object.keys(personas) as PersonaKey[];

  return (
    <section
      id="how-it-works"
      className="relative"
      style={{
        padding: sectionPad,
        background: C.white,
        borderBottom: `1px solid ${C.borderLight}`,
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
        }}
      >
        <Reveal>
          <div style={{ marginBottom: isMobile ? 32 : 48 }}>
            <div className="mb-3.5 flex items-center gap-2">
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  background: C.navyDeep,
                }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  color: C.textMuted,
                  letterSpacing: "0.1em",
                }}
              >
                How it works
              </span>
            </div>
            <h2
              className="mb-2 font-serif font-bold"
              style={{
                fontSize: isMobile ? 24 : 32,
                lineHeight: 1.25,
                color: C.navyDeep,
              }}
            >
              Designed for everyone in the ecosystem
            </h2>
            <p
              style={{
                fontSize: isMobile ? 15 : 16,
                color: C.textSecondary,
                maxWidth: 520,
              }}
            >
              Different roles, different needs, one connected system.
            </p>
          </div>
        </Reveal>

        {/* Persona tabs */}
        <Reveal delay={0.08}>
          <div
            className="flex gap-1"
            style={{
              marginBottom: isMobile ? 28 : 40,
              background: C.parchment,
              borderRadius: 8,
              padding: 4,
              border: `1px solid ${C.borderLight}`,
              width: isMobile ? "100%" : "fit-content",
              overflowX: isMobile ? "auto" : "visible",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {personaKeys.map((key) => (
              <button
                key={key}
                onClick={() => onPersonaChange(key)}
                className="cursor-pointer whitespace-nowrap border-none font-sans transition-all"
                style={{
                  fontSize: 13,
                  fontWeight: activePersona === key ? 700 : 500,
                  color: activePersona === key ? C.white : C.textSecondary,
                  background:
                    activePersona === key
                      ? personas[key].color === C.green
                        ? C.navyDeep
                        : personas[key].color
                      : "transparent",
                  padding: isMobile ? "10px 16px" : "9px 20px",
                  borderRadius: 5,
                  flex: isMobile ? "1 0 auto" : "none",
                }}
              >
                {personas[key].short}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Tagline */}
        <Reveal key={`tagline-${activePersona}`}>
          <p
            className="font-serif font-medium"
            style={{
              fontSize: isMobile ? 18 : 22,
              color: C.navyDeep,
              marginBottom: isMobile ? 24 : 36,
              maxWidth: 540,
              lineHeight: 1.45,
            }}
          >
            &ldquo;{currentPersona.tagline}&rdquo;
          </p>
        </Reveal>

        {/* Step-through */}
        <div
          className="grid items-start"
          style={{
            gridTemplateColumns: isDesktop ? "1fr 400px" : "1fr",
            gap: isMobile ? 20 : 40,
          }}
        >
          {/* Steps list */}
          <div>
            {currentPersona.steps.map((step, i) => (
              <div
                key={`${activePersona}-step-${i}`}
                onClick={() => setActiveStep(i)}
                className="mb-1.5 flex cursor-pointer items-start rounded-lg transition-all"
                style={{
                  gap: isMobile ? 12 : 16,
                  padding: isMobile ? "12px" : "14px 16px",
                  background: activeStep === i ? C.parchment : "transparent",
                  border: `1px solid ${activeStep === i ? C.borderLight : "transparent"}`,
                }}
              >
                <div className="flex shrink-0 flex-col items-center pt-0.5">
                  <div
                    className="flex items-center justify-center rounded-md font-mono transition-all"
                    style={{
                      width: 28,
                      height: 28,
                      background:
                        activeStep === i ? `${C.navyDeep}10` : "transparent",
                      border: `1.5px solid ${activeStep === i ? C.navyDeep : C.border}`,
                      fontSize: 11,
                      color: activeStep === i ? C.navyDeep : C.textMuted,
                      fontWeight: activeStep === i ? 600 : 400,
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < currentPersona.steps.length - 1 && (
                    <div
                      className="mt-1 rounded-sm"
                      style={{
                        width: 1.5,
                        height: 16,
                        background: C.borderLight,
                      }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h4
                    className="mb-0.5 font-sans font-bold transition-colors"
                    style={{
                      fontSize: 15,
                      color: activeStep === i ? C.navyDeep : C.textSecondary,
                    }}
                  >
                    {step.title}
                  </h4>
                  {activeStep === i && (
                    <p
                      className="mt-1"
                      style={{
                        fontSize: 14,
                        color: C.textSecondary,
                        lineHeight: 1.65,
                      }}
                    >
                      {step.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Step detail card */}
          <div
            className="rounded-xl"
            style={{
              background: C.parchment,
              border: `1px solid ${C.borderLight}`,
              padding: isMobile ? 20 : 28,
              position: isDesktop ? "sticky" : "static",
              top: 100,
            }}
          >
            <div className="mb-4 flex items-center gap-2">
              <AscendingSquares
                colors={currentPersona.steps.map((_, i) =>
                  i <= activeStep ? C.navyDeep : C.borderLight,
                )}
                size={8}
                gap={3}
              />
              <span
                className="ml-2 font-mono"
                style={{
                  fontSize: 10,
                  color: C.textMuted,
                  letterSpacing: "0.08em",
                }}
              >
                STEP {activeStep + 1} OF {currentPersona.steps.length}
              </span>
            </div>
            <h3
              className="mb-2.5 font-serif font-bold"
              style={{
                fontSize: isMobile ? 18 : 20,
                lineHeight: 1.3,
                color: C.navyDeep,
              }}
            >
              {currentPersona.steps[activeStep]!.title}
            </h3>
            <p
              style={{
                fontSize: isMobile ? 14 : 15,
                color: C.textSecondary,
                lineHeight: 1.75,
              }}
            >
              {currentPersona.steps[activeStep]!.desc}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="cursor-pointer rounded-md bg-transparent font-sans transition-all"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: isMobile ? "10px 16px" : "8px 16px",
                  border: `1px solid ${activeStep === 0 ? C.borderLight : C.border}`,
                  color: activeStep === 0 ? C.textMuted : C.textSecondary,
                  cursor: activeStep === 0 ? "default" : "pointer",
                }}
              >
                &larr; Back
              </button>
              <button
                onClick={() =>
                  setActiveStep(
                    Math.min(currentPersona.steps.length - 1, activeStep + 1),
                  )
                }
                disabled={activeStep === currentPersona.steps.length - 1}
                className="cursor-pointer rounded-md font-sans transition-all"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: isMobile ? "10px 16px" : "8px 16px",
                  background:
                    activeStep === currentPersona.steps.length - 1
                      ? "transparent"
                      : C.navyDeep,
                  border: `1px solid ${activeStep === currentPersona.steps.length - 1 ? C.borderLight : C.navyDeep}`,
                  color:
                    activeStep === currentPersona.steps.length - 1
                      ? C.textMuted
                      : C.white,
                  cursor:
                    activeStep === currentPersona.steps.length - 1
                      ? "default"
                      : "pointer",
                }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
