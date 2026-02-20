import { useNavigate, useLocation } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  RotateCcw,
  Home,
  BookOpen,
} from "lucide-react";

// Mock session results
const MOCK_RESULTS = {
  totalQuestions: 10,
  correct: 7,
  incorrect: 3,
  timeSpent: 845, // seconds
  averageTimePerQuestion: 84.5,
  mode: "Practice Mode",
  subjects: ["Cardiology", "Endocrinology"],
  performance: {
    excellent: 3,
    good: 4,
    needsWork: 3,
  },
  breakdown: [
    {
      id: 1,
      stem: "A 45-year-old man presents with acute chest pain...",
      yourAnswer: "B",
      correctAnswer: "B",
      isCorrect: true,
      timeSpent: 120,
      subject: "Cardiology",
    },
    {
      id: 2,
      stem: "A 28-year-old woman presents with fatigue...",
      yourAnswer: "A",
      correctAnswer: "A",
      isCorrect: true,
      timeSpent: 95,
      subject: "Endocrinology",
    },
    {
      id: 3,
      stem: "Which enzyme is deficient in phenylketonuria?",
      yourAnswer: "C",
      correctAnswer: "A",
      isCorrect: false,
      timeSpent: 45,
      subject: "Biochemistry",
    },
  ],
  strengths: ["Cardiovascular System", "Clinical Reasoning"],
  weaknesses: ["Biochemistry", "Metabolic Disorders"],
};

export default function StudentResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, subjects, incomplete } = location.state || {};

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const accuracyPercentage = Math.round(
    (MOCK_RESULTS.correct / MOCK_RESULTS.totalQuestions) * 100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#FFF9E6] p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="size-20 bg-primary rounded-full flex items-center justify-center mx-auto">
            {accuracyPercentage >= 70 ? (
              <CheckCircle2 className="size-10 text-white" />
            ) : (
              <Target className="size-10 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {incomplete ? "Session Paused" : "Session Complete!"}
            </h1>
            <p className="text-muted-foreground">
              {accuracyPercentage >= 80
                ? "Excellent work! You're mastering this material."
                : accuracyPercentage >= 70
                ? "Good job! Keep practicing to improve."
                : "Keep learning! Review the explanations to strengthen your understanding."}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="size-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold">{accuracyPercentage}%</p>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="size-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{MOCK_RESULTS.correct}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="size-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{MOCK_RESULTS.incorrect}</p>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="size-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{formatTime(MOCK_RESULTS.timeSpent)}</p>
              <p className="text-sm text-muted-foreground">Total Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strengths */}
            <div>
              <h3 className="font-semibold mb-3">Strengths</h3>
              <div className="flex flex-wrap gap-2">
                {MOCK_RESULTS.strengths.map((strength) => (
                  <Badge
                    key={strength}
                    variant="secondary"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div>
              <h3 className="font-semibold mb-3">Areas for Improvement</h3>
              <div className="flex flex-wrap gap-2">
                {MOCK_RESULTS.weaknesses.map((weakness) => (
                  <Badge
                    key={weakness}
                    variant="secondary"
                    className="bg-orange-50 text-orange-700 border-orange-200"
                  >
                    {weakness}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Average Time */}
            <div>
              <h3 className="font-semibold mb-2">Average Time per Question</h3>
              <div className="flex items-center gap-4">
                <Progress
                  value={(MOCK_RESULTS.averageTimePerQuestion / 120) * 100}
                  className="h-3 flex-1"
                />
                <span className="font-medium">
                  {formatTime(Math.round(MOCK_RESULTS.averageTimePerQuestion))}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Target: ~90 seconds per question
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Question Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_RESULTS.breakdown.map((question, index) => (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border-2 ${
                    question.isCorrect
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`size-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                          question.isCorrect
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      >
                        {question.isCorrect ? (
                          <CheckCircle2 className="size-4 text-white" />
                        ) : (
                          <XCircle className="size-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">Question {index + 1}</span>
                          <Badge variant="secondary" className="text-xs">
                            {question.subject}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(question.timeSpent)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {question.stem.substring(0, 100)}...
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            Your answer:{" "}
                            <span
                              className={
                                question.isCorrect
                                  ? "font-semibold text-green-700"
                                  : "font-semibold text-red-700"
                              }
                            >
                              {question.yourAnswer}
                            </span>
                          </span>
                          {!question.isCorrect && (
                            <span>
                              Correct answer:{" "}
                              <span className="font-semibold text-green-700">
                                {question.correctAnswer}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/student-dashboard")}
          >
            <Home className="size-5 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/student/progress")}
          >
            <BookOpen className="size-5 mr-2" />
            View Detailed Progress
          </Button>
          <Button
            size="lg"
            onClick={() => navigate("/student/practice")}
          >
            <RotateCcw className="size-5 mr-2" />
            Start New Session
          </Button>
        </div>
      </div>
    </div>
  );
}
