import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Slider } from "../../components/ui/slider";
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
import { Checkbox } from "../../components/ui/checkbox";
import { Switch } from "../../components/ui/switch";
import { ChevronDown, Clock, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Progress } from "../../components/ui/progress";

export default function GenerateQuestionsSyllabus() {
  const navigate = useNavigate();
  const { courseId, weekId } = useParams();
  const [questionCount, setQuestionCount] = useState([5]);
  const [difficulty, setDifficulty] = useState("mixed");
  const [questionType, setQuestionType] = useState("single-best");
  const [focusAreas, setFocusAreas] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const handleGenerate = () => {
    setGenerating(true);
    setProgress(0);
    setStatus("Extracting context from USMLE blueprint...");

    // Simulate generation progress
    const stages = [
      { progress: 20, status: "Extracting context from USMLE blueprint..." },
      { progress: 40, status: "Generating question 1 of 5..." },
      { progress: 50, status: "Generating question 2 of 5..." },
      { progress: 60, status: "Generating question 3 of 5..." },
      { progress: 70, status: "Generating question 4 of 5..." },
      { progress: 80, status: "Generating question 5 of 5..." },
      { progress: 90, status: "Fact-checking medical accuracy..." },
      { progress: 95, status: "Checking for duplicates..." },
      { progress: 100, status: "Complete!" },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setStatus(stages[currentStage].status);
        currentStage++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          navigate(`/courses/${courseId}/questions`);
        }, 1000);
      }
    }, 600);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
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
              <BreadcrumbPage>Week {weekId}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Generate</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">Generate Questions for Week {weekId}</h1>
          <h3 className="text-muted-foreground">Myocardial Infarction</h3>
        </div>

        {/* Context Section */}
        <Card className="mb-8 bg-accent/50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Topics covered</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>MI Pathophysiology</li>
                  <li>Risk Factors and Prevention</li>
                  <li>Clinical Presentation and Diagnosis</li>
                  <li>Treatment and Management</li>
                </ul>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Blueprint sections</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Cardiovascular System</Badge>
                  <Badge variant="secondary">Pathologic Processes</Badge>
                  <Badge variant="secondary">Diagnostic Tests</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <div className="space-y-8">
          {/* Number of Questions */}
          <div className="space-y-4">
            <Label>Number of Questions</Label>
            <div className="flex items-center gap-8">
              <Slider
                value={questionCount}
                onValueChange={setQuestionCount}
                max={20}
                min={1}
                step={1}
                className="flex-1"
              />
              <div className="flex h-12 w-16 items-center justify-center rounded-lg border-2 border-primary bg-primary/10">
                <span className="text-2xl font-bold text-primary">
                  {questionCount[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-4">
            <Label>Difficulty Level</Label>
            <RadioGroup value={difficulty} onValueChange={setDifficulty}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card
                  className={`cursor-pointer transition-colors ${
                    difficulty === "easy" ? "border-primary bg-accent" : ""
                  }`}
                  onClick={() => setDifficulty("easy")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <RadioGroupItem value="easy" id="easy" />
                    <Label htmlFor="easy" className="cursor-pointer font-normal">
                      Easy
                    </Label>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-colors ${
                    difficulty === "medium" ? "border-primary bg-accent" : ""
                  }`}
                  onClick={() => setDifficulty("medium")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="cursor-pointer font-normal">
                      Medium
                    </Label>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-colors ${
                    difficulty === "hard" ? "border-primary bg-accent" : ""
                  }`}
                  onClick={() => setDifficulty("hard")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <RadioGroupItem value="hard" id="hard" />
                    <Label htmlFor="hard" className="cursor-pointer font-normal">
                      Hard
                    </Label>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-colors ${
                    difficulty === "mixed" ? "border-primary bg-accent" : ""
                  }`}
                  onClick={() => setDifficulty("mixed")}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <RadioGroupItem value="mixed" id="mixed" />
                    <Label htmlFor="mixed" className="cursor-pointer font-normal">
                      Mixed
                    </Label>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </div>

          {/* Question Type */}
          <div className="space-y-4">
            <Label>Question Type</Label>
            <RadioGroup value={questionType} onValueChange={setQuestionType}>
              <Card
                className={`cursor-pointer transition-colors ${
                  questionType === "single-best" ? "border-primary bg-accent" : ""
                }`}
                onClick={() => setQuestionType("single-best")}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <RadioGroupItem value="single-best" id="single-best" />
                  <div>
                    <Label
                      htmlFor="single-best"
                      className="cursor-pointer font-normal"
                    >
                      Single Best Answer
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Standard multiple choice with one correct answer
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-colors ${
                  questionType === "clinical-vignette"
                    ? "border-primary bg-accent"
                    : ""
                }`}
                onClick={() => setQuestionType("clinical-vignette")}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <RadioGroupItem value="clinical-vignette" id="clinical-vignette" />
                  <div>
                    <Label
                      htmlFor="clinical-vignette"
                      className="cursor-pointer font-normal"
                    >
                      Clinical Vignette
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Patient case-based scenario questions
                    </p>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          </div>

          {/* Focus Areas */}
          <div className="space-y-2">
            <Label htmlFor="focus">Focus Areas (Optional)</Label>
            <Textarea
              id="focus"
              placeholder="Any specific topics or learning objectives to emphasize?"
              rows={4}
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
            />
          </div>

          {/* Advanced Options */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between p-0">
                <span className="font-medium">Advanced Options</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="space-y-3">
                <Label>Bloom's Taxonomy Level</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" defaultChecked />
                    <label htmlFor="remember" className="text-sm font-normal">
                      Remember
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="understand" defaultChecked />
                    <label htmlFor="understand" className="text-sm font-normal">
                      Understand
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="apply" defaultChecked />
                    <label htmlFor="apply" className="text-sm font-normal">
                      Apply
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="analyze" />
                    <label htmlFor="analyze" className="text-sm font-normal">
                      Analyze
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="images">Include diagnostic images</Label>
                <Switch id="images" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Preview Estimate */}
        <Card className="mt-8 bg-muted/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Estimated time: 2-3 minutes</p>
                <p className="text-xs text-muted-foreground">
                  This will generate {questionCount[0]} questions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex justify-between gap-4">
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} className="bg-primary hover:bg-primary/90">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Questions
          </Button>
        </div>
      </div>

      {/* Generation Progress Modal */}
      <Dialog open={generating} onOpenChange={setGenerating}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Generating Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="animate-pulse">
                  <Sparkles className="h-16 w-16 text-primary" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm font-medium text-primary">{status}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              This may take 1-2 minutes
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
