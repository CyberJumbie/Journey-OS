import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  BookOpen, 
  FileText, 
  Users,
  Sparkles
} from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Welcome to Journey-OS",
    description: "Let's get you set up in just a few steps",
    icon: Sparkles,
  },
  {
    id: 2,
    title: "Complete Your Profile",
    description: "Tell us a bit about yourself",
    icon: Users,
  },
  {
    id: 3,
    title: "Create Your First Course",
    description: "Start organizing your questions",
    icon: BookOpen,
  },
  {
    id: 4,
    title: "Learn the Basics",
    description: "Quick tour of key features",
    icon: FileText,
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    department: "",
    specialization: "",
    title: "",
    courseName: "",
    courseCode: "",
    semester: "",
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      navigate("/dashboard");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <div className="size-20 rounded-full bg-gradient-to-br from-[#FFC645] to-[#FFB020] flex items-center justify-center mx-auto mb-6">
              <Sparkles className="size-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Welcome to Journey-OS
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              An AI-powered platform designed specifically for Morehouse School of Medicine faculty 
              to create high-quality USMLE exam questions efficiently.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="size-5 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">AI-Powered</h3>
                <p className="text-sm text-gray-600">
                  Generate questions automatically from your syllabus
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="size-5 text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Quality Control</h3>
                <p className="text-sm text-gray-600">
                  Review and refine with AI assistance
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="size-5 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Organized</h3>
                <p className="text-sm text-gray-600">
                  Manage questions by course and topic
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
              <Users className="size-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
              Complete Your Profile
            </h2>
            <p className="text-gray-600 mb-6 text-center max-w-md mx-auto">
              Help us personalize your experience
            </p>
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., Internal Medicine"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  placeholder="e.g., Cardiology"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Associate Professor"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="size-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
              Create Your First Course
            </h2>
            <p className="text-gray-600 mb-6 text-center max-w-md mx-auto">
              Start organizing your questions by course
            </p>
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="courseName">Course Name</Label>
                <Input
                  id="courseName"
                  placeholder="e.g., Advanced Cardiovascular Medicine"
                  value={formData.courseName}
                  onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="courseCode">Course Code</Label>
                <Input
                  id="courseCode"
                  placeholder="e.g., CARD-501"
                  value={formData.courseCode}
                  onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="semester">Semester</Label>
                <Input
                  id="semester"
                  placeholder="e.g., Spring 2026"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can always create more courses later from your dashboard
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <div className="size-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
              <FileText className="size-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
              Key Features Tour
            </h2>
            <p className="text-gray-600 mb-6 text-center max-w-md mx-auto">
              Here are the main features to get you started
            </p>
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex gap-4">
                  <div className="size-10 rounded-lg bg-[#FFC645]/10 flex items-center justify-center shrink-0">
                    <FileText className="size-5 text-[#FFC645]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Generate Questions</h3>
                    <p className="text-sm text-gray-600">
                      Upload your syllabus and let AI generate USMLE-style questions automatically
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex gap-4">
                  <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Check className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Review & Refine</h3>
                    <p className="text-sm text-gray-600">
                      Review generated questions and use AI to refine them to your exact specifications
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex gap-4">
                  <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <BookOpen className="size-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Question Repository</h3>
                    <p className="text-sm text-gray-600">
                      Access all approved questions with powerful search and filtering capabilities
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex gap-4">
                  <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Users className="size-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Collaborate</h3>
                    <p className="text-sm text-gray-600">
                      Invite colleagues to collaborate on courses and share questions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep > step.id
                        ? "bg-green-600 text-white"
                        : currentStep === step.id
                        ? "bg-[#FFC645] text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step.id ? <Check className="size-4" /> : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-2 transition-colors ${
                        currentStep > step.id ? "bg-green-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Tour
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Step {currentStep} of {steps.length}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          {renderStepContent()}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length ? "Get Started" : "Continue"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}