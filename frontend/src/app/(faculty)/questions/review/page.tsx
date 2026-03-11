'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle, Clock, XCircle, MoreHorizontal, Eye,
  Sparkles, FileDown, AlertCircle,
} from 'lucide-react';

const questions = [
  { id: 'q1', stem: 'A 62-year-old man with a history of hypertension and hyperlipidemia presents to the emergency department with severe chest pain radiating to the left arm...', status: 'pending', difficulty: 'medium', topics: ['Myocardial Infarction', 'Cardiovascular'], qualityScore: 0.92, factCheck: true, duplicates: 0, date: '2 hours ago' },
  { id: 'q2', stem: 'A 45-year-old woman presents with progressive shortness of breath and orthopnea. Physical examination reveals jugular venous distension...', status: 'approved', difficulty: 'hard', topics: ['Heart Failure', 'Cardiovascular'], qualityScore: 0.95, factCheck: true, duplicates: 0, date: '5 hours ago' },
  { id: 'q3', stem: 'Which of the following is the most likely mechanism of action for beta-blockers in the treatment of heart failure with reduced ejection fraction?', status: 'pending', difficulty: 'medium', topics: ['Pharmacology', 'Heart Failure'], qualityScore: 0.88, factCheck: true, duplicates: 1, date: '1 day ago' },
  { id: 'q4', stem: 'A 70-year-old man with a history of atrial fibrillation presents with sudden onset of right leg pain and coolness. Pulses are diminished in the right lower extremity...', status: 'rejected', difficulty: 'hard', topics: ['Thromboembolism', 'Cardiovascular'], qualityScore: 0.76, factCheck: false, duplicates: 0, date: '1 day ago' },
  { id: 'q5', stem: 'A patient presents with ECG findings showing ST elevation in leads II, III, and aVF. Which coronary artery is most likely affected?', status: 'pending', difficulty: 'easy', topics: ['Myocardial Infarction', 'ECG'], qualityScore: 0.91, factCheck: true, duplicates: 0, date: '2 days ago' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <Badge className="bg-success text-success-foreground"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
  if (status === 'pending') return <Badge variant="outline" className="border-warning text-warning"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
  return <Badge variant="outline" className="border-destructive text-destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'bg-success/10 text-success border-success/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    hard: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return <Badge variant="outline" className={colors[difficulty]}>{difficulty}</Badge>;
}

export default function QuestionReviewPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const filtered = filter === 'all' ? questions : questions.filter((q) => q.status === filter);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Courses</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Questions</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold mb-2">Review Questions</h1>
        <p className="text-muted-foreground">Review and approve generated questions for your course</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => {
          const count = f === 'all' ? questions.length : questions.filter((q) => q.status === f).length;
          const icon = f === 'pending' ? <Clock className="mr-1 h-3 w-3" /> : f === 'approved' ? <CheckCircle className="mr-1 h-3 w-3" /> : f === 'rejected' ? <XCircle className="mr-1 h-3 w-3" /> : null;
          return <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>{icon}{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})</Button>;
        })}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" />Export</Button>
          <Link href="/generation/topic"><Button size="sm"><Sparkles className="mr-2 h-4 w-4" />Generate More</Button></Link>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((q) => (
          <Card key={q.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Checkbox className="mt-1" />
                <div className="flex-1 space-y-4">
                  <StatusBadge status={q.status} />
                  <p className="text-sm leading-relaxed">
                    {q.stem.slice(0, 150)}
                    {q.stem.length > 150 && <Link href={`/questions/${q.id}`} className="ml-1 text-primary hover:underline">Read more</Link>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <DifficultyBadge difficulty={q.difficulty} />
                    {q.topics.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium">Quality: {q.qualityScore}</span>
                    {q.factCheck
                      ? <span className="flex items-center gap-1 text-success"><CheckCircle className="h-3 w-3" />Fact-checked</span>
                      : <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />Fact-check failed</span>}
                    {q.duplicates > 0 && <span className="flex items-center gap-1 text-warning"><AlertCircle className="h-3 w-3" />{q.duplicates} similar</span>}
                    <span className="text-muted-foreground">{q.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/questions/${q.id}`}><Button size="sm">Review</Button></Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center text-sm text-muted-foreground">
        Showing 1-{filtered.length} of {filtered.length}
      </div>
    </div>
  );
}
