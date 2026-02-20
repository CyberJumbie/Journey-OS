import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { ChevronRight, CheckCircle2 } from "lucide-react";

const SETUP_TASKS = [
  {
    title: "Institution Setup",
    description: "Configure your institution's basic information and settings",
    path: "/admin/setup",
  },
  {
    title: "Import Frameworks",
    description: "Import LCME, ACGME, EPA, USMLE, Bloom's, and Miller's frameworks",
    path: "/admin/frameworks",
  },
  {
    title: "Add Faculty",
    description: "Invite faculty members to join the platform",
    path: "/admin/faculty",
  },
  {
    title: "Configure ILOs",
    description: "Set up Institutional Learning Outcomes",
    path: "/admin/ilos",
  },
];

export default function AdminOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#FFF9E6] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="size-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-xl">M</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome, Administrator!</h1>
          <p className="text-muted-foreground">
            Let's get your institution set up
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
            {/* Step 1: Welcome & Overview */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Getting Started with Journey-OS
                  </h2>
                  <p className="text-muted-foreground">
                    As an institutional administrator, you'll have access to powerful tools for managing your medical education program.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#FFF9E6] border border-primary rounded-lg p-4">
                    <h3 className="font-semibold mb-2">What you can do:</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                        <span>Configure institution-wide frameworks and standards</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                        <span>Manage faculty accounts and permissions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                        <span>Monitor compliance and educational outcomes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                        <span>Browse and manage the knowledge graph</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 text-blue-900">Quick Setup Guide</h3>
                    <p className="text-sm text-blue-700">
                      After completing this onboarding, we recommend following the Setup Wizard to configure your institution step-by-step.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Setup Tasks Overview */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Recommended Setup Tasks
                  </h2>
                  <p className="text-muted-foreground">
                    Here's what you should do next to get your institution up and running
                  </p>
                </div>

                <div className="space-y-3">
                  {SETUP_TASKS.map((task, index) => (
                    <div
                      key={task.title}
                      className="flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-[#FFF9E6] transition-all cursor-pointer"
                      onClick={() => navigate(task.path)}
                    >
                      <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{task.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700">
                    💡 <strong>Tip:</strong> You can access these tasks anytime from your admin dashboard. Take your time to explore the platform!
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
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
                <Button onClick={() => navigate("/admin")}>
                  Go to Admin Dashboard
                  <ChevronRight className="size-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip Option */}
        {step < totalSteps && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate("/admin")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
