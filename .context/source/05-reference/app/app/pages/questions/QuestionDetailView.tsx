import { Link, useNavigate, useParams } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { CheckCircle, ChevronLeft, ChevronRight, ChevronDown, Edit, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function QuestionDetailView() {
  const navigate = useNavigate();
  const { questionId } = useParams();

  const question = {
    id: questionId,
    stem: "A 62-year-old man with a history of hypertension and hyperlipidemia presents to the emergency department with severe substernal chest pain that began 2 hours ago. The pain radiates to his left arm and is associated with diaphoresis and nausea. His vital signs are: BP 145/95 mmHg, HR 102/min, RR 20/min, T 37.1°C. An ECG shows ST-segment elevation in leads II, III, and aVF. Which of the following coronary arteries is most likely occluded?",
    options: [
      { letter: "A", text: "Left anterior descending artery", correct: false },
      { letter: "B", text: "Left circumflex artery", correct: false },
      { letter: "C", text: "Right coronary artery", correct: true },
      { letter: "D", text: "Left main coronary artery", correct: false },
      { letter: "E", text: "Diagonal branch", correct: false },
    ],
    explanation:
      "The ECG findings of ST-segment elevation in leads II, III, and aVF are classic for an inferior wall myocardial infarction. The right coronary artery (RCA) is the most common culprit vessel in inferior MIs, as it typically supplies the inferior wall of the left ventricle. The RCA gives rise to the posterior descending artery in most patients (right dominant circulation), which perfuses the inferior aspect of the interventricular septum and inferior wall. Left anterior descending (LAD) occlusion would cause anterior wall MI with ST elevations in V1-V4. The left circumflex would typically cause lateral wall changes (I, aVL, V5-V6).",
    citations: [
      {
        id: 1,
        title: "American Heart Association Guidelines for STEMI Management",
        url: "#",
      },
      {
        id: 2,
        title: "ECG Manifestations of Acute Myocardial Infarction - UpToDate",
        url: "#",
      },
    ],
    status: "pending",
    difficulty: "medium",
    bloomsLevel: "Apply",
    qualityScore: 0.92,
    factCheckStatus: "verified",
    createdDate: "2 hours ago",
    llm: "GPT-4",
    blueprintSections: ["Cardiovascular System", "Pathologic Processes"],
    topics: ["Myocardial Infarction", "ECG Interpretation"],
  };

  const handleApprove = () => {
    toast.success("Question approved successfully");
    setTimeout(() => navigate("/courses/1/questions"), 1000);
  };

  const handleReject = () => {
    toast.error("Question rejected");
    setTimeout(() => navigate("/courses/1/questions"), 1000);
  };

  return (
    <DashboardLayout>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-4 text-sm font-medium text-muted-foreground">
                Question 1 of 5
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <div
                    key={num}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border-2 text-sm font-medium ${
                      num === 1
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <Button
                className="w-full bg-success hover:bg-success/90"
                onClick={handleApprove}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button variant="outline" className="w-full">
                <Edit className="mr-2 h-4 w-4" />
                Edit Manually
              </Button>
              <Link to={`/questions/${questionId}/refine`}>
                <Button variant="outline" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Refine with AI
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Version History */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm">
                <p className="mb-1 font-medium">Current version: v1</p>
                <Link to={`/questions/${questionId}/history`}>
                  <Button variant="link" size="sm" className="h-auto p-0">
                    View history
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/courses/1/questions">Questions</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/courses/1/questions">Review</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Question 1</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Status Badge */}
          <div>
            <Badge variant="outline" className="border-warning text-warning">
              Pending Review
            </Badge>
          </div>

          {/* Quality Indicators */}
          <Card className="bg-muted/50">
            <CardContent className="flex flex-wrap items-center gap-6 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">All claims verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Difficulty: {question.difficulty}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Bloom's: {question.bloomsLevel}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Quality Score:</span>
                <span className="text-sm">{question.qualityScore}</span>
                <span className="text-warning">
                  {"★".repeat(Math.round(question.qualityScore * 5))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Question Display */}
          <Card>
            <CardContent className="p-8">
              <div className="space-y-8">
                {/* Stem */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Stem
                  </p>
                  <p className="text-body-large leading-relaxed">{question.stem}</p>
                </div>

                {/* Options */}
                <div>
                  <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Options
                  </p>
                  <div className="space-y-3">
                    {question.options.map((option) => (
                      <Card
                        key={option.letter}
                        className={`transition-all ${
                          option.correct
                            ? "border-l-4 border-success bg-success/5"
                            : ""
                        }`}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md font-medium ${
                              option.correct
                                ? "bg-success text-success-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {option.letter}
                          </div>
                          <p className="flex-1">{option.text}</p>
                          {option.correct && (
                            <CheckCircle className="h-5 w-5 text-success" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Explanation
                  </p>
                  <Card className="bg-accent/30">
                    <CardContent className="p-6">
                      <p className="leading-relaxed">{question.explanation}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Citations */}
          <Collapsible>
            <Card>
              <CollapsibleTrigger asChild>
                <CardContent className="flex cursor-pointer items-center justify-between p-6 transition-colors hover:bg-muted/50">
                  <h4 className="font-semibold">Sources & Citations</h4>
                  <ChevronDown className="h-5 w-5 transition-transform [[data-state=open]_&]:rotate-180" />
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="border-t p-6">
                  <div className="space-y-3">
                    {question.citations.map((citation) => (
                      <div key={citation.id} className="flex gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          [{citation.id}]
                        </span>
                        <a
                          href={citation.url}
                          className="text-sm text-primary hover:underline"
                        >
                          {citation.title}
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Metadata */}
          <Collapsible>
            <Card>
              <CollapsibleTrigger asChild>
                <CardContent className="flex cursor-pointer items-center justify-between p-6 transition-colors hover:bg-muted/50">
                  <h4 className="font-semibold">Metadata</h4>
                  <ChevronDown className="h-5 w-5 transition-transform [[data-state=open]_&]:rotate-180" />
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="border-t p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        Blueprint Sections
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {question.blueprintSections.map((section) => (
                          <Badge key={section} variant="secondary">
                            {section}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {question.topics.map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">Created By</p>
                      <p className="text-sm font-medium">System • {question.createdDate}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">LLM Used</p>
                      <p className="text-sm font-medium">{question.llm}</p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </DashboardLayout>
  );
}