'use client';

import { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description?: string;
}

interface OnboardingTemplateProps {
  children: ReactNode;
  steps: OnboardingStep[];
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  isLastStep?: boolean;
  nextLabel?: string;
}

export default function OnboardingTemplate({
  children,
  steps,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  isLastStep = false,
  nextLabel,
}: OnboardingTemplateProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--cream)]">
      {/* Progress Bar */}
      <div className="border-b border-[var(--gray-300)]/40 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div key={step.title} className="flex items-center">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      currentStep > index + 1
                        ? 'bg-[var(--green)] text-white'
                        : currentStep === index + 1
                          ? 'bg-[var(--navy)] text-white'
                          : 'bg-[var(--gray-300)]/40 text-[var(--gray-600)]'
                    }`}
                  >
                    {currentStep > index + 1 ? <Check className="size-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 w-12 transition-colors ${
                        currentStep > index + 1 ? 'bg-[var(--green)]' : 'bg-[var(--gray-300)]/40'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            {onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            )}
          </div>
          <p className="text-sm text-[var(--gray-600)]">
            Step {currentStep} of {totalSteps}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">{children}</div>
      </div>

      {/* Navigation */}
      <div className="border-t border-[var(--gray-300)]/40 bg-white">
        <div className="mx-auto flex max-w-4xl justify-between px-6 py-4">
          <Button variant="outline" onClick={onBack} disabled={currentStep === 1}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={onNext}>
            {nextLabel ?? (isLastStep ? 'Get Started' : 'Continue')}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
