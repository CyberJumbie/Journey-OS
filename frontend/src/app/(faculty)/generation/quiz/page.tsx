'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuizConfig {
  title: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  isTimed: boolean;
  timeLimit: number;
  showAnswersImmediately: boolean;
}

export default function GenerateQuizPage() {
  const params = useParams();
  const router = useRouter();
  const _courseId = params?.courseId as string | undefined;
  const _weekId = params?.weekId as string | undefined;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [config, setConfig] = useState<QuizConfig>({
    title: '', numQuestions: 10, difficulty: 'mixed',
    isTimed: false, timeLimit: 15, showAnswersImmediately: true,
  });

  const handleGenerate = () => {
    if (!config.title.trim()) { toast.error('Please enter a quiz title'); return; }
    setIsGenerating(true); setGenerationProgress(0);
    const stages = [
      { progress: 15, status: 'Selecting topics from week materials...' },
      { progress: 35, status: 'Generating questions...' },
      { progress: 60, status: 'Creating answer explanations...' },
      { progress: 85, status: 'Quality check and validation...' },
      { progress: 100, status: 'Quiz ready!' },
    ];
    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setGenerationProgress(stages[currentStage].progress);
        setGenerationStatus(stages[currentStage].status);
        currentStage++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsGenerating(false);
          toast.success(`Quiz "${config.title}" generated successfully!`);
          router.push('/questions/review');
        }, 1000);
      }
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/courses">Courses</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Generate Quiz</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Generate Quiz</h1>
        </div>
        <p className="text-muted-foreground">Create a quick quiz with 5-15 questions</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Quiz Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Quiz Title *</Label>
            <Input id="title" placeholder="e.g., Week 1 - Quick Review Quiz" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Number of Questions</Label>
            <div className="flex items-center gap-3">
              <Slider value={[config.numQuestions]} onValueChange={(v) => setConfig({ ...config, numQuestions: v[0] })} min={5} max={15} step={1} className="flex-1" />
              <span className="text-sm font-medium w-12 text-right">{config.numQuestions}</span>
            </div>
          </div>
          <div className="space-y-3">
            <Label>Difficulty Level</Label>
            <RadioGroup value={config.difficulty} onValueChange={(v) => setConfig({ ...config, difficulty: v as QuizConfig['difficulty'] })}>
              {[{ v: 'easy', l: 'Easy - Basic recall and comprehension' }, { v: 'medium', l: 'Medium - Application and analysis' }, { v: 'hard', l: 'Hard - Clinical reasoning and synthesis' }, { v: 'mixed', l: 'Mixed - Varied difficulty levels' }].map((o) => (
                <div key={o.v} className="flex items-center space-x-2"><RadioGroupItem value={o.v} id={o.v} /><Label htmlFor={o.v} className="font-normal">{o.l}</Label></div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quiz Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div><Label>Timed Quiz</Label><p className="text-sm text-muted-foreground mt-0.5">Set a time limit for completing the quiz</p></div>
            <Switch checked={config.isTimed} onCheckedChange={(v) => setConfig({ ...config, isTimed: v })} />
          </div>
          {config.isTimed && (
            <div className="space-y-2 pl-6 border-l-2 border-primary/20">
              <Label>Time Limit (minutes)</Label>
              <div className="flex items-center gap-3">
                <Slider value={[config.timeLimit]} onValueChange={(v) => setConfig({ ...config, timeLimit: v[0] })} min={5} max={30} step={5} className="flex-1" />
                <span className="text-sm font-medium w-12 text-right">{config.timeLimit}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div><Label>Show Answers Immediately</Label><p className="text-sm text-muted-foreground mt-0.5">Display correct answers and explanations right after submission</p></div>
            <Switch checked={config.showAnswersImmediately} onCheckedChange={(v) => setConfig({ ...config, showAnswersImmediately: v })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader><CardTitle>Quiz Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Questions</p><p className="font-medium">{config.numQuestions} questions</p></div>
            <div><p className="text-sm text-muted-foreground">Difficulty</p><p className="font-medium capitalize">{config.difficulty}</p></div>
            <div><p className="text-sm text-muted-foreground">Time Limit</p><p className="font-medium">{config.isTimed ? `${config.timeLimit} minutes` : 'Untimed'}</p></div>
            <div><p className="text-sm text-muted-foreground">Answer Display</p><p className="font-medium">{config.showAnswersImmediately ? 'Immediate' : 'After review'}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleGenerate}>Generate Quiz</Button>
      </div>

      <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Generating Quiz</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Progress value={generationProgress} />
            <div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /><p className="text-sm text-muted-foreground">{generationStatus}</p></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
