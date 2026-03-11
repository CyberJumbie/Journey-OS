'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface HandoutConfig {
  title: string;
  type: 'study-guide' | 'quick-reference' | 'practice-questions' | 'summary';
  sections: { keyConcepts: boolean; clinicalPearls: boolean; practiceQuestions: boolean; references: boolean; diagrams: boolean; };
  layout: '1-column' | '2-column';
  includeImages: boolean;
}

const handoutTypes = {
  'study-guide': { name: 'Study Guide', description: 'Comprehensive guide with concepts, examples, and practice questions' },
  'quick-reference': { name: 'Quick Reference', description: 'Condensed summary for rapid review and memorization' },
  'practice-questions': { name: 'Practice Questions', description: 'Collection of practice questions with detailed explanations' },
  'summary': { name: 'Summary Sheet', description: 'One-page overview of key topics and takeaways' },
};

export default function GenerateHandoutPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [config, setConfig] = useState<HandoutConfig>({
    title: '', type: 'study-guide',
    sections: { keyConcepts: true, clinicalPearls: true, practiceQuestions: true, references: true, diagrams: false },
    layout: '2-column', includeImages: true,
  });

  const handleGenerate = () => {
    if (!config.title.trim()) { toast.error('Please enter a handout title'); return; }
    const selectedSections = Object.values(config.sections).filter(Boolean).length;
    if (selectedSections === 0) { toast.error('Please select at least one section to include'); return; }
    setIsGenerating(true); setGenerationProgress(0);
    const stages = [
      { progress: 10, status: 'Analyzing course materials...' },
      { progress: 25, status: 'Extracting key concepts...' },
      { progress: 55, status: 'Selecting practice questions...' },
      { progress: 85, status: 'Adding references and citations...' },
      { progress: 100, status: 'Handout ready for download!' },
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < stages.length) { setGenerationProgress(stages[i].progress); setGenerationStatus(stages[i].status); i++; }
      else { clearInterval(interval); setTimeout(() => { setIsGenerating(false); toast.success(`Handout "${config.title}" generated!`); }, 1000); }
    }, 800);
  };

  const sectionItems: { key: keyof HandoutConfig['sections']; label: string; desc: string }[] = [
    { key: 'keyConcepts', label: 'Key Concepts', desc: 'Main topics and learning objectives with definitions' },
    { key: 'clinicalPearls', label: 'Clinical Pearls', desc: 'High-yield clinical correlations and test-taking tips' },
    { key: 'practiceQuestions', label: 'Practice Questions', desc: 'Sample USMLE-style questions with explanations' },
    { key: 'references', label: 'References & Citations', desc: 'Source materials and recommended reading' },
    { key: 'diagrams', label: 'Diagrams & Illustrations', desc: 'Visual aids and anatomical diagrams from lectures' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/courses">Courses</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Generate Handout</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center"><BookOpen className="w-6 h-6 text-primary" /></div>
          <h1 className="text-2xl font-semibold">Generate Study Handout</h1>
        </div>
        <p className="text-muted-foreground">Create a study guide, summary, or reference sheet</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Handout Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2"><Label htmlFor="title">Handout Title *</Label><Input id="title" placeholder="e.g., Cardiovascular System Study Guide" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} /></div>
          <div className="space-y-3"><Label>Handout Type</Label>
            <RadioGroup value={config.type} onValueChange={(v) => setConfig({ ...config, type: v as HandoutConfig['type'] })}>
              {(Object.entries(handoutTypes) as [string, { name: string; description: string }][]).map(([key, { name, description }]) => (
                <div key={key} className="flex items-start space-x-2">
                  <RadioGroupItem value={key} id={key} className="mt-1" />
                  <div className="flex-1"><Label htmlFor={key} className="font-normal">{name}</Label><p className="text-sm text-muted-foreground mt-0.5">{description}</p></div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Content Sections</CardTitle><p className="text-sm text-muted-foreground mt-1">Select which sections to include in your handout</p></CardHeader>
        <CardContent className="space-y-4">
          {sectionItems.map((s) => (
            <div key={s.key} className="flex items-start space-x-3">
              <Checkbox id={s.key} checked={config.sections[s.key]} onCheckedChange={(checked) => setConfig({ ...config, sections: { ...config.sections, [s.key]: checked as boolean } })} />
              <div className="flex-1"><Label htmlFor={s.key} className="font-normal">{s.label}</Label><p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Layout Options</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3"><Label>Page Layout</Label>
            <RadioGroup value={config.layout} onValueChange={(v) => setConfig({ ...config, layout: v as '1-column' | '2-column' })}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="1-column" id="1-column" /><Label htmlFor="1-column" className="font-normal">Single Column (easier to read, more pages)</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="2-column" id="2-column" /><Label htmlFor="2-column" className="font-normal">Two Columns (compact, fewer pages)</Label></div>
            </RadioGroup>
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Include Images</Label><p className="text-sm text-muted-foreground mt-0.5">Add relevant images and illustrations from course materials</p></div>
            <Switch checked={config.includeImages} onCheckedChange={(v) => setConfig({ ...config, includeImages: v })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader><CardTitle>Handout Preview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium">{handoutTypes[config.type].name}</p></div>
          <div><p className="text-sm text-muted-foreground">Sections Included</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {sectionItems.filter((s) => config.sections[s.key]).map((s) => <span key={s.key} className="text-xs px-2 py-1 bg-secondary rounded">{s.label}</span>)}
            </div>
          </div>
          <div><p className="text-sm text-muted-foreground">Layout</p><p className="font-medium capitalize">{config.layout.replace('-', ' ')}</p></div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGenerate}><Download className="w-4 h-4 mr-2" />Generate PDF</Button>
          <Button onClick={handleGenerate}>Generate &amp; Edit</Button>
        </div>
      </div>

      <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Generating Handout</DialogTitle></DialogHeader><div className="space-y-4"><Progress value={generationProgress} /><div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /><p className="text-sm text-muted-foreground">{generationStatus}</p></div></div></DialogContent>
      </Dialog>
    </div>
  );
}
