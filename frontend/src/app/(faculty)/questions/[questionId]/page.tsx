'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CheckCircle, ChevronLeft, ChevronRight, ChevronDown, Edit, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const question = {
  id: 'q1',
  stem: 'A 62-year-old man with a history of hypertension and hyperlipidemia presents to the emergency department with severe substernal chest pain that began 2 hours ago. The pain radiates to his left arm and is associated with diaphoresis and nausea. His vital signs are: BP 145/95 mmHg, HR 102/min, RR 20/min, T 37.1 C. An ECG shows ST-segment elevation in leads II, III, and aVF. Which of the following coronary arteries is most likely occluded?',
  options: [
    { letter: 'A', text: 'Left anterior descending artery', correct: false },
    { letter: 'B', text: 'Left circumflex artery', correct: false },
    { letter: 'C', text: 'Right coronary artery', correct: true },
    { letter: 'D', text: 'Left main coronary artery', correct: false },
    { letter: 'E', text: 'Diagonal branch', correct: false },
  ],
  explanation: 'The ECG findings of ST-segment elevation in leads II, III, and aVF are classic for an inferior wall myocardial infarction. The right coronary artery (RCA) is the most common culprit vessel in inferior MIs, as it typically supplies the inferior wall of the left ventricle.',
  citations: [
    { id: 1, title: 'American Heart Association Guidelines for STEMI Management', url: '#' },
    { id: 2, title: 'ECG Manifestations of Acute Myocardial Infarction - UpToDate', url: '#' },
  ],
  difficulty: 'medium',
  bloomsLevel: 'Apply',
  qualityScore: 0.92,
  createdDate: '2 hours ago',
  llm: 'GPT-4',
  blueprintSections: ['Cardiovascular System', 'Pathologic Processes'],
  topics: ['Myocardial Infarction', 'ECG Interpretation'],
};

export default function QuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = params?.questionId as string;

  const handleApprove = () => {
    toast.success('Question approved successfully');
    setTimeout(() => router.push('/questions/review'), 1000);
  };

  const handleReject = () => {
    toast.error('Question rejected');
    setTimeout(() => router.push('/questions/review'), 1000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 text-sm font-medium text-muted-foreground">Question 1 of 5</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1"><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
              <Button variant="outline" size="sm" className="flex-1">Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className={`flex h-10 w-10 items-center justify-center rounded-md border-2 text-sm font-medium ${num === 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{num}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <Button className="w-full bg-success hover:bg-success/90" onClick={handleApprove}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
            <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={handleReject}>Reject</Button>
            <Button variant="outline" className="w-full"><Edit className="mr-2 h-4 w-4" />Edit Manually</Button>
            <Link href={`/questions/${questionId}/refine`}><Button variant="outline" className="w-full"><Sparkles className="mr-2 h-4 w-4" />Refine with AI</Button></Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-sm">
            <p className="mb-1 font-medium">Current version: v1</p>
            <Link href={`/questions/${questionId}/history`}><Button variant="link" size="sm" className="h-auto p-0">View history</Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/questions/review">Questions</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="/questions/review">Review</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Question 1</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Badge variant="outline" className="border-warning text-warning">Pending Review</Badge>

        <Card className="bg-muted/50">
          <CardContent className="flex flex-wrap items-center gap-6 p-4">
            <span className="flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4 text-success" />All claims verified</span>
            <Badge variant="secondary">Difficulty: {question.difficulty}</Badge>
            <Badge variant="secondary">Bloom&apos;s: {question.bloomsLevel}</Badge>
            <span className="text-sm font-medium">Quality Score: {question.qualityScore}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 space-y-8">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Stem</p>
              <p className="text-base leading-relaxed">{question.stem}</p>
            </div>
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Options</p>
              <div className="space-y-3">
                {question.options.map((opt) => (
                  <Card key={opt.letter} className={opt.correct ? 'border-l-4 border-success bg-success/5' : ''}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md font-medium ${opt.correct ? 'bg-success text-success-foreground' : 'bg-muted'}`}>{opt.letter}</div>
                      <p className="flex-1">{opt.text}</p>
                      {opt.correct && <CheckCircle className="h-5 w-5 text-success" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Explanation</p>
              <Card className="bg-accent/30"><CardContent className="p-6"><p className="leading-relaxed">{question.explanation}</p></CardContent></Card>
            </div>
          </CardContent>
        </Card>

        <Collapsible>
          <Card>
            <CollapsibleTrigger asChild>
              <CardContent className="flex cursor-pointer items-center justify-between p-6 hover:bg-muted/50">
                <h4 className="font-semibold">Sources &amp; Citations</h4>
                <ChevronDown className="h-5 w-5" />
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="border-t p-6 space-y-3">
                {question.citations.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <span className="text-sm font-medium text-muted-foreground">[{c.id}]</span>
                    <a href={c.url} className="text-sm text-primary hover:underline">{c.title}</a>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible>
          <Card>
            <CollapsibleTrigger asChild>
              <CardContent className="flex cursor-pointer items-center justify-between p-6 hover:bg-muted/50">
                <h4 className="font-semibold">Metadata</h4>
                <ChevronDown className="h-5 w-5" />
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="border-t p-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Blueprint Sections</p>
                  <div className="flex flex-wrap gap-2">{question.blueprintSections.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Topics</p>
                  <div className="flex flex-wrap gap-2">{question.topics.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Created By</p>
                  <p className="text-sm font-medium">System &middot; {question.createdDate}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">LLM Used</p>
                  <p className="text-sm font-medium">{question.llm}</p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
