import { useParams, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { 
  Sparkles, 
  FileText, 
  ClipboardList, 
  BookOpen, 
  Target, 
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  FileDown,
  Trash2
} from "lucide-react";

export default function WeekView() {
  const { courseId, weekId } = useParams();
  const navigate = useNavigate();

  const weekData = {
    number: parseInt(weekId || "1"),
    title: "Introduction to Cardiovascular System",
    description: "Fundamental concepts of cardiovascular anatomy, physiology, and common pathologies. Focus on heart structure, blood flow dynamics, and clinical correlations.",
    topics: ["Heart Anatomy", "Blood Flow Dynamics", "Cardiac Cycle", "ECG Basics"],
    learningObjectives: [
      "Describe the anatomical structures of the heart and major vessels",
      "Explain the cardiac cycle and its relationship to ECG waveforms",
      "Identify normal and abnormal heart sounds",
      "Correlate anatomical findings with clinical presentations",
    ],
    blueprintSections: [
      { name: "Cardiovascular System", coverage: 85 },
      { name: "General Principles", coverage: 92 },
      { name: "Normal Processes", coverage: 78 },
    ],
    materials: {
      lectures: 3,
      notes: 2,
      totalSize: "45.2 MB",
      lastUpdated: "2 days ago",
    },
    aiInsights: {
      keyConceptsExtracted: 24,
      clinicalCases: 8,
      nbmeAlignment: 88,
    },
    questions: {
      total: 15,
      approved: 8,
      pending: 5,
      rejected: 2,
    },
    difficulty: "Medium" as const,
    estimatedStudyTime: "4-6 hours",
  };

  const materials = [
    { id: 1, name: "Lecture 1 - Heart Anatomy.pdf", size: "12.4 MB", type: "pdf", date: "Feb 10, 2026" },
    { id: 2, name: "Lecture 2 - Cardiac Physiology.pdf", size: "15.8 MB", type: "pdf", date: "Feb 10, 2026" },
    { id: 3, name: "ECG Basics Slides.pptx", size: "8.2 MB", type: "pptx", date: "Feb 12, 2026" },
    { id: 4, name: "Clinical Cases.docx", size: "5.1 MB", type: "docx", date: "Feb 13, 2026" },
    { id: 5, name: "Study Notes.pdf", size: "3.7 MB", type: "pdf", date: "Feb 14, 2026" },
  ];

  const questions = [
    { id: 1, stem: "A 55-year-old man presents with chest pain...", status: "approved" as const, difficulty: "Medium" },
    { id: 2, stem: "During cardiac auscultation, S1 heart sound...", status: "approved" as const, difficulty: "Easy" },
    { id: 3, stem: "The cardiac cycle consists of systole and...", status: "pending" as const, difficulty: "Easy" },
    { id: 4, stem: "A patient's ECG shows an absent P wave...", status: "pending" as const, difficulty: "Hard" },
    { id: 5, stem: "Blood flow through the heart follows which...", status: "approved" as const, difficulty: "Medium" },
  ];

  const difficultyColors = {
    Easy: "bg-success/10 text-success",
    Medium: "bg-warning/10 text-warning",
    Hard: "bg-destructive/10 text-destructive",
  };

  const statusIcons = {
    approved: CheckCircle,
    pending: Clock,
    rejected: XCircle,
  };

  const statusColors = {
    approved: "text-success",
    pending: "text-warning",
    rejected: "text-destructive",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/courses">Courses</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/courses/${courseId}`}>Pathology</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Week {weekData.number}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold">Week {weekData.number}: {weekData.title}</h1>
              <Badge className={difficultyColors[weekData.difficulty]}>
                {weekData.difficulty}
              </Badge>
            </div>
            <p className="text-text-secondary">{weekData.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {weekData.estimatedStudyTime}
              </span>
              <span>•</span>
              <span>{weekData.topics.length} topics</span>
              <span>•</span>
              <span>{weekData.learningObjectives.length} objectives</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold">{weekData.topics.length}</p>
                  <p className="text-sm text-text-secondary">Topics</p>
                </div>
                <BookOpen className="w-8 h-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold">{weekData.learningObjectives.length}</p>
                  <p className="text-sm text-text-secondary">Objectives</p>
                </div>
                <Target className="w-8 h-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold">{weekData.materials.lectures + weekData.materials.notes}</p>
                  <p className="text-sm text-text-secondary">Materials</p>
                </div>
                <FileText className="w-8 h-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold">{weekData.questions.total}</p>
                  <p className="text-sm text-text-secondary">Questions</p>
                </div>
                <ClipboardList className="w-8 h-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:border-primary-color transition-colors"
            onClick={() => navigate(`/courses/${courseId}/week/${weekId}/generate`)}
          >
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-primary-color/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-primary-color" />
              </div>
              <p className="font-medium">Generate Questions</p>
              <p className="text-sm text-text-secondary mt-1">Create USMLE questions</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-primary-color transition-colors"
            onClick={() => navigate(`/courses/${courseId}/week/${weekId}/generate-test`)}
          >
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-primary-color/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-primary-color" />
              </div>
              <p className="font-medium">Create Test</p>
              <p className="text-sm text-text-secondary mt-1">Full exam with 30-50 questions</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-primary-color transition-colors"
            onClick={() => navigate(`/courses/${courseId}/week/${weekId}/generate-quiz`)}
          >
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-primary-color/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-primary-color" />
              </div>
              <p className="font-medium">Create Quiz</p>
              <p className="text-sm text-text-secondary mt-1">Short quiz with 5-15 questions</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-primary-color transition-colors"
            onClick={() => navigate(`/courses/${courseId}/week/${weekId}/generate-handout`)}
          >
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-primary-color/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-primary-color" />
              </div>
              <p className="font-medium">Create Handout</p>
              <p className="text-sm text-text-secondary mt-1">Study guide or summary</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
            <TabsTrigger value="questions">Questions ({weekData.questions.total})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Topics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Topics Covered</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {weekData.topics.map((topic, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary-color rounded-full" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Learning Objectives */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Learning Objectives</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {weekData.learningObjectives.map((objective, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-success-color flex-shrink-0 mt-0.5" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Blueprint Coverage */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Blueprint Alignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {weekData.blueprintSections.map((section, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{section.name}</span>
                          <span className="text-sm font-medium">{section.coverage}%</span>
                        </div>
                        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-color transition-all"
                            style={{ width: `${section.coverage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Key Concepts Extracted</span>
                      <span className="text-sm font-medium">{weekData.aiInsights.keyConceptsExtracted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Clinical Cases Identified</span>
                      <span className="text-sm font-medium">{weekData.aiInsights.clinicalCases}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">NBME Alignment Score</span>
                      <span className="text-sm font-medium text-success-color">{weekData.aiInsights.nbmeAlignment}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Uploaded Materials</CardTitle>
                  <Button 
                    size="sm"
                    onClick={() => navigate(`/courses/${courseId}/week/${weekId}/upload-materials`)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload More
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {materials.map((material) => (
                    <div 
                      key={material.id}
                      className="flex items-center justify-between p-3 border border-border-subtle rounded-lg hover:border-primary-color/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-color" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{material.name}</p>
                          <p className="text-xs text-text-secondary">{material.size} • {material.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <FileDown className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-4 h-4 text-error-color" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Questions</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{weekData.questions.approved} Approved</Badge>
                    <Badge variant="secondary">{weekData.questions.pending} Pending</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {questions.map((question) => {
                    const StatusIcon = statusIcons[question.status];
                    return (
                      <div 
                        key={question.id}
                        className="flex items-start justify-between p-3 border border-border-subtle rounded-lg hover:border-primary-color/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/questions/${question.id}`)}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <StatusIcon className={`w-5 h-5 ${statusColors[question.status]} flex-shrink-0 mt-0.5`} />
                          <div className="flex-1">
                            <p className="text-sm line-clamp-2">{question.stem}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {question.difficulty}
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {question.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}