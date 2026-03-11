'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardRoute } from '@/lib/onboarding-redirect';
import type { UserRole } from '@journey-os/shared-types';

interface OnboardingOptions {
  totalSteps: number;
  role: UserRole;
}

export function useOnboarding({ totalSteps, role }: OnboardingOptions) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<number, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const saveStep = useCallback(async (step: number, data: unknown) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/users/me/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      });
      if (!res.ok) throw new Error('Save failed');
      setStepData(prev => ({ ...prev, [step]: data }));
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }, []);

  const nextStep = useCallback(async (data?: unknown) => {
    if (data !== undefined) {
      await saveStep(currentStep, data);
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1);
    }
  }, [currentStep, totalSteps, saveStep]);

  const prevStep = useCallback(() => {
    setCurrentStep(s => Math.max(0, s - 1));
  }, []);

  const skipStep = useCallback(async () => {
    await saveStep(currentStep, { skipped: true });
    setCurrentStep(s => s + 1);
  }, [currentStep, saveStep]);

  const complete = useCallback(async (finalData?: unknown) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/users/me/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: totalSteps,
          data: finalData,
          completed: true,
        }),
      });
      if (!res.ok) throw new Error('Completion failed');
      router.replace(getDashboardRoute(role));
    } catch {
      setError("Couldn't complete setup. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [totalSteps, role, router]);

  return {
    currentStep,
    stepData,
    saving,
    error,
    nextStep,
    prevStep,
    skipStep,
    complete,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
  };
}
