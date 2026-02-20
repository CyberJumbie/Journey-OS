import { useParams, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { CheckCircle, Upload, Sparkles, BookOpen, Target } from "lucide-react";

export default function CourseReady() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const courseData = {
    code: "PATH-250",
    name: "Pathology",
    semester: "Fall 2025",
    year: "2nd Year",
    description: "Comprehensive course covering general and systemic pathology with emphasis on disease mechanisms and clinical correlations.",
    totalWeeks: 12,
    totalTopics: 48,
    learningObjectives: [
      "Describe the mechanisms of cellular injury and adaptation",
      "Explain the pathophysiology of major disease processes",
      "Correlate pathological findings with clinical presentations",
      "Apply pathological knowledge to USMLE-style questions",
    ],
    blueprintCoverage: 87,
    weeks: [
      { number: 1, title: "Cell Injury and Inflammation", topics: 4 },
      { number: 2, title: "Hemodynamic Disorders", topics: 5 },
      { number: 3, title: "Immune System Pathology", topics: 4 },
      { number: 4, title: "Neoplasia", topics: 6 },
      { number: 5, title: "Cardiovascular Pathology", topics: 5 },
      { number: 6, title: "Respiratory Pathology", topics: 4 },
      { number: 7, title: "Gastrointestinal Pathology", topics: 5 },
      { number: 8, title: "Hepatobiliary Pathology", topics: 3 },
      { number: 9, title: "Renal Pathology", topics: 4 },
      { number: 10, title: "Endocrine Pathology", topics: 3 },
      { number: 11, title: "Nervous System Pathology", topics: 3 },
      { number: 12, title: "Review and Integration", topics: 2 },
    ],
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/courses">Courses</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Course Setup Complete</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Success Header */}
        <div className="text-center py-8 space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-semibold mb-2">Course Setup Complete!</h1>
            <p className="text-base text-text-secondary">
              {courseData.name} is ready for question generation
            </p>
          </div>
        </div>

        {/* Course Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Course Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Course Code</p>
                <p className="font-medium">{courseData.code}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Semester</p>
                <p className="font-medium">{courseData.semester}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Year Level</p>
                <p className="font-medium">{courseData.year}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Weeks</p>
                <p className="font-medium">{courseData.totalWeeks} weeks</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-2">Description</p>
              <p className="text-sm">{courseData.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-primary">{courseData.totalWeeks}</p>
                <p className="text-sm text-text-secondary mt-1">Weeks Structured</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-primary">{courseData.totalTopics}</p>
                <p className="text-sm text-text-secondary mt-1">Topics Mapped</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-success">{courseData.blueprintCoverage}%</p>
                <p className="text-sm text-text-secondary mt-1">Blueprint Coverage</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Objectives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {courseData.learningObjectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{objective}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Weekly Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Weekly Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {courseData.weeks.map((week) => (
                <div
                  key={week.number}
                  className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">Week {week.number}</p>
                      <p className="text-sm text-text-secondary">{week.title}</p>
                    </div>
                    <Badge variant="secondary">{week.topics} topics</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Upload Course Materials</p>
                  <p className="text-sm text-text-secondary">Add lecture slides, notes, and other resources for each week</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Generate Questions</p>
                  <p className="text-sm text-text-secondary">Use AI to create USMLE-aligned questions from your materials</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Review and Refine</p>
                  <p className="text-sm text-text-secondary">Review generated questions and use AI refinement for improvements</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>
            Go to Course Dashboard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}