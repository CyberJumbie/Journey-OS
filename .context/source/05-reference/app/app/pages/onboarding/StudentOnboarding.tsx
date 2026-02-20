import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Progress } from "../../components/ui/progress";
import { ChevronRight, ChevronLeft } from "lucide-react";

const STUDY_GOALS = [
  "Prepare for USMLE Step 1",
  "Prepare for USMLE Step 2 CK",
  "Prepare for USMLE Step 3",
  "Course exam preparation",
  "General medical knowledge review",
];

const SUBJECT_INTERESTS = [
  "Anatomy",
  "Biochemistry",
  "Cardiology",
  "Emergency Medicine",
  "Internal Medicine",
  "Neurology",
  "Pathology",
  "Pediatrics",
  "Pharmacology",
  "Physiology",
  "Psychiatry",
  "Surgery",
];

const STUDY_TIME = [
  { value: "0-5", label: "0-5 hours per week" },
  { value: "5-10", label: "5-10 hours per week" },
  { value: "10-15", label: "10-15 hours per week" },
  { value: "15+", label: "15+ hours per week" },
];

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    studyGoals: [] as string[],
    subjectInterests: [] as string[],
    studyTime: "",
  });

  const handleGoalToggle = (goal: string) => {
    setFormData({
      ...formData,
      studyGoals: formData.studyGoals.includes(goal)
        ? formData.studyGoals.filter((g) => g !== goal)
        : [...formData.studyGoals, goal],
    });
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData({
      ...formData,
      subjectInterests: formData.subjectInterests.includes(subject)
        ? formData.subjectInterests.filter((s) => s !== subject)
        : [...formData.subjectInterests, subject],
    });
  };

  const handleComplete = () => {
    // Save preferences and navigate to student dashboard
    navigate("/student-dashboard");
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#FFF9E6] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="size-16 rounded-full bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">J</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Journey-OS!</h1>
          <p className="text-muted-foreground">
            Let's personalize your learning experience
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: Study Goals */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    What are your study goals?
                  </h2>
                  <p className="text-muted-foreground">
                    Select all that apply to help us tailor content for you
                  </p>
                </div>

                <div className="space-y-3">
                  {STUDY_GOALS.map((goal) => (
                    <div
                      key={goal}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.studyGoals.includes(goal)
                          ? "border-primary bg-[#FFF9E6]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleGoalToggle(goal)}
                    >
                      <Checkbox
                        checked={formData.studyGoals.includes(goal)}
                        onCheckedChange={() => handleGoalToggle(goal)}
                      />
                      <Label className="cursor-pointer flex-1">{goal}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Subject Interests */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Which subjects interest you most?
                  </h2>
                  <p className="text-muted-foreground">
                    We'll prioritize questions from these areas
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {SUBJECT_INTERESTS.map((subject) => (
                    <div
                      key={subject}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.subjectInterests.includes(subject)
                          ? "border-primary bg-[#FFF9E6]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleSubjectToggle(subject)}
                    >
                      <Checkbox
                        checked={formData.subjectInterests.includes(subject)}
                        onCheckedChange={() => handleSubjectToggle(subject)}
                      />
                      <Label className="cursor-pointer flex-1 text-sm">
                        {subject}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Study Time */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    How much time can you dedicate to studying?
                  </h2>
                  <p className="text-muted-foreground">
                    This helps us recommend a study schedule
                  </p>
                </div>

                <div className="space-y-3">
                  {STUDY_TIME.map((option) => (
                    <div
                      key={option.value}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.studyTime === option.value
                          ? "border-primary bg-[#FFF9E6]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, studyTime: option.value })
                      }
                    >
                      <p className="font-medium">{option.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft className="size-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next
                  <ChevronRight className="size-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleComplete}>
                  Complete Setup
                  <ChevronRight className="size-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/student-dashboard")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}