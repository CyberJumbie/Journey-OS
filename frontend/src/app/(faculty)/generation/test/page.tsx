'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TestConfig {
  title: string;
  numQuestions: number;
  timeLimit: number;
  difficultyEasy: number;
  difficultyMedium: number;
  difficultyHard: number;
  includeExplanations: boolean;
  includeReferences: boolean;
  format: 'pdf' | 'online' | 'print';
}

export default function GenerateTestPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [config, setConfig] = useState<TestConfig>({
    title: '', numQuestions: 40, timeLimit: 60,
    difficultyEasy: 20, difficultyMedium: 50, difficultyHard: 30,
    includeExplanations: true, includeReferences: true, format: 'pdf',
  });

  const handleDifficultyChange = (field: 'difficultyEasy' | 'difficultyMedium' | 'difficultyHard', value: number) => {
    const newConfig = { ...config, [field]: value };
    const total = newConfig.difficultyEasy + newConfig.difficultyMedium + newConfig.difficultyHard;
    if (total !== 100) {
      const diff = 100 - total;
      if (field !== 'difficultyEasy') newConfig.difficultyEasy = Math.max(0, Math.min(100, newConfig.difficultyEasy + diff / 2));
      if (field !== 'difficultyMedium') newConfig.difficultyMedium = Math.max(0, Math.min(100, newConfig.difficultyMedium + diff / 2));
      if (field !== 'difficultyHard') newConfig.difficultyHard = Math.max(0, Math.min(100, newConfig.difficultyHard + diff / 2));
    }
    setConfig(newConfig);
  };

  const handleGenerate = () => {
    if (!config.title.trim()) { toast.error('Please enter a test title'); return; }
    const total = config.difficultyEasy + config.difficultyMedium + config.difficultyHard;
    if (Math.abs(total - 100) > 1) { toast.error('Difficulty percentages must sum to 100%'); return; }
    setIsGenerating(true); setGenerationProgress(0);
    const stages = [
      { progress: 10, status: 'Analyzing course materials...' },
      { progress: 30, status: 'Generating easy questions...' },
      { progress: 50, status: 'Generating medium difficulty questions...' },
      { progress: 70, status: 'Generating hard questions...' },
      { progress: 85, status: 'Adding explanations and references...' },
      { progress: 100, status: 'Test generation complete!' },
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < stages.length) { setGenerationProgress(stages[i].progress); setGenerationStatus(stages[i].status); i++; }
      else { clearInterval(interval); setTimeout(() => { setIsGenerating(false); toast.success(`Test "${config.title}" generated!`); router.push('/questions/review'); }, 1000); }
    }, 1000);
  };

  const diffTotal = config.difficultyEasy + config.difficultyMedium + config.difficultyHard;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/courses">Courses</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Generate Test</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
          <h1 className="text-2xl font-semibold">Generate Test</h1>
        </div>
        <p className="text-muted-foreground">Create a comprehensive exam with USMLE-style questions</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Basic Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2"><Label htmlFor="title">Test Title *</Label><Input id="title" placeholder="e.g., Cardiovascular System - Midterm Exam" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Number of Questions</Label><div className="flex items-center gap-3"><Slider value={[config.numQuestions]} onValueChange={(v) => setConfig({ ...config, numQuestions: v[0] })} min={10} max={100} step={5} className="flex-1" /><span className="text-sm font-medium w-12 text-right">{config.numQuestions}</span></div></div>
            <div className="space-y-2"><Label>Time Limit (minutes)</Label><div className="flex items-center gap-3"><Slider value={[config.timeLimit]} onValueChange={(v) => setConfig({ ...config, timeLimit: v[0] })} min={30} max={180} step={15} className="flex-1" /><span className="text-sm font-medium w-12 text-right">{config.timeLimit}</span></div></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Difficulty Distribution</CardTitle><p className="text-sm text-muted-foreground mt-1">Adjust the percentage of questions for each difficulty level (must total 100%)</p></CardHeader>
        <CardContent className="space-y-6">
          {([['difficultyEasy', 'Easy'] as const, ['difficultyMedium', 'Medium'] as const, ['difficultyHard', 'Hard'] as const]).map(([field, label]) => (
            <div key={field} className="space-y-2">
              <div className="flex items-center justify-between"><Label>{label} Questions</Label><span className="text-sm font-medium">{config[field]}%</span></div>
              <Slider value={[config[field]]} onValueChange={(v) => handleDifficultyChange(field, v[0])} min={0} max={100} step={5} />
              <p className="text-xs text-muted-foreground">~{Math.round(config.numQuestions * config[field] / 100)} questions</p>
            </div>
          ))}
          <div className="pt-4 border-t flex items-center justify-between">
            <span className="text-sm font-medium">Total Distribution</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{diffTotal}%</span>
              {Math.abs(diffTotal - 100) < 1 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <span className="text-xs text-red-600">Must equal 100%</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Additional Options</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between"><div><Label>Include Explanations</Label><p className="text-sm text-muted-foreground mt-0.5">Add detailed explanations for correct and incorrect answers</p></div><Switch checked={config.includeExplanations} onCheckedChange={(v) => setConfig({ ...config, includeExplanations: v })} /></div>
          <div className="flex items-center justify-between"><div><Label>Include References</Label><p className="text-sm text-muted-foreground mt-0.5">Add citations to source materials and textbooks</p></div><Switch checked={config.includeReferences} onCheckedChange={(v) => setConfig({ ...config, includeReferences: v })} /></div>
          <div className="space-y-3"><Label>Output Format</Label>
            <RadioGroup value={config.format} onValueChange={(v) => setConfig({ ...config, format: v as TestConfig['format'] })}>
              {[{ v: 'pdf', l: 'PDF Document (for distribution)' }, { v: 'online', l: 'Online Format (for LMS)' }, { v: 'print', l: 'Print-Ready (optimized for paper)' }].map((o) => (
                <div key={o.v} className="flex items-center space-x-2"><RadioGroupItem value={o.v} id={o.v} /><Label htmlFor={o.v} className="font-normal">{o.l}</Label></div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader><CardTitle>Test Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Total Questions</p><p className="font-medium">{config.numQuestions}</p></div>
            <div><p className="text-sm text-muted-foreground">Time Limit</p><p className="font-medium">{config.timeLimit} minutes</p></div>
            <div><p className="text-sm text-muted-foreground">Difficulty Mix</p><div className="flex items-center gap-2 mt-1"><Badge variant="secondary" className="text-xs">{config.difficultyEasy}% Easy</Badge><Badge variant="secondary" className="text-xs">{config.difficultyMedium}% Medium</Badge><Badge variant="secondary" className="text-xs">{config.difficultyHard}% Hard</Badge></div></div>
            <div><p className="text-sm text-muted-foreground">Format</p><p className="font-medium capitalize">{config.format}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleGenerate}>Generate Test</Button>
      </div>

      <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Generating Test</DialogTitle></DialogHeader><div className="space-y-4"><Progress value={generationProgress} /><div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /><p className="text-sm text-muted-foreground">{generationStatus}</p></div></div></DialogContent>
      </Dialog>
    </div>
  );
}
