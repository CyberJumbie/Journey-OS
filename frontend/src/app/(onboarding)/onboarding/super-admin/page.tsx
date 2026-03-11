'use client';

import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2, Shield } from 'lucide-react';

const CHECKLIST = [
  'Review pending institution applications',
  'Import LCME-accredited institutions',
  'Invite additional administrators',
  'Configure platform settings',
];

export default function SuperAdminOnboarding() {
  const { currentStep, saving, error, nextStep, prevStep, complete, isFirst, isLast } =
    useOnboarding({ totalSteps: 2, role: 'superadmin' });

  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const progress = ((currentStep + 1) / 2) * 100;
  const canContinue = displayName.trim().length > 0;

  const handleContinue = () => {
    nextStep({ display_name: displayName.trim(), title: title.trim(), phone: phone.trim(), timezone });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#FFF9E6] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="size-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome, Super Admin!</h1>
          <p className="text-muted-foreground">Let&apos;s set up your platform account</p>
        </div>
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep + 1} of 2</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Profile Setup</h2>
                  <p className="text-muted-foreground">Tell us a bit about yourself</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input id="displayName" placeholder="Dr. Jane Smith" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (optional)</Label>
                    <Input id="title" placeholder="Chief Academic Officer" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground">Timezone auto-detected: {timezone}</p>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle2 className="size-12 text-green-500 mx-auto mb-3" />
                  <h2 className="text-2xl font-semibold mb-2">You&apos;re all set!</h2>
                  <p className="text-muted-foreground">Your super admin account is ready. Here&apos;s what to do next.</p>
                </div>
                <div className="space-y-3">
                  {CHECKLIST.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200">
                      <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold">{i + 1}</div>
                      <span className="text-sm pt-1.5">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive mt-4">{error}</p>}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {!isFirst ? (
                <Button variant="outline" onClick={prevStep} disabled={saving}>
                  <ChevronLeft className="size-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {!isLast ? (
                <Button onClick={handleContinue} disabled={!canContinue || saving}>
                  {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Continue
                  <ChevronRight className="size-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => complete()} disabled={saving}>
                  {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Go to Dashboard
                  <ChevronRight className="size-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
