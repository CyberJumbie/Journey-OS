import { Link, useParams } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { Sparkles, Edit, Upload, CheckCircle, Clock, XCircle, Eye } from "lucide-react";

export default function CourseDashboard() {
  const { courseId } = useParams();

  const weeks = [
    {
      id: 1,
      title: "Introduction to Cardiovascular System",
      topics: ["Heart Anatomy", "Blood Flow", "Cardiac Cycle"],
      questionCount: 5,
      targetCount: 15,
      coverage: "high",
    },
    {
      id: 2,
      title: "Myocardial Infarction",
      topics: ["MI Pathophysiology", "Risk Factors", "Clinical Presentation"],
      questionCount: 12,
      targetCount: 15,
      coverage: "high",
    },
    {
      id: 3,
      title: "Heart Failure",
      topics: ["Systolic Dysfunction", "Diastolic Dysfunction", "Treatment"],
      questionCount: 8,
      targetCount: 15,
      coverage: "medium",
    },
    {
      id: 4,
      title: "Arrhythmias",
      topics: ["Atrial Fibrillation", "Ventricular Tachycardia", "ECG"],
      questionCount: 3,
      targetCount: 15,
      coverage: "low",
    },
    {
      id: 5,
      title: "Nervous System Overview",
      topics: ["CNS Anatomy", "Neural Pathways", "Neurotransmitters"],
      questionCount: 0,
      targetCount: 15,
      coverage: "low",
    },
  ];

  const recentQuestions = [
    {
      id: "q1",
      stem: "A 62-year-old man with a history of hypertension presents with...",
      status: "approved",
      date: "2 hours ago",
    },
    {
      id: "q2",
      stem: "A 45-year-old woman presents to the emergency department with...",
      status: "pending",
      date: "5 hours ago",
    },
    {
      id: "q3",
      stem: "Which of the following is the most likely diagnosis in a patient...",
      status: "approved",
      date: "1 day ago",
    },
    {
      id: "q4",
      stem: "A 70-year-old man presents with progressive shortness of breath...",
      status: "rejected",
      date: "1 day ago",
    },
    {
      id: "q5",
      stem: "The mechanism of action of beta-blockers in heart failure...",
      status: "pending",
      date: "2 days ago",
    },
  ];

  const getCoverageColor = (coverage: string) => {
    if (coverage === "high") return "text-success";
    if (coverage === "medium") return "text-warning";
    return "text-destructive";
  };

  const getCoverageDot = (coverage: string) => {
    const color =
      coverage === "high"
        ? "bg-success"
        : coverage === "medium"
        ? "bg-warning"
        : "bg-destructive";
    return <div className={`h-2 w-2 rounded-full ${color}`} />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved")
      return (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      );
    if (status === "pending")
      return (
        <Badge variant="outline" className="border-warning text-warning">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    return (
      <Badge variant="outline" className="border-destructive text-destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Courses</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Pathology</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1>Pathology</h1>
            <Button variant="ghost" size="icon">
              <Edit className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>PATH-250</span>
            <span>•</span>
            <span>Fall 2025</span>
            <span>•</span>
            <span>2nd Year</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Course
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload New Syllabus
          </Button>
          <Link to={`/generate/topic`}>
            <Button className="bg-primary hover:bg-primary/90">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Questions
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-12 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">28</div>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="text-success">
                <CheckCircle className="mr-1 inline h-3 w-3" />
                18 approved
              </span>
              <span className="text-warning">
                <Clock className="mr-1 inline h-3 w-3" />
                8 pending
              </span>
              <span className="text-destructive">
                <XCircle className="mr-1 inline h-3 w-3" />
                2 rejected
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blueprint Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">82%</div>
            <Link
              to="/analytics/blueprint-coverage"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              View Coverage →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0.94</div>
            <div className="mt-2 flex items-center text-sm text-muted-foreground">
              <span>⭐⭐⭐⭐⭐</span>
              <span className="ml-2">Excellent</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Timeline */}
      <div className="mb-12">
        <h3 className="mb-6">Weekly Timeline</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {weeks.map((week) => (
            <Card
              key={week.id}
              className="group transition-shadow hover:shadow-lg cursor-pointer"
            >
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline">Week {week.id}</Badge>
                  {getCoverageDot(week.coverage)}
                </div>
                <CardTitle className="text-lg">{week.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {week.topics.slice(0, 2).map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                    {week.topics.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{week.topics.length - 2}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Questions</span>
                      <span className="font-medium">
                        {week.questionCount} / {week.targetCount}
                      </span>
                    </div>
                    <Progress
                      value={(week.questionCount / week.targetCount) * 100}
                      className="h-2"
                    />
                  </div>

                  <Link to={`/courses/${courseId}/week/${week.id}/generate`}>
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Questions */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h3>Recent Questions</h3>
          <Link
            to={`/courses/${courseId}/questions`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View All Questions
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentQuestions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="mb-1 text-sm">{question.stem}</p>
                    <p className="text-xs text-muted-foreground">{question.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(question.status)}
                    <Link to={`/questions/${question.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {question.status === "pending" && (
                      <Button size="sm" className="bg-success hover:bg-success/90">
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
