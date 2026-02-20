import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Clock,
  BookmarkPlus,
  Flag,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

// Mock question data
const MOCK_QUESTIONS = [
  {
    id: 1,
    stem: "A 45-year-old man presents to the emergency department with acute chest pain radiating to his left arm. He has a history of hypertension and hyperlipidemia. His ECG shows ST-segment elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?",
    options: [
      { id: "A", text: "Left anterior descending artery" },
      { id: "B", text: "Right coronary artery" },
      { id: "C", text: "Left circumflex artery" },
      { id: "D", text: "Posterior descending artery" },
      { id: "E", text: "Left main coronary artery" },
    ],
    correctAnswer: "B",
    explanation: "The ECG findings of ST-segment elevation in leads II, III, and aVF indicate an inferior wall myocardial infarction. The right coronary artery (RCA) is the most common culprit vessel in inferior MI, as it supplies the inferior wall of the left ventricle in most individuals.",
    rationale: {
      correct: "The right coronary artery supplies the inferior wall of the left ventricle in approximately 70% of individuals. ST-elevation in leads II, III, and aVF localizes to the inferior wall, making RCA occlusion the most likely diagnosis.",
      wrongOptions: {
        A: "The LAD supplies the anterior wall and septum. Occlusion would cause ST-elevation in leads V1-V4.",
        C: "The LCx supplies the lateral wall. Occlusion would cause ST-elevation in leads I, aVL, V5-V6.",
        D: "The PDA is typically a branch of the RCA. While it contributes to inferior wall supply, the question asks for the main artery.",
        E: "Left main occlusion would cause widespread ST-changes affecting multiple territories, not isolated inferior changes.",
      },
    },
    tags: {
      subject: "Cardiology",
      system: "Cardiovascular",
      difficulty: "Medium",
      bloomLevel: "Application",
    },
  },
  {
    id: 2,
    stem: "A 28-year-old woman presents with fatigue, weight loss, and hyperpigmentation of skin creases and oral mucosa. Laboratory studies show hyponatremia, hyperkalemia, and low cortisol levels that fail to increase with ACTH stimulation. Which of the following is the most likely diagnosis?",
    options: [
      { id: "A", text: "Primary adrenal insufficiency (Addison's disease)" },
      { id: "B", text: "Secondary adrenal insufficiency" },
      { id: "C", text: "Cushing's syndrome" },
      { id: "D", text: "Pheochromocytoma" },
      { id: "E", text: "Conn's syndrome" },
    ],
    correctAnswer: "A",
    explanation: "The combination of hyperpigmentation, electrolyte abnormalities (hyponatremia and hyperkalemia), and failure to respond to ACTH stimulation indicates primary adrenal insufficiency. Hyperpigmentation occurs due to elevated ACTH levels stimulating melanocytes.",
    rationale: {
      correct: "Primary adrenal insufficiency is characterized by destruction of the adrenal cortex, leading to deficiency of cortisol and aldosterone. The elevated ACTH (due to lack of negative feedback) causes hyperpigmentation.",
      wrongOptions: {
        B: "Secondary adrenal insufficiency is due to pituitary dysfunction with low ACTH. Patients do NOT have hyperpigmentation or hyperkalemia.",
        C: "Cushing's syndrome presents with excess cortisol, causing weight gain, not weight loss.",
        D: "Pheochromocytoma presents with episodic hypertension, headaches, and palpitations.",
        E: "Conn's syndrome (primary hyperaldosteronism) causes hypertension and hypokalemia, not hyperkalemia.",
      },
    },
    tags: {
      subject: "Endocrinology",
      system: "Endocrine",
      difficulty: "Medium",
      bloomLevel: "Analysis",
    },
  },
];

export default function StudentQuestionView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, subjects } = location.state || {};

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];
  const totalQuestions = MOCK_QUESTIONS.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (optionId: string) => {
    if (!isAnswered) {
      setSelectedAnswer(optionId);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    setIsAnswered(true);
    setIsCorrect(correct);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      // Reset for next question
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setShowExplanation(false);
      setTimeElapsed(0);
    } else {
      // Session complete
      navigate("/student/practice/results", {
        state: { mode, subjects },
      });
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setShowExplanation(false);
    }
  };

  const handleEndSession = () => {
    navigate("/student/practice/results", {
      state: { mode, subjects, incomplete: true },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndSession}
              >
                <ChevronLeft className="size-4 mr-1" />
                End Session
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                {formatTime(timeElapsed)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBookmarked(!isBookmarked)}
              >
                <BookmarkPlus
                  className={`size-4 ${isBookmarked ? "fill-primary" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFlagged(!isFlagged)}
              >
                <Flag
                  className={`size-4 ${isFlagged ? "fill-red-500 text-red-500" : ""}`}
                />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <div className="flex items-center gap-4">
                {currentQuestion.tags && (
                  <>
                    <Badge variant="secondary">{currentQuestion.tags.subject}</Badge>
                    <Badge variant="outline">{currentQuestion.tags.difficulty}</Badge>
                  </>
                )}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Question Stem */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed">{currentQuestion.stem}</p>
            </CardContent>
          </Card>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option.id;
              const isCorrectOption = option.id === currentQuestion.correctAnswer;
              const showCorrect = isAnswered && isCorrectOption;
              const showIncorrect = isAnswered && isSelected && !isCorrect;

              return (
                <Card
                  key={option.id}
                  className={`cursor-pointer transition-all ${
                    isSelected && !isAnswered
                      ? "border-primary border-2 bg-[#FFF9E6]"
                      : "hover:border-gray-300"
                  } ${showCorrect ? "border-green-500 border-2 bg-green-50" : ""} ${
                    showIncorrect ? "border-red-500 border-2 bg-red-50" : ""
                  } ${isAnswered ? "cursor-default" : ""}`}
                  onClick={() => handleAnswerSelect(option.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`size-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected && !isAnswered
                            ? "border-primary bg-primary text-white"
                            : "border-gray-300"
                        } ${showCorrect ? "border-green-500 bg-green-500 text-white" : ""} ${
                          showIncorrect ? "border-red-500 bg-red-500 text-white" : ""
                        }`}
                      >
                        {showCorrect && <Check className="size-4" />}
                        {showIncorrect && <X className="size-4" />}
                        {!isAnswered && isSelected && (
                          <span className="text-xs font-semibold">{option.id}</span>
                        )}
                        {!isAnswered && !isSelected && (
                          <span className="text-xs font-semibold text-gray-400">
                            {option.id}
                          </span>
                        )}
                      </div>
                      <p className="flex-1">{option.text}</p>
                    </div>

                    {/* Show explanation for selected wrong answer or correct answer */}
                    {isAnswered && showExplanation && (showCorrect || showIncorrect) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-start gap-2">
                          <AlertCircle
                            className={`size-4 shrink-0 mt-0.5 ${
                              showCorrect ? "text-green-600" : "text-red-600"
                            }`}
                          />
                          <p className="text-sm text-muted-foreground">
                            {showCorrect
                              ? currentQuestion.rationale.correct
                              : currentQuestion.rationale.wrongOptions[
                                  option.id as keyof typeof currentQuestion.rationale.wrongOptions
                                ]}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Explanation Card (shown after answering) */}
          {isAnswered && showExplanation && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="size-5 text-blue-600" />
                  Explanation
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="size-4 mr-2" />
              Previous
            </Button>

            {!isAnswered ? (
              <Button
                size="lg"
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
              >
                Submit Answer
              </Button>
            ) : (
              <Button size="lg" onClick={handleNextQuestion}>
                {currentQuestionIndex < totalQuestions - 1 ? (
                  <>
                    Next Question
                    <ChevronRight className="size-4 ml-2" />
                  </>
                ) : (
                  "View Results"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
