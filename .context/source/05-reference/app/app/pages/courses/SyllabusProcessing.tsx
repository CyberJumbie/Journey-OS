import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Progress } from "../../components/ui/progress";
import { Sparkles } from "lucide-react";

export default function SyllabusProcessing() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Extracting text...");

  useEffect(() => {
    const stages = [
      { progress: 20, status: "Extracting text...", delay: 800 },
      { progress: 50, status: "Identifying course structure...", delay: 1200 },
      { progress: 80, status: "Mapping to USMLE blueprint...", delay: 1000 },
      { progress: 100, status: "Complete!", delay: 500 },
    ];

    let currentStage = 0;

    const processStage = () => {
      if (currentStage < stages.length) {
        const stage = stages[currentStage];
        setProgress(stage.progress);
        setStatus(stage.status);
        currentStage++;

        if (currentStage === stages.length) {
          setTimeout(() => {
            navigate(`/courses/${courseId}/review-mapping`);
          }, 1000);
        } else {
          setTimeout(processStage, stage.delay);
        }
      }
    };

    processStage();
  }, [navigate, courseId]);

  return (
    <DashboardLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Animated Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="animate-pulse">
                <Sparkles className="h-20 w-20 text-primary" />
              </div>
              <div className="absolute inset-0 animate-ping opacity-75">
                <Sparkles className="h-20 w-20 text-primary" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Processing Your Syllabus</h2>
            <p className="text-lg font-medium text-primary">{status}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground">{progress}%</p>
          </div>

          <p className="text-sm text-muted-foreground">
            This may take up to 2 minutes
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
