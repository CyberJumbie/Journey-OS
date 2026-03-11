'use client';

import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, Users, CheckCircle2 } from 'lucide-react';

export default function AdvisorOnboarding() {
  const { currentStep, saving, nextStep, prevStep, complete } = useOnboarding({
    totalSteps: 4,
    role: 'advisor',
  });
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');

  const step = currentStep + 1; // display as 1-based
  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#FFF9E6] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="size-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome, Advisor!</h1>
          <p className="text-muted-foreground">Let&apos;s set up your advising profile</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-2">Your Profile</h2>
                <p className="text-muted-foreground">Basic information about you</p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith" />
                  </div>
                  <div>
                    <Label htmlFor="dept">Department</Label>
                    <Input id="dept" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g., Student Affairs" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-2">Your Advisees</h2>
                <p className="text-muted-foreground">Students assigned to you will appear here once your institution admin adds them.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">No advisees assigned yet. This is normal during setup.</p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-2">How Advising Works</h2>
                <p className="text-muted-foreground">Key features available to you</p>
                <div className="space-y-3">
                  {['Track student performance across courses', 'View mastery levels by competency', 'Receive alerts for at-risk students', 'Export progress reports'].map(item => (
                    <div key={item} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200">
                      <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 text-center">
                <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold">You&apos;re All Set!</h2>
                <p className="text-muted-foreground">Your advising dashboard is ready.</p>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {currentStep > 0 ? (
                <Button variant="outline" onClick={prevStep} disabled={saving}>
                  <ChevronLeft className="size-4 mr-2" />Back
                </Button>
              ) : <div />}
              {currentStep < 3 ? (
                <Button onClick={() => nextStep(currentStep === 0 ? { name, department } : undefined)} disabled={saving}>
                  Next<ChevronRight className="size-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => complete()} disabled={saving}>
                  Go to Dashboard<ChevronRight className="size-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {currentStep < 3 && (
          <div className="text-center mt-6">
            <button onClick={() => complete()} className="text-sm text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
