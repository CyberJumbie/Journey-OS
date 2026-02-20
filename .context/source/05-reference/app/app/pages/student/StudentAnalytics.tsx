import DashboardLayout from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Brain,
  Zap,
} from "lucide-react";

const PERFORMANCE_BY_DIFFICULTY = [
  { level: "Easy", correct: 45, total: 50, accuracy: 90 },
  { level: "Medium", correct: 68, total: 95, accuracy: 72 },
  { level: "Hard", correct: 12, total: 25, accuracy: 48 },
];

const BLOOM_TAXONOMY_PERFORMANCE = [
  { level: "Remember", questions: 85, accuracy: 88, color: "bg-blue-500" },
  { level: "Understand", questions: 120, accuracy: 82, color: "bg-green-500" },
  { level: "Apply", questions: 95, accuracy: 76, color: "bg-yellow-500" },
  { level: "Analyze", questions: 68, accuracy: 71, color: "bg-orange-500" },
  { level: "Evaluate", questions: 42, accuracy: 65, color: "bg-red-500" },
  { level: "Create", questions: 15, accuracy: 53, color: "bg-purple-500" },
];

const USMLE_SYSTEMS = [
  { system: "Cardiovascular", questions: 95, accuracy: 82, mastery: 78 },
  { system: "Respiratory", questions: 72, accuracy: 75, mastery: 70 },
  { system: "Gastrointestinal", questions: 68, accuracy: 79, mastery: 73 },
  { system: "Renal", questions: 54, accuracy: 71, mastery: 65 },
  { system: "Endocrine", questions: 61, accuracy: 68, mastery: 62 },
  { system: "Nervous", questions: 88, accuracy: 85, mastery: 81 },
  { system: "Musculoskeletal", questions: 45, accuracy: 73, mastery: 68 },
];

const TIME_ANALYSIS = {
  averageTimePerQuestion: 85, // seconds
  fastestQuestion: 32,
  slowestQuestion: 245,
  optimalRange: { min: 60, max: 120 },
  distribution: {
    tooFast: 15, // percentage
    optimal: 60,
    tooSlow: 25,
  },
};

const QUESTION_TYPE_PERFORMANCE = [
  { type: "Clinical Vignette", count: 145, accuracy: 76 },
  { type: "Basic Science", count: 98, accuracy: 82 },
  { type: "Image-based", count: 42, accuracy: 68 },
  { type: "Laboratory Data", count: 56, accuracy: 79 },
];

const RECOMMENDATIONS = [
  {
    priority: "high",
    title: "Focus on Pharmacology",
    description: "Your accuracy is below target. Review drug mechanisms and side effects.",
    icon: AlertCircle,
    color: "text-red-600",
  },
  {
    priority: "medium",
    title: "Slow Down on Analysis Questions",
    description: "You're rushing through higher-order thinking questions. Take more time to analyze.",
    icon: Clock,
    color: "text-orange-600",
  },
  {
    priority: "low",
    title: "Great Progress on Cardiovascular",
    description: "Keep up the excellent work! Consider helping peers in study groups.",
    icon: CheckCircle2,
    color: "text-green-600",
  },
];

export default function StudentAnalytics() {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Detailed insights into your learning patterns and areas for improvement
          </p>
        </div>

        {/* Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {RECOMMENDATIONS.map((rec, index) => {
            const Icon = rec.icon;
            return (
              <Card
                key={index}
                className={`border-l-4 ${
                  rec.priority === "high"
                    ? "border-l-red-500"
                    : rec.priority === "medium"
                    ? "border-l-orange-500"
                    : "border-l-green-500"
                }`}
              >
                <CardContent className="pt-6">
                  <Icon className={`size-6 ${rec.color} mb-3`} />
                  <h3 className="font-semibold mb-2">{rec.title}</h3>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="difficulty" className="space-y-6">
          <TabsList>
            <TabsTrigger value="difficulty">By Difficulty</TabsTrigger>
            <TabsTrigger value="bloom">Bloom's Taxonomy</TabsTrigger>
            <TabsTrigger value="systems">USMLE Systems</TabsTrigger>
            <TabsTrigger value="time">Time Analysis</TabsTrigger>
          </TabsList>

          {/* Difficulty Tab */}
          <TabsContent value="difficulty" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Difficulty Level</CardTitle>
                <CardDescription>
                  How you perform across different question difficulties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {PERFORMANCE_BY_DIFFICULTY.map((level) => (
                    <div key={level.level}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{level.level}</h3>
                          <p className="text-sm text-muted-foreground">
                            {level.correct} of {level.total} correct
                          </p>
                        </div>
                        <Badge
                          variant={level.accuracy >= 70 ? "secondary" : "outline"}
                          className={
                            level.accuracy >= 70
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }
                        >
                          {level.accuracy}%
                        </Badge>
                      </div>
                      <Progress value={level.accuracy} className="h-3" />
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Target className="size-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">Recommendation</p>
                      <p className="text-sm text-blue-700">
                        Focus on medium and hard questions to improve your score. Your easy question
                        performance is excellent!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Types */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Question Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {QUESTION_TYPE_PERFORMANCE.map((type) => (
                    <div
                      key={type.type}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{type.type}</p>
                        <p className="text-sm text-muted-foreground">{type.count} questions</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={type.accuracy} className="w-24 h-2" />
                        <span className="font-semibold w-12 text-right">{type.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bloom's Taxonomy Tab */}
          <TabsContent value="bloom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="size-5" />
                  Bloom's Taxonomy Performance
                </CardTitle>
                <CardDescription>
                  Your performance across different cognitive levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {BLOOM_TAXONOMY_PERFORMANCE.map((level) => (
                    <div key={level.level}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`size-3 rounded-full ${level.color}`} />
                          <div>
                            <p className="font-medium">{level.level}</p>
                            <p className="text-xs text-muted-foreground">
                              {level.questions} questions
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold">{level.accuracy}%</span>
                      </div>
                      <Progress value={level.accuracy} className="h-2" />
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t bg-purple-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Brain className="size-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-900 mb-1">Insight</p>
                      <p className="text-sm text-purple-700">
                        Your performance decreases as cognitive complexity increases. Practice more
                        analysis and evaluation questions to build higher-order thinking skills.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USMLE Systems Tab */}
          <TabsContent value="systems" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>USMLE Organ Systems Performance</CardTitle>
                <CardDescription>
                  Track your mastery across all organ systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {USMLE_SYSTEMS.map((system) => (
                    <div
                      key={system.system}
                      className="p-4 rounded-lg border hover:border-primary transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{system.system}</h3>
                          <p className="text-sm text-muted-foreground">
                            {system.questions} questions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Mastery</p>
                          <p className="text-lg font-bold">{system.mastery}%</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                          <Progress value={system.accuracy} className="h-2" />
                          <p className="text-xs font-medium mt-1">{system.accuracy}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Completion</p>
                          <Progress
                            value={(system.questions / 100) * 100}
                            className="h-2"
                          />
                          <p className="text-xs font-medium mt-1">{system.questions} answered</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Analysis Tab */}
          <TabsContent value="time" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5" />
                  Time Management Analysis
                </CardTitle>
                <CardDescription>
                  How efficiently you use your time per question
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Average Time */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Average Time per Question</h3>
                    <span className="text-2xl font-bold">
                      {formatTime(TIME_ANALYSIS.averageTimePerQuestion)}
                    </span>
                  </div>
                  <Progress
                    value={(TIME_ANALYSIS.averageTimePerQuestion / 120) * 100}
                    className="h-3"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Optimal range: {formatTime(TIME_ANALYSIS.optimalRange.min)} -{" "}
                    {formatTime(TIME_ANALYSIS.optimalRange.max)}
                  </p>
                </div>

                {/* Time Distribution */}
                <div className="pt-6 border-t">
                  <h3 className="font-semibold mb-4">Time Distribution</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Too Fast (&lt;1 min)</span>
                        <span className="font-semibold">{TIME_ANALYSIS.distribution.tooFast}%</span>
                      </div>
                      <Progress value={TIME_ANALYSIS.distribution.tooFast} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Optimal (1-2 min)</span>
                        <span className="font-semibold">{TIME_ANALYSIS.distribution.optimal}%</span>
                      </div>
                      <Progress
                        value={TIME_ANALYSIS.distribution.optimal}
                        className="h-2 [&>div]:bg-green-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Too Slow (&gt;2 min)</span>
                        <span className="font-semibold">{TIME_ANALYSIS.distribution.tooSlow}%</span>
                      </div>
                      <Progress
                        value={TIME_ANALYSIS.distribution.tooSlow}
                        className="h-2 [&>div]:bg-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Insights */}
                <div className="pt-6 border-t bg-orange-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="size-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900 mb-1">Time Management Tip</p>
                      <p className="text-sm text-orange-700">
                        You're spending too much time on some questions. Practice making educated
                        guesses when stuck to maintain exam pace.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
