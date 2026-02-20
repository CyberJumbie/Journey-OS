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
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuizConfig {
  title: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  isTimed: boolean;
  timeLimit: number;
  showAnswersImmediately: boolean;
}

export default function GenerateQuiz() {
  const { courseId, weekId } = useParams();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");

  const [config, setConfig] = useState<QuizConfig>({
    title: "",
    numQuestions: 10,
    difficulty: 'mixed',
    isTimed: false,
    timeLimit: 15,
    showAnswersImmediately: true,
  });

  const handleGenerate = () => {
    if (!config.title.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    const stages = [
      { progress: 15, status: 'Selecting topics from week materials...' },
      { progress: 35, status: 'Generating questions...' },
      { progress: 60, status: 'Creating answer explanations...' },
      { progress: 85, status: 'Quality check and validation...' },
      { progress: 100, status: 'Quiz ready!' },
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
          toast.success(`Quiz "${config.title}" generated successfully!`);
          navigate(`/courses/${courseId}/questions`);
        }, 1000);
      }
    }, 800);
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
              <BreadcrumbPage>Generate Quiz</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-primary-color" />
            </div>
            <h1 className="text-2xl font-semibold">Generate Quiz</h1>
          </div>
          <p className="text-text-secondary">
            Create a quick quiz with 5-15 questions for Week {weekId}
          </p>
        </div>

        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Week 1 - Quick Review Quiz"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numQuestions">Number of Questions</Label>
              <div className="flex items-center gap-3">
                <Slider
                  id="numQuestions"
                  value={[config.numQuestions]}
                  onValueChange={(value) => setConfig({ ...config, numQuestions: value[0] })}
                  min={5}
                  max={15}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">{config.numQuestions}</span>
              </div>
              <p className="text-xs text-text-secondary">
                Recommended: 10 questions for a 15-minute quiz
              </p>
            </div>

            <div className="space-y-3">
              <Label>Difficulty Level</Label>
              <RadioGroup
                value={config.difficulty}
                onValueChange={(value) => setConfig({ ...config, difficulty: value as QuizConfig['difficulty'] })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="easy" id="easy" />
                  <Label htmlFor="easy" className="font-normal">
                    Easy - Basic recall and comprehension
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="font-normal">
                    Medium - Application and analysis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hard" id="hard" />
                  <Label htmlFor="hard" className="font-normal">
                    Hard - Clinical reasoning and synthesis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mixed" id="mixed" />
                  <Label htmlFor="mixed" className="font-normal">
                    Mixed - Varied difficulty levels
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="timed">Timed Quiz</Label>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Set a time limit for completing the quiz
                  </p>
                </div>
                <Switch
                  id="timed"
                  checked={config.isTimed}
                  onCheckedChange={(checked) => setConfig({ ...config, isTimed: checked })}
                />
              </div>

              {config.isTimed && (
                <div className="space-y-2 pl-6 border-l-2 border-primary-color/20">
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      id="timeLimit"
                      value={[config.timeLimit]}
                      onValueChange={(value) => setConfig({ ...config, timeLimit: value[0] })}
                      min={5}
                      max={30}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">{config.timeLimit}</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Suggested: {Math.round(config.numQuestions * 1.5)} minutes for {config.numQuestions} questions
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="showAnswers">Show Answers Immediately</Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  Display correct answers and explanations right after submission
                </p>
              </div>
              <Switch
                id="showAnswers"
                checked={config.showAnswersImmediately}
                onCheckedChange={(checked) => setConfig({ ...config, showAnswersImmediately: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiz Summary */}
        <Card className="border-primary-color/20 bg-primary-color/5">
          <CardHeader>
            <CardTitle>Quiz Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Questions</p>
                <p className="font-medium">{config.numQuestions} questions</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Difficulty</p>
                <p className="font-medium capitalize">{config.difficulty}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Time Limit</p>
                <p className="font-medium">
                  {config.isTimed ? `${config.timeLimit} minutes` : 'Untimed'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Answer Display</p>
                <p className="font-medium">
                  {config.showAnswersImmediately ? 'Immediate' : 'After review'}
                </p>
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
            Generate Quiz
          </Button>
        </div>

        {/* Generation Progress Dialog */}
        <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generating Quiz</DialogTitle>
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
