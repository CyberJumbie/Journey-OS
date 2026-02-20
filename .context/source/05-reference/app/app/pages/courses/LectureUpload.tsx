import { useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function LectureUpload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSection, setSelectedSection] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<
    "uploading" | "parsing" | "chunking" | "embeddings" | "extracting" | "done" | null
  >(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
      
      if (!validTypes.includes(file.type)) {
        alert("Please upload a PDF or PowerPoint file");
        return;
      }

      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert("File size must be under 100MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSection) return;

    setIsUploading(true);
    
    const stages = ["uploading", "parsing", "chunking", "embeddings", "extracting", "done"] as const;
    
    for (let i = 0; i < stages.length; i++) {
      setProcessingStage(stages[i]);
      setUploadProgress(((i + 1) / stages.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setTimeout(() => {
      navigate("/courses/lecture-processing");
    }, 1000);
  };

  const getStageStatus = (stage: string) => {
    const stages = ["uploading", "parsing", "chunking", "embeddings", "extracting", "done"];
    const currentIndex = processingStage ? stages.indexOf(processingStage) : -1;
    const stageIndex = stages.indexOf(stage);

    if (stageIndex < currentIndex) return "completed";
    if (stageIndex === currentIndex) return "active";
    return "pending";
  };

  const getStageIcon = (stage: string) => {
    const status = getStageStatus(stage);
    if (status === "completed") return <CheckCircle2 className="size-5 text-green-600" />;
    if (status === "active") return <Loader2 className="size-5 text-blue-600 animate-spin" />;
    return <div className="size-5 rounded-full border-2 border-gray-300" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Upload Lecture</h1>
          <p className="text-gray-600 mt-1">
            Upload slides to extract SubConcepts and generate questions
          </p>
        </div>

        {!processingStage ? (
          <>
            {/* Section Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label htmlFor="section" className="text-sm font-medium text-gray-900 mb-3 block">
                Select Section *
              </label>
              <select
                id="section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a section...</option>
                <option value="CARD-501">CARD-501 - Advanced Cardiology</option>
                <option value="MED-302">MED-302 - Clinical Medicine</option>
              </select>
            </div>

            {/* File Upload */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="text-sm font-medium text-gray-900 mb-3 block">
                Upload File *
              </label>
              
              {!selectedFile ? (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="size-12 text-gray-400 mb-4" />
                    <p className="mb-2 text-sm text-gray-600">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF or PowerPoint (max 100MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.ppt,.pptx"
                    onChange={handleFileSelect}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="size-10 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedSection}
              className="w-full"
            >
              <Upload className="size-4 mr-2" />
              Upload and Process
            </Button>
          </>
        ) : (
          <>
            {/* Processing Progress */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Processing Lecture</h2>
                <Badge variant="secondary">{uploadProgress.toFixed(0)}%</Badge>
              </div>

              <div className="mb-6">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { stage: "uploading", label: "Uploading to server" },
                  { stage: "parsing", label: "Parsing slides" },
                  { stage: "chunking", label: "Creating content chunks" },
                  { stage: "embeddings", label: "Generating embeddings" },
                  { stage: "extracting", label: "Extracting SubConcepts" },
                  { stage: "done", label: "Complete" },
                ].map((item) => {
                  const status = getStageStatus(item.stage);
                  return (
                    <div key={item.stage} className="flex items-center gap-3">
                      {getStageIcon(item.stage)}
                      <span className={`text-sm ${
                        status === "completed" ? "text-green-600 font-medium" :
                        status === "active" ? "text-blue-600 font-medium" :
                        "text-gray-600"
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {processingStage === "done" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Upload Complete!</p>
                    <p className="text-sm text-green-800">
                      Redirecting to processing results...
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
