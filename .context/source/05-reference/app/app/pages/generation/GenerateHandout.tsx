import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Checkbox } from "../../components/ui/checkbox";
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
import { BookOpen, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface HandoutConfig {
  title: string;
  type: 'study-guide' | 'quick-reference' | 'practice-questions' | 'summary';
  sections: {
    keyConcepts: boolean;
    clinicalPearls: boolean;
    practiceQuestions: boolean;
    references: boolean;
    diagrams: boolean;
  };
  layout: '1-column' | '2-column';
  includeImages: boolean;
}

export default function GenerateHandout() {
  const { courseId, weekId } = useParams();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");

  const [config, setConfig] = useState<HandoutConfig>({
    title: "",
    type: 'study-guide',
    sections: {
      keyConcepts: true,
      clinicalPearls: true,
      practiceQuestions: true,
      references: true,
      diagrams: false,
    },
    layout: '2-column',
    includeImages: true,
  });

  const handoutTypes = {
    'study-guide': {
      name: 'Study Guide',
      description: 'Comprehensive guide with concepts, examples, and practice questions',
    },
    'quick-reference': {
      name: 'Quick Reference',
      description: 'Condensed summary for rapid review and memorization',
    },
    'practice-questions': {
      name: 'Practice Questions',
      description: 'Collection of practice questions with detailed explanations',
    },
    'summary': {
      name: 'Summary Sheet',
      description: 'One-page overview of key topics and takeaways',
    },
  };

  const handleGenerate = () => {
    if (!config.title.trim()) {
      toast.error("Please enter a handout title");
      return;
    }

    const selectedSections = Object.values(config.sections).filter(Boolean).length;
    if (selectedSections === 0) {
      toast.error("Please select at least one section to include");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    const stages = [
      { progress: 10, status: 'Analyzing course materials...' },
      { progress: 25, status: 'Extracting key concepts...' },
      { progress: 40, status: 'Compiling clinical pearls...' },
      { progress: 55, status: 'Selecting practice questions...' },
      { progress: 70, status: 'Formatting content...' },
      { progress: 85, status: 'Adding references and citations...' },
      { progress: 100, status: 'Handout ready for download!' },
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
          toast.success(`Handout "${config.title}" generated successfully!`);
          // In a real app, this would trigger a download
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
              <BreadcrumbPage>Generate Handout</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-color" />
            </div>
            <h1 className="text-2xl font-semibold">Generate Study Handout</h1>
          </div>
          <p className="text-text-secondary">
            Create a study guide, summary, or reference sheet for Week {weekId}
          </p>
        </div>

        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Handout Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Handout Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Week 1 - Cardiovascular System Study Guide"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Handout Type</Label>
              <RadioGroup
                value={config.type}
                onValueChange={(value) => setConfig({ ...config, type: value as HandoutConfig['type'] })}
              >
                {Object.entries(handoutTypes).map(([key, { name, description }]) => (
                  <div key={key} className="flex items-start space-x-2">
                    <RadioGroupItem value={key} id={key} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={key} className="font-normal">
                        {name}
                      </Label>
                      <p className="text-sm text-text-secondary mt-0.5">{description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Sections to Include */}
        <Card>
          <CardHeader>
            <CardTitle>Content Sections</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Select which sections to include in your handout
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="keyConcepts"
                checked={config.sections.keyConcepts}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    sections: { ...config.sections, keyConcepts: checked as boolean },
                  })
                }
              />
              <div className="flex-1">
                <Label htmlFor="keyConcepts" className="font-normal">
                  Key Concepts
                </Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  Main topics and learning objectives with definitions
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="clinicalPearls"
                checked={config.sections.clinicalPearls}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    sections: { ...config.sections, clinicalPearls: checked as boolean },
                  })
                }
              />
              <div className="flex-1">
                <Label htmlFor="clinicalPearls" className="font-normal">
                  Clinical Pearls
                </Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  High-yield clinical correlations and test-taking tips
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="practiceQuestions"
                checked={config.sections.practiceQuestions}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    sections: { ...config.sections, practiceQuestions: checked as boolean },
                  })
                }
              />
              <div className="flex-1">
                <Label htmlFor="practiceQuestions" className="font-normal">
                  Practice Questions
                </Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  Sample USMLE-style questions with explanations
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="references"
                checked={config.sections.references}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    sections: { ...config.sections, references: checked as boolean },
                  })
                }
              />
              <div className="flex-1">
                <Label htmlFor="references" className="font-normal">
                  References & Citations
                </Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  Source materials and recommended reading
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="diagrams"
                checked={config.sections.diagrams}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    sections: { ...config.sections, diagrams: checked as boolean },
                  })
                }
              />
              <div className="flex-1">
                <Label htmlFor="diagrams" className="font-normal">
                  Diagrams & Illustrations
                </Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  Visual aids and anatomical diagrams from lectures
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Options */}
        <Card>
          <CardHeader>
            <CardTitle>Layout Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Page Layout</Label>
              <RadioGroup
                value={config.layout}
                onValueChange={(value) => setConfig({ ...config, layout: value as '1-column' | '2-column' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1-column" id="1-column" />
                  <Label htmlFor="1-column" className="font-normal">
                    Single Column (easier to read, more pages)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2-column" id="2-column" />
                  <Label htmlFor="2-column" className="font-normal">
                    Two Columns (compact, fewer pages)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="includeImages">Include Images</Label>
                <p className="text-sm text-text-secondary mt-0.5">
                  Add relevant images and illustrations from course materials
                </p>
              </div>
              <Switch
                id="includeImages"
                checked={config.includeImages}
                onCheckedChange={(checked) => setConfig({ ...config, includeImages: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card className="border-primary-color/20 bg-primary-color/5">
          <CardHeader>
            <CardTitle>Handout Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-secondary">Type</p>
                <p className="font-medium">{handoutTypes[config.type].name}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Sections Included</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {config.sections.keyConcepts && (
                    <span className="text-xs px-2 py-1 bg-background-secondary rounded">Key Concepts</span>
                  )}
                  {config.sections.clinicalPearls && (
                    <span className="text-xs px-2 py-1 bg-background-secondary rounded">Clinical Pearls</span>
                  )}
                  {config.sections.practiceQuestions && (
                    <span className="text-xs px-2 py-1 bg-background-secondary rounded">Practice Questions</span>
                  )}
                  {config.sections.references && (
                    <span className="text-xs px-2 py-1 bg-background-secondary rounded">References</span>
                  )}
                  {config.sections.diagrams && (
                    <span className="text-xs px-2 py-1 bg-background-secondary rounded">Diagrams</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Layout</p>
                <p className="font-medium capitalize">{config.layout.replace('-', ' ')}</p>
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGenerate}>
              <Download className="w-4 h-4 mr-2" />
              Generate PDF
            </Button>
            <Button onClick={handleGenerate}>
              Generate & Edit
            </Button>
          </div>
        </div>

        {/* Generation Progress Dialog */}
        <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generating Handout</DialogTitle>
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
