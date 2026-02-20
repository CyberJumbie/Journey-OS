import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { FileText, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface TestConfig {
  title: string;
  numQuestions: number;
  timeLimit: number;
  difficultyEasy: number;
  difficultyMedium: number;
  difficultyHard: number;
  includeExplanations: boolean;
  includeReferences: boolean;
  format: 'pdf' | 'online' | 'print';
}

export default function GenerateTest() {
  const { courseId, weekId } = useParams();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");

  const [config, setConfig] = useState<TestConfig>({
    title: "",
    numQuestions: 40,
    timeLimit: 60,
    difficultyEasy: 20,
    difficultyMedium: 50,
    difficultyHard: 30,
    includeExplanations: true,
    includeReferences: true,
    format: 'pdf',
  });

  const handleDifficultyChange = (field: 'difficultyEasy' | 'difficultyMedium' | 'difficultyHard', value: number) => {
    const newConfig = { ...config, [field]: value };
    
    // Auto-adjust other values to maintain 100% total
    const total = newConfig.difficultyEasy + newConfig.difficultyMedium + newConfig.difficultyHard;
    if (total !== 100) {
      const diff = 100 - total;
      if (field !== 'difficultyEasy') newConfig.difficultyEasy = Math.max(0, Math.min(100, newConfig.difficultyEasy + diff / 2));
      if (field !== 'difficultyMedium') newConfig.difficultyMedium = Math.max(0, Math.min(100, newConfig.difficultyMedium + diff / 2));
      if (field !== 'difficultyHard') newConfig.difficultyHard = Math.max(0, Math.min(100, newConfig.difficultyHard + diff / 2));
    }
    
    setConfig(newConfig);
  };

  const handleGenerate = () => {
    if (!config.title.trim()) {
      toast.error("Please enter a test title");
      return;
    }

    const total = config.difficultyEasy + config.difficultyMedium + config.difficultyHard;
    if (Math.abs(total - 100) > 1) {
      toast.error("Difficulty percentages must sum to 100%");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    const stages = [
      { progress: 10, status: 'Analyzing course materials...' },
      { progress: 20, status: 'Selecting topics for coverage...' },
      { progress: 30, status: 'Generating easy questions...' },
      { progress: 50, status: 'Generating medium difficulty questions...' },
      { progress: 70, status: 'Generating hard questions...' },
      { progress: 85, status: 'Adding explanations and references...' },
      { progress: 95, status: 'Fact-checking and quality review...' },
      { progress: 100, status: 'Test generation complete!' },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setGenerationProgress(stages[currentStage].progress);
        setGenerationStatus(stages[currentStage].status);
        currentStage++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsGenerating(false);
          toast.success(`Test "${config.title}" generated successfully!`);
          navigate(`/courses/${courseId}/questions`);
        }, 1000);
      }
    }, 1000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
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
              <BreadcrumbLink href={`/courses/${courseId}/week/${weekId}`}>
                Week {weekId}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Generate Test</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-color" />
            </div>
            <h1 className="text-2xl font-semibold">Generate Test</h1>
          </div>
          <p className="text-text-secondary">
            Create a comprehensive exam with USMLE-style questions from Week {weekId} materials
          </p>
        </div>

        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Test Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Cardiovascular System - Midterm Exam"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numQuestions">Number of Questions</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="numQuestions"
                    value={[config.numQuestions]}
                    onValueChange={(value) => setConfig({ ...config, numQuestions: value[0] })}
                    min={10}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">{config.numQuestions}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    id="timeLimit"
                    value={[config.timeLimit]}
                    onValueChange={(value) => setConfig({ ...config, timeLimit: value[0] })}
                    min={30}
                    max={180}
                    step={15}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">{config.timeLimit}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Difficulty Distribution</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Adjust the percentage of questions for each difficulty level (must total 100%)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Easy Questions</Label>
                  <span className="text-sm font-medium">{config.difficultyEasy}%</span>
                </div>
                <Slider
                  value={[config.difficultyEasy]}
                  onValueChange={(value) => handleDifficultyChange('difficultyEasy', value[0])}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-text-secondary">
                  ~{Math.round(config.numQuestions * config.difficultyEasy / 100)} questions
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Medium Questions</Label>
                  <span className="text-sm font-medium">{config.difficultyMedium}%</span>
                </div>
                <Slider
                  value={[config.difficultyMedium]}
                  onValueChange={(value) => handleDifficultyChange('difficultyMedium', value[0])}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-text-secondary">
                  ~{Math.round(config.numQuestions * config.difficultyMedium / 100)} questions
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Hard Questions</Label>
                  <span className="text-sm font-medium">{config.difficultyHard}%</span>
                </div>
                <Slider
                  value={[config.difficultyHard]}
                  onValueChange={(value) => handleDifficultyChange('difficultyHard', value[0])}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-text-secondary">
                  ~{Math.round(config.numQuestions * config.difficultyHard / 100)} questions
                </p>
              </div>
            </div>

            {/* Total Check */}
            <div className="pt-4 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Distribution</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {config.difficultyEasy + config.difficultyMedium + config.difficultyHard}%
                  </span>
                  {Math.abs((config.difficultyEasy + config.difficultyMedium + config.difficultyHard) - 100) < 1 ? (
                    <CheckCircle className="w-4 h-4 text-success-color" />
                  ) : (
                    <span className="text-xs text-error-color">Must equal 100%</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Options */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="explanations">Include Explanations</Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  Add detailed explanations for correct and incorrect answers
                </p>
              </div>
              <Switch
                id="explanations"
                checked={config.includeExplanations}
                onCheckedChange={(checked) => setConfig({ ...config, includeExplanations: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="references">Include References</Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  Add citations to source materials and textbooks
                </p>
              </div>
              <Switch
                id="references"
                checked={config.includeReferences}
                onCheckedChange={(checked) => setConfig({ ...config, includeReferences: checked })}
              />
            </div>

            <div className="space-y-3">
              <Label>Output Format</Label>
              <RadioGroup
                value={config.format}
                onValueChange={(value) => setConfig({ ...config, format: value as 'pdf' | 'online' | 'print' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="font-normal">
                    PDF Document (for distribution)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="font-normal">
                    Online Format (for learning management system)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="print" id="print" />
                  <Label htmlFor="print" className="font-normal">
                    Print-Ready (optimized for paper)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Preview Summary */}
        <Card className="border-primary-color/20 bg-primary-color/5">
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Total Questions</p>
                <p className="font-medium">{config.numQuestions}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Time Limit</p>
                <p className="font-medium">{config.timeLimit} minutes</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Difficulty Mix</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{config.difficultyEasy}% Easy</Badge>
                  <Badge variant="secondary" className="text-xs">{config.difficultyMedium}% Medium</Badge>
                  <Badge variant="secondary" className="text-xs">{config.difficultyHard}% Hard</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Format</p>
                <p className="font-medium capitalize">{config.format}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(`/courses/${courseId}/week/${weekId}`)}
          >
            Cancel
          </Button>
          <Button onClick={handleGenerate}>
            Generate Test
          </Button>
        </div>

        {/* Generation Progress Dialog */}
        <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generating Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Progress value={generationProgress} />
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary-color" />
                <p className="text-sm text-text-secondary">{generationStatus}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
