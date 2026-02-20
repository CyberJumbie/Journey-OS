import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Progress } from "../../components/ui/progress";
import { ChevronRight, ChevronLeft } from "lucide-react";

const TEACHING_AREAS = [
  "Basic Sciences (Pre-clinical)",
  "Clinical Sciences",
  "Board Exam Preparation",
  "Clerkship Education",
  "Residency Training",
];

const QUESTION_TYPES = [
  "Multiple Choice (Single Best Answer)",
  "Multiple Choice (Multiple Correct)",
  "Clinical Vignettes",
  "Image-based Questions",
  "Laboratory Data Interpretation",
];

const USAGE_GOALS = [
  "Create course exam questions",
  "Build question banks for students",
  "Generate USMLE-style practice questions",
  "Assess student learning outcomes",
  "Create formative assessments",
];

export default function FacultyOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    teachingAreas: [] as string[],
    questionTypes: [] as string[],
    usageGoals: [] as string[],
    courseName: "",
  });

  const handleTeachingAreaToggle = (area: string) => {
    setFormData({
      ...formData,
      teachingAreas: formData.teachingAreas.includes(area)
        ? formData.teachingAreas.filter((a) => a !== area)
        : [...formData.teachingAreas, area],
    });
  };

  const handleQuestionTypeToggle = (type: string) => {
    setFormData({
      ...formData,
      questionTypes: formData.questionTypes.includes(type)
        ? formData.questionTypes.filter((t) => t !== type)
        : [...formData.questionTypes, type],
    });
  };

  const handleUsageGoalToggle = (goal: string) => {
    setFormData({
      ...formData,
      usageGoals: formData.usageGoals.includes(goal)
        ? formData.usageGoals.filter((g) => g !== goal)
        : [...formData.usageGoals, goal],
    });
  };

  const handleComplete = () => {
    // Save preferences and navigate to faculty dashboard
    navigate("/dashboard");
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#FFF9E6] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="size-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-xl">M</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome, Faculty!</h1>
          <p className="text-muted-foreground">
            Let's set up your teaching profile
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
            {/* Step 1: Teaching Areas */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    What are your primary teaching areas?
                  </h2>
                  <p className="text-muted-foreground">
                    Select all areas you teach or coordinate
                  </p>
                </div>

                <div className="space-y-3">
                  {TEACHING_AREAS.map((area) => (
                    <div
                      key={area}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.teachingAreas.includes(area)
                          ? "border-primary bg-[#FFF9E6]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleTeachingAreaToggle(area)}
                    >
                      <Checkbox
                        checked={formData.teachingAreas.includes(area)}
                        onCheckedChange={() => handleTeachingAreaToggle(area)}
                      />
                      <Label className="cursor-pointer flex-1">{area}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Question Types */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    What types of questions do you create?
                  </h2>
                  <p className="text-muted-foreground">
                    Choose the formats you commonly use
                  </p>
                </div>

                <div className="space-y-3">
                  {QUESTION_TYPES.map((type) => (
                    <div
                      key={type}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.questionTypes.includes(type)
                          ? "border-primary bg-[#FFF9E6]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleQuestionTypeToggle(type)}
                    >
                      <Checkbox
                        checked={formData.questionTypes.includes(type)}
                        onCheckedChange={() => handleQuestionTypeToggle(type)}
                      />
                      <Label className="cursor-pointer flex-1">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Usage Goals */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    How will you use the platform?
                  </h2>
                  <p className="text-muted-foreground">
                    Select your main objectives
                  </p>
                </div>

                <div className="space-y-3">
                  {USAGE_GOALS.map((goal) => (
                    <div
                      key={goal}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.usageGoals.includes(goal)
                          ? "border-primary bg-[#FFF9E6]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleUsageGoalToggle(goal)}
                    >
                      <Checkbox
                        checked={formData.usageGoals.includes(goal)}
                        onCheckedChange={() => handleUsageGoalToggle(goal)}
                      />
                      <Label className="cursor-pointer flex-1">{goal}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: First Course */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    What's your first course?
                  </h2>
                  <p className="text-muted-foreground">
                    You can add more courses later
                  </p>
                </div>

                <div>
                  <Label htmlFor="courseName">Course Name</Label>
                  <Input
                    id="courseName"
                    placeholder="e.g., Introduction to Clinical Medicine"
                    value={formData.courseName}
                    onChange={(e) =>
                      setFormData({ ...formData, courseName: e.target.value })
                    }
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Don't worry, you can skip this and add courses later from your dashboard
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
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
            onClick={() => navigate("/dashboard")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
