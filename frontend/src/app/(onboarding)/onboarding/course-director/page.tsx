'use client';

import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

const TEACHING_AREAS = [
  'Basic Sciences (Pre-clinical)',
  'Clinical Sciences',
  'Board Exam Preparation',
  'Clerkship Education',
  'Residency Training',
];

const USAGE_GOALS = [
  'Create course exam questions',
  'Build question banks for students',
  'Generate USMLE-style practice questions',
  'Assess student learning outcomes',
  'Create formative assessments',
];

export default function CourseDirectorOnboarding() {
  const { currentStep, saving, nextStep, prevStep, complete } = useOnboarding({
    totalSteps: 5,
    role: 'faculty', // course_director uses faculty role with is_course_director flag
  });
  const [teachingAreas, setTeachingAreas] = useState<string[]>([]);
  const [usageGoals, setUsageGoals] = useState<string[]>([]);
  const [courseName, setCourseName] = useState('');

  const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(a => a !== item) : [...arr, item];

  const step = currentStep + 1;
  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#FFF9E6] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="size-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-xl">M</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome, Course Director!</h1>
          <p className="text-muted-foreground">Let&apos;s set up your teaching profile</p>
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
                <h2 className="text-2xl font-semibold">Teaching Areas</h2>
                <p className="text-muted-foreground">Select all areas you teach or coordinate</p>
                <div className="space-y-3">
                  {TEACHING_AREAS.map(area => (
                    <div key={area} className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${teachingAreas.includes(area) ? 'border-primary bg-[#FFF9E6]' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setTeachingAreas(toggle(teachingAreas, area))}>
                      <Checkbox checked={teachingAreas.includes(area)} onCheckedChange={() => setTeachingAreas(toggle(teachingAreas, area))} />
                      <Label className="cursor-pointer flex-1">{area}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Usage Goals</h2>
                <p className="text-muted-foreground">How will you use the platform?</p>
                <div className="space-y-3">
                  {USAGE_GOALS.map(goal => (
                    <div key={goal} className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${usageGoals.includes(goal) ? 'border-primary bg-[#FFF9E6]' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setUsageGoals(toggle(usageGoals, goal))}>
                      <Checkbox checked={usageGoals.includes(goal)} onCheckedChange={() => setUsageGoals(toggle(usageGoals, goal))} />
                      <Label className="cursor-pointer flex-1">{goal}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Your First Course</h2>
                <p className="text-muted-foreground">You can add more courses later</p>
                <div>
                  <Label htmlFor="courseName">Course Name</Label>
                  <Input id="courseName" placeholder="e.g., Introduction to Clinical Medicine" value={courseName} onChange={e => setCourseName(e.target.value)} className="mt-2" />
                  <p className="text-sm text-muted-foreground mt-2">Skip this if your courses are already set up</p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="size-8 text-primary" />
                  <h2 className="text-2xl font-semibold">Concept Verification</h2>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
                  <p className="text-sm text-blue-900">As a Course Director, you have a special responsibility: <strong>verifying AI-extracted concepts</strong>.</p>
                  <p className="text-sm text-blue-800">When the AI extracts concepts from syllabi (TEACHES relationships), these are <em>unverified</em>. Only after you confirm them do they become <strong>TEACHES_VERIFIED</strong> — the gold standard for LCME compliance.</p>
                  <p className="text-sm text-blue-800">This distinction is critical: only verified concepts participate in accreditation evidence chains.</p>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 text-center">
                <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold">You&apos;re All Set!</h2>
                <p className="text-muted-foreground">Your dashboard is ready with all Course Director features enabled.</p>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {currentStep > 0 ? (
                <Button variant="outline" onClick={prevStep} disabled={saving}>
                  <ChevronLeft className="size-4 mr-2" />Back
                </Button>
              ) : <div />}
              {currentStep === 3 ? (
                <Button onClick={() => nextStep({ understood: true })} disabled={saving}>
                  Got it &mdash; I understand<ChevronRight className="size-4 ml-2" />
                </Button>
              ) : currentStep < 4 ? (
                <Button onClick={() => nextStep(currentStep === 0 ? { teachingAreas } : currentStep === 1 ? { usageGoals } : currentStep === 2 ? { courseName } : undefined)} disabled={saving}>
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
            <button onClick={() => complete()} className="text-sm text-muted-foreground hover:text-foreground">Skip for now</button>
          </div>
        )}
      </div>
    </div>
  );
}
