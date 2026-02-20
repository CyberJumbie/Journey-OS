import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Edit, CheckCircle, AlertCircle, Circle } from "lucide-react";

export default function ReviewSyllabusMapping() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const weeks = [
    {
      week: 1,
      title: "Introduction to Cardiovascular System",
      topics: ["Heart Anatomy", "Blood Flow", "Cardiac Cycle"],
      blueprintSections: [
        { name: "Cardiovascular System", confidence: 95 },
        { name: "Normal Processes", confidence: 88 },
      ],
    },
    {
      week: 2,
      title: "Myocardial Infarction",
      topics: ["MI Pathophysiology", "Risk Factors", "Clinical Presentation"],
      blueprintSections: [
        { name: "Cardiovascular System", confidence: 92 },
        { name: "Pathologic Processes", confidence: 90 },
      ],
    },
    {
      week: 3,
      title: "Heart Failure",
      topics: ["Systolic Dysfunction", "Diastolic Dysfunction", "Treatment"],
      blueprintSections: [
        { name: "Cardiovascular System", confidence: 94 },
        { name: "Pathologic Processes", confidence: 85 },
      ],
    },
    {
      week: 4,
      title: "Arrhythmias",
      topics: ["Atrial Fibrillation", "Ventricular Tachycardia", "ECG Reading"],
      blueprintSections: [
        { name: "Cardiovascular System", confidence: 91 },
        { name: "Diagnostic Tests", confidence: 72 },
      ],
    },
    {
      week: 5,
      title: "Nervous System Overview",
      topics: ["CNS Anatomy", "Neural Pathways", "Neurotransmitters"],
      blueprintSections: [
        { name: "Nervous System", confidence: 89 },
        { name: "Normal Processes", confidence: 65 },
      ],
    },
  ];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-success bg-success/10 border-success/20";
    if (confidence >= 60) return "text-warning bg-warning/10 border-warning/20";
    return "text-destructive bg-destructive/10 border-destructive/20";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="h-3 w-3" />;
    if (confidence >= 60) return <AlertCircle className="h-3 w-3" />;
    return <Circle className="h-3 w-3" />;
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Step 3 of 3</span>
            <span className="font-medium">100%</span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-2">Review Course Structure</h1>
          <p className="text-muted-foreground">
            We've parsed your syllabus into weeks. Review and adjust as needed.
          </p>
        </div>

        {/* Confidence Legend */}
        <Card className="mb-6">
          <CardContent className="flex items-center gap-8 p-4">
            <span className="text-sm font-medium">Confidence Legend:</span>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm">High (80-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-sm">Medium (60-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-destructive" />
              <span className="text-sm">Low (&lt;60%)</span>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Structure Table */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Week</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Topics</TableHead>
                  <TableHead>Blueprint Sections</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map((week) => (
                  <TableRow key={week.week} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge variant="outline">{week.week}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{week.title}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {week.blueprintSections.map((section) => (
                          <Badge
                            key={section.name}
                            variant="outline"
                            className={`text-xs ${getConfidenceColor(
                              section.confidence
                            )}`}
                          >
                            <span className="mr-1">
                              {getConfidenceIcon(section.confidence)}
                            </span>
                            {section.name} {section.confidence}%
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary Sidebar */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Weeks</p>
              <p className="text-3xl font-bold">{weeks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Topics</p>
              <p className="text-3xl font-bold">
                {weeks.reduce((acc, week) => acc + week.topics.length, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Blueprint Coverage</p>
              <p className="text-3xl font-bold">87%</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/courses/${courseId}/upload-syllabus`)}
          >
            Back
          </Button>
          <div className="flex gap-4">
            <Button variant="outline">Save Draft</Button>
            <Button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="bg-primary hover:bg-primary/90"
            >
              Complete Setup
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
