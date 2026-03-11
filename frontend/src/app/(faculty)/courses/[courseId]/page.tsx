'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Sparkles,
  Edit,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  LayoutDashboard,
  Calendar,
  FileText,
  BarChart3,
  ClipboardList,
  Users,
  Loader2,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------
// Pipeline state -- determines which tabs are visible
// ---------------------------------------------------------------
type PipelineState =
  | 'no_syllabus'
  | 'processing'
  | 'mapped'
  | 'generating'
  | 'active';

interface TabDef {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  minState: PipelineState;
}

const PIPELINE_ORDER: PipelineState[] = [
  'no_syllabus',
  'processing',
  'mapped',
  'generating',
  'active',
];

function stateReached(current: PipelineState, required: PipelineState) {
  return PIPELINE_ORDER.indexOf(current) >= PIPELINE_ORDER.indexOf(required);
}

const ALL_TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', Icon: LayoutDashboard, minState: 'no_syllabus' },
  { key: 'weeks', label: 'Weeks', Icon: Calendar, minState: 'processing' },
  { key: 'questions', label: 'Questions', Icon: FileText, minState: 'active' },
  { key: 'coverage', label: 'Coverage', Icon: BarChart3, minState: 'mapped' },
  { key: 'exams', label: 'Exams', Icon: ClipboardList, minState: 'active' },
  { key: 'roster', label: 'Roster', Icon: Users, minState: 'active' },
];

// ---------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------
const mockWeeks = [
  { id: 1, title: 'Introduction to Cardiovascular System', topics: ['Heart Anatomy', 'Blood Flow', 'Cardiac Cycle'], questionCount: 5, targetCount: 15, coverage: 'high' as const },
  { id: 2, title: 'Myocardial Infarction', topics: ['MI Pathophysiology', 'Risk Factors', 'Clinical Presentation'], questionCount: 12, targetCount: 15, coverage: 'high' as const },
  { id: 3, title: 'Heart Failure', topics: ['Systolic Dysfunction', 'Diastolic Dysfunction', 'Treatment'], questionCount: 8, targetCount: 15, coverage: 'medium' as const },
  { id: 4, title: 'Arrhythmias', topics: ['Atrial Fibrillation', 'Ventricular Tachycardia', 'ECG'], questionCount: 3, targetCount: 15, coverage: 'low' as const },
  { id: 5, title: 'Nervous System Overview', topics: ['CNS Anatomy', 'Neural Pathways', 'Neurotransmitters'], questionCount: 0, targetCount: 15, coverage: 'low' as const },
];

const mockQuestions = [
  { id: 'q1', stem: 'A 62-year-old man with a history of hypertension presents with...', status: 'approved', date: '2 hours ago' },
  { id: 'q2', stem: 'A 45-year-old woman presents to the emergency department with...', status: 'pending', date: '5 hours ago' },
  { id: 'q3', stem: 'Which of the following is the most likely diagnosis in a patient...', status: 'approved', date: '1 day ago' },
  { id: 'q4', stem: 'A 70-year-old man presents with progressive shortness of breath...', status: 'rejected', date: '1 day ago' },
  { id: 'q5', stem: 'The mechanism of action of beta-blockers in heart failure...', status: 'pending', date: '2 days ago' },
];

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function CourseDashboard() {
  const { courseId } = useParams();
  const [pipelineState, setPipelineState] = useState<PipelineState>('active');
  const [activeTab, setActiveTab] = useState('overview');

  const visibleTabs = ALL_TABS.filter((t) => stateReached(pipelineState, t.minState));

  // Reset tab if it becomes hidden
  if (!visibleTabs.find((t) => t.key === activeTab)) {
    setActiveTab('overview');
  }

  const getCoverageDot = (coverage: string) => {
    const color = coverage === 'high' ? 'bg-success' : coverage === 'medium' ? 'bg-warning' : 'bg-destructive';
    return <div className={`h-2 w-2 rounded-full ${color}`} />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved')
      return <Badge className="bg-success text-success-foreground"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
    if (status === 'pending')
      return <Badge variant="outline" className="border-warning text-warning"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
    return <Badge variant="outline" className="border-destructive text-destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
  };

  // ---- Tab content renderers ----
  const renderOverview = () => {
    if (pipelineState === 'no_syllabus') {
      return (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2">Upload Your Syllabus</h3>
            <p className="mb-6 max-w-md text-muted-foreground">
              Upload your course syllabus to begin. Journey OS will extract topics, map learning objectives, and prepare your course for question generation.
            </p>
            <Link href={`/courses/${courseId}/syllabus/upload`}>
              <Button className="bg-primary hover:bg-primary/90">
                <Upload className="mr-2 h-4 w-4" />
                Upload Syllabus
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    if (pipelineState === 'processing') {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="mb-2">Processing Syllabus</h3>
            <p className="mb-4 max-w-md text-muted-foreground">
              Extracting topics, identifying learning objectives, and mapping to USMLE blueprint domains. This typically takes 2-3 minutes.
            </p>
            <div className="w-64">
              <Progress value={65} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">Step 3 of 5 -- Mapping objectives...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const totalQ = mockWeeks.reduce((s, w) => s + w.questionCount, 0);
    const approvedQ = mockQuestions.filter((q) => q.status === 'approved').length;

    return (
      <>
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalQ}</div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="text-success"><CheckCircle className="mr-1 inline h-3 w-3" />{approvedQ} approved</span>
                <span className="text-warning"><Clock className="mr-1 inline h-3 w-3" />{mockQuestions.filter((q) => q.status === 'pending').length} pending</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Blueprint Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">82%</div>
              <Link href="/analytics/blueprint-coverage" className="mt-2 inline-block text-sm text-primary hover:underline">View Coverage →</Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0.94</div>
              <div className="mt-2 text-sm text-muted-foreground">Excellent</div>
            </CardContent>
          </Card>
        </div>

        {pipelineState === 'mapped' && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="font-medium">Ready to generate questions</p>
                <p className="text-sm text-muted-foreground">Your syllabus mapping is complete. Pick a week to start generating.</p>
              </div>
              <Button size="sm" onClick={() => setActiveTab('weeks')}>
                <Sparkles className="mr-2 h-4 w-4" />Go to Weeks<ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {pipelineState === 'active' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3>Recent Questions</h3>
              <Link href={`/courses/${courseId}/questions`} className="text-sm font-medium text-primary hover:underline">View All</Link>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {mockQuestions.slice(0, 3).map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="mb-1 text-sm">{q.stem}</p>
                        <p className="text-xs text-muted-foreground">{q.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(q.status)}
                        <Link href={`/questions/${q.id}`}><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  };

  const renderWeeks = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {mockWeeks.map((week) => {
        const isProcessing = pipelineState === 'processing';
        return (
          <Card key={week.id} className={`group transition-shadow ${isProcessing ? 'opacity-60' : 'hover:shadow-lg cursor-pointer'}`}>
            <CardHeader>
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="outline">Week {week.id}</Badge>
                {!isProcessing && getCoverageDot(week.coverage)}
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <CardTitle className="text-lg">{week.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1">
                  {week.topics.slice(0, 2).map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">{topic}</Badge>
                  ))}
                  {week.topics.length > 2 && <Badge variant="secondary" className="text-xs">+{week.topics.length - 2}</Badge>}
                </div>
                {!isProcessing && (
                  <>
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">Questions</span>
                        <span className="font-medium">{week.questionCount} / {week.targetCount}</span>
                      </div>
                      <Progress value={(week.questionCount / week.targetCount) * 100} className="h-2" />
                    </div>
                    <Link href={`/courses/${courseId}/week/${week.id}/generate`}>
                      <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                        <Sparkles className="mr-2 h-4 w-4" />Generate
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderQuestions = () => (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h3>All Questions</h3>
        <Link href={`/courses/${courseId}/questions`} className="text-sm font-medium text-primary hover:underline">View Full List</Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {mockQuestions.map((q) => (
              <div key={q.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50">
                <div className="flex-1">
                  <p className="mb-1 text-sm">{q.stem}</p>
                  <p className="text-xs text-muted-foreground">{q.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(q.status)}
                  <Link href={`/questions/${q.id}`}><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></Link>
                  {q.status === 'pending' && <Button size="sm" className="bg-success hover:bg-success/90">Approve</Button>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCoverage = () => (
    <Card>
      <CardContent className="py-8">
        <div className="mb-6 text-center">
          <div className="text-5xl font-bold text-primary">82%</div>
          <p className="mt-2 text-muted-foreground">Overall USMLE Blueprint Coverage</p>
        </div>
        <div className="space-y-3">
          {[
            { domain: 'Cardiovascular', pct: 91 },
            { domain: 'Respiratory', pct: 78 },
            { domain: 'Renal', pct: 65 },
            { domain: 'Neurology', pct: 82 },
            { domain: 'GI / Hepatology', pct: 70 },
          ].map((d) => (
            <div key={d.domain}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{d.domain}</span>
                <span className="font-medium">{d.pct}%</span>
              </div>
              <Progress value={d.pct} className="h-2" />
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/analytics/blueprint-coverage">
            <Button variant="outline">View Full Coverage Report <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const renderExams = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardList className="mb-4 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-2">Exam Assembly</h3>
        <p className="mb-4 max-w-md text-muted-foreground">
          Build exams from your approved questions, balanced by blueprint coverage and difficulty.
        </p>
        <Link href="/exams/assembly"><Button><Sparkles className="mr-2 h-4 w-4" />Build Exam</Button></Link>
      </CardContent>
    </Card>
  );

  const renderRoster = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="mb-4 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-2">Course Roster</h3>
        <p className="mb-4 max-w-md text-muted-foreground">
          Manage enrolled students, view individual performance, and assign practice sessions.
        </p>
        <Link href={`/courses/${courseId}/roster`}><Button variant="outline">Manage Roster</Button></Link>
      </CardContent>
    </Card>
  );

  const tabContent: Record<string, () => React.ReactNode> = {
    overview: renderOverview,
    weeks: renderWeeks,
    questions: renderQuestions,
    coverage: renderCoverage,
    exams: renderExams,
    roster: renderRoster,
  };

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/courses">Courses</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Pathology</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1>Pathology</h1>
            <Button variant="ghost" size="icon"><Edit className="h-5 w-5" /></Button>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>PATH-250</span><span>·</span><span>Fall 2025</span><span>·</span><span>2nd Year</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Demo state selector -- remove in production */}
          <select
            value={pipelineState}
            onChange={(e) => setPipelineState(e.target.value as PipelineState)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs"
          >
            {PIPELINE_ORDER.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>

          {pipelineState !== 'no_syllabus' && pipelineState !== 'processing' && (
            <Link href="/generate/topic">
              <Button className="bg-primary hover:bg-primary/90">
                <Sparkles className="mr-2 h-4 w-4" />Generate Questions
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* State-aware tab bar */}
      <div className="mb-8 border-b">
        <div className="-mb-px flex gap-0 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.Icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab content */}
      {tabContent[activeTab]?.()}
    </>
  );
}
