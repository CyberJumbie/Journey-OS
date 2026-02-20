import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Textarea } from "../../components/ui/textarea";
import { Upload, FileText, X } from "lucide-react";

export default function UploadSyllabus() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = () => {
    navigate(`/courses/${courseId}/processing`);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Step 2 of 3</span>
            <span className="font-medium">66%</span>
          </div>
          <Progress value={66} className="h-2" />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">Upload Course Syllabus</h1>
          <p className="text-muted-foreground">
            Upload your syllabus and we'll automatically extract the weekly structure
          </p>
        </div>

        {/* File Upload Zone */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div
              className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-accent"
                  : file
                  ? "border-success bg-success/5"
                  : "border-muted-foreground/25 hover:border-primary hover:bg-accent/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                    <FileText className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="absolute right-4 top-4"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="mb-1 text-lg font-medium">
                      Drag and drop your syllabus here
                    </p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    Choose File
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX, TXT (max 10MB)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alternative: Paste Text */}
        <Card>
          <CardContent className="p-6">
            <h4 className="mb-4 font-semibold">Or paste syllabus text</h4>
            <Textarea
              placeholder="Paste your syllabus content here..."
              rows={8}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            Back
          </Button>
          <Button
            onClick={handleProcess}
            disabled={!file && !textInput}
            className="bg-primary hover:bg-primary/90"
          >
            Process Syllabus
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
