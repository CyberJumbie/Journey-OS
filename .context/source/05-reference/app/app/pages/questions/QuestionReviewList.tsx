import { useState } from "react";
import { Link, useParams } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { CheckCircle, Clock, XCircle, MoreHorizontal, Eye, Sparkles, FileDown, AlertCircle } from "lucide-react";

export default function QuestionReviewList() {
  const { courseId } = useParams();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const questions = [
    {
      id: "q1",
      stem: "A 62-year-old man with a history of hypertension and hyperlipidemia presents to the emergency department with severe chest pain radiating to the left arm...",
      status: "pending",
      difficulty: "medium",
      topics: ["Myocardial Infarction", "Cardiovascular"],
      qualityScore: 0.92,
      factCheck: true,
      duplicates: 0,
      date: "2 hours ago",
    },
    {
      id: "q2",
      stem: "A 45-year-old woman presents with progressive shortness of breath and orthopnea. Physical examination reveals jugular venous distension...",
      status: "approved",
      difficulty: "hard",
      topics: ["Heart Failure", "Cardiovascular"],
      qualityScore: 0.95,
      factCheck: true,
      duplicates: 0,
      date: "5 hours ago",
    },
    {
      id: "q3",
      stem: "Which of the following is the most likely mechanism of action for beta-blockers in the treatment of heart failure with reduced ejection fraction?",
      status: "pending",
      difficulty: "medium",
      topics: ["Pharmacology", "Heart Failure"],
      qualityScore: 0.88,
      factCheck: true,
      duplicates: 1,
      date: "1 day ago",
    },
    {
      id: "q4",
      stem: "A 70-year-old man with a history of atrial fibrillation presents with sudden onset of right leg pain and coolness. Pulses are diminished in the right lower extremity...",
      status: "rejected",
      difficulty: "hard",
      topics: ["Thromboembolism", "Cardiovascular"],
      qualityScore: 0.76,
      factCheck: false,
      duplicates: 0,
      date: "1 day ago",
    },
    {
      id: "q5",
      stem: "A patient presents with ECG findings showing ST elevation in leads II, III, and aVF. Which coronary artery is most likely affected?",
      status: "pending",
      difficulty: "easy",
      topics: ["Myocardial Infarction", "ECG"],
      qualityScore: 0.91,
      factCheck: true,
      duplicates: 0,
      date: "2 days ago",
    },
  ];

  const filteredQuestions =
    filter === "all" ? questions : questions.filter((q) => q.status === filter);

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

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: "bg-success/10 text-success border-success/20",
      medium: "bg-warning/10 text-warning border-warning/20",
      hard: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return (
      <Badge variant="outline" className={colors[difficulty as keyof typeof colors]}>
        {difficulty}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Courses</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/courses/${courseId}`}>Pathology</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Questions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2">Review Questions</h1>
        <p className="text-muted-foreground">
          Review and approve generated questions for your course
        </p>
      </div>

      {/* Filter Chips */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-foreground" : ""}
        >
          All ({questions.length})
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
          className={filter === "pending" ? "bg-warning text-white" : ""}
        >
          <Clock className="mr-1 h-3 w-3" />
          Pending ({questions.filter((q) => q.status === "pending").length})
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("approved")}
          className={filter === "approved" ? "bg-success text-white" : ""}
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          Approved ({questions.filter((q) => q.status === "approved").length})
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("rejected")}
          className={filter === "rejected" ? "bg-destructive text-white" : ""}
        >
          <XCircle className="mr-1 h-3 w-3" />
          Rejected ({questions.filter((q) => q.status === "rejected").length})
        </Button>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link to="/generate/topic">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate More
            </Button>
          </Link>
        </div>
      </div>

      {/* Question Cards */}
      <div className="space-y-4">
        {filteredQuestions.map((question) => (
          <Card key={question.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Checkbox className="mt-1" />

                <div className="flex-1 space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-start justify-between">
                    {getStatusBadge(question.status)}
                  </div>

                  {/* Question Stem */}
                  <p className="text-sm leading-relaxed">
                    {question.stem.slice(0, 150)}
                    {question.stem.length > 150 && (
                      <Link
                        to={`/questions/${question.id}`}
                        className="ml-1 text-primary hover:underline"
                      >
                        Read more
                      </Link>
                    )}
                  </p>

                  {/* Topics */}
                  <div className="flex flex-wrap gap-2">
                    {getDifficultyBadge(question.difficulty)}
                    {question.topics.map((topic) => (
                      <Badge key={topic} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Quality:</span>
                      <span className="text-muted-foreground">
                        {question.qualityScore}
                      </span>
                      <span className="text-warning">
                        {"★".repeat(Math.round(question.qualityScore * 5))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {question.factCheck ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span className="text-success">Fact-checked</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-destructive" />
                          <span className="text-destructive">Fact-check failed</span>
                        </>
                      )}
                    </div>
                    {question.duplicates > 0 && (
                      <div className="flex items-center gap-1 text-warning">
                        <AlertCircle className="h-3 w-3" />
                        <span>{question.duplicates} similar</span>
                      </div>
                    )}
                    <span className="text-muted-foreground">{question.date}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link to={`/questions/${question.id}`}>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Review
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Showing 1-5 of {filteredQuestions.length}</span>
      </div>
    </DashboardLayout>
  );
}
