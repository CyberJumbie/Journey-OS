'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, Clock, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

export default function GenerateSyllabusPage() {
  const router = useRouter();
  const [questionCount, setQuestionCount] = useState([5]);
  const [difficulty, setDifficulty] = useState('mixed');
  const [questionType, setQuestionType] = useState('single-best');
  const [focusAreas, setFocusAreas] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const handleGenerate = () => {
    setGenerating(true); setProgress(0);
    setStatus('Extracting context from USMLE blueprint...');
    const stages = [
      { progress: 20, status: 'Extracting context from USMLE blueprint...' },
      { progress: 40, status: 'Generating question 1 of 5...' },
      { progress: 60, status: 'Generating question 3 of 5...' },
      { progress: 80, status: 'Generating question 5 of 5...' },
      { progress: 90, status: 'Fact-checking medical accuracy...' },
      { progress: 100, status: 'Complete!' },
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < stages.length) { setProgress(stages[i].progress); setStatus(stages[i].status); i++; }
      else { clearInterval(interval); setTimeout(() => router.push('/questions/review'), 1000); }
    }, 600);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Courses</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Generate from Syllabus</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold mb-2">Generate Questions from Syllabus</h1>
        <h3 className="text-muted-foreground">Myocardial Infarction</h3>
      </div>

      <Card className="bg-accent/50">
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Topics covered</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>MI Pathophysiology</li><li>Risk Factors and Prevention</li>
              <li>Clinical Presentation and Diagnosis</li><li>Treatment and Management</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Blueprint sections</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Cardiovascular System</Badge>
              <Badge variant="secondary">Pathologic Processes</Badge>
              <Badge variant="secondary">Diagnostic Tests</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Label>Number of Questions</Label>
        <div className="flex items-center gap-8">
          <Slider value={questionCount} onValueChange={setQuestionCount} max={20} min={1} step={1} className="flex-1" />
          <div className="flex h-12 w-16 items-center justify-center rounded-lg border-2 border-primary bg-primary/10">
            <span className="text-2xl font-bold text-primary">{questionCount[0]}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Difficulty Level</Label>
        <RadioGroup value={difficulty} onValueChange={setDifficulty}>
          <div className="grid gap-3 sm:grid-cols-2">
            {['easy', 'medium', 'hard', 'mixed'].map((d) => (
              <Card key={d} className={`cursor-pointer transition-colors ${difficulty === d ? 'border-primary bg-accent' : ''}`} onClick={() => setDifficulty(d)}>
                <CardContent className="flex items-center gap-3 p-4">
                  <RadioGroupItem value={d} id={`diff-${d}`} />
                  <Label htmlFor={`diff-${d}`} className="cursor-pointer font-normal capitalize">{d}</Label>
                </CardContent>
              </Card>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <Label>Question Type</Label>
        <RadioGroup value={questionType} onValueChange={setQuestionType}>
          {[{ v: 'single-best', l: 'Single Best Answer', d: 'Standard multiple choice with one correct answer' }, { v: 'clinical-vignette', l: 'Clinical Vignette', d: 'Patient case-based scenario questions' }].map((o) => (
            <Card key={o.v} className={`cursor-pointer transition-colors ${questionType === o.v ? 'border-primary bg-accent' : ''}`} onClick={() => setQuestionType(o.v)}>
              <CardContent className="flex items-center gap-3 p-4">
                <RadioGroupItem value={o.v} id={o.v} />
                <div><Label htmlFor={o.v} className="cursor-pointer font-normal">{o.l}</Label><p className="text-sm text-muted-foreground">{o.d}</p></div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="focus">Focus Areas (Optional)</Label>
        <Textarea id="focus" placeholder="Any specific topics or learning objectives to emphasize?" rows={4} value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} />
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="flex w-full justify-between p-0"><span className="font-medium">Advanced Options</span><ChevronDown className="h-4 w-4" /></Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <div className="space-y-3">
            <Label>Bloom&apos;s Taxonomy Level</Label>
            {['Remember', 'Understand', 'Apply', 'Analyze'].map((b, i) => (
              <div key={b} className="flex items-center space-x-2"><Checkbox id={b.toLowerCase()} defaultChecked={i < 3} /><label htmlFor={b.toLowerCase()} className="text-sm font-normal">{b}</label></div>
            ))}
          </div>
          <div className="flex items-center justify-between"><Label>Include diagnostic images</Label><Switch /></div>
        </CollapsibleContent>
      </Collapsible>

      <Card className="bg-muted/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-sm font-medium">Estimated time: 2-3 minutes</p><p className="text-xs text-muted-foreground">This will generate {questionCount[0]} questions</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleGenerate}><Sparkles className="mr-2 h-4 w-4" />Generate Questions</Button>
      </div>

      <Dialog open={generating} onOpenChange={setGenerating}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Generating Questions</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex justify-center"><div className="animate-pulse"><Sparkles className="h-16 w-16 text-primary" /></div></div>
            <div className="space-y-2"><Progress value={progress} className="h-2" /><p className="text-center text-sm font-medium text-primary">{status}</p></div>
            <p className="text-center text-xs text-muted-foreground">This may take 1-2 minutes</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
