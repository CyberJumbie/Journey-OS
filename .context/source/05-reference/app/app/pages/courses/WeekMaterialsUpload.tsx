import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { 
  Upload, 
  FileText, 
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lightbulb,
  BookOpen,
  Target
} from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  insights?: {
    topics: string[];
    keyPoints: string[];
    complexity: 'Low' | 'Medium' | 'High';
  };
}

export default function WeekMaterialsUpload() {
  const { courseId, weekId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [autoProcess, setAutoProcess] = useState(true);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      status: 'uploading' as const,
    }));

    setFiles([...files, ...uploadedFiles]);

    // Simulate upload and processing
    uploadedFiles.forEach(file => {
      simulateUpload(file);
    });
  };

  const simulateUpload = (file: UploadedFile) => {
    let progress = 0;
    const uploadInterval = setInterval(() => {
      progress += 10;
      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.id === file.id ? { ...f, uploadProgress: progress } : f
        )
      );

      if (progress >= 100) {
        clearInterval(uploadInterval);
        
        // Change to processing
        setFiles(prevFiles =>
          prevFiles.map(f =>
            f.id === file.id ? { ...f, status: 'processing' } : f
          )
        );

        // Simulate AI processing
        if (autoProcess) {
          setTimeout(() => {
            const mockInsights = {
              topics: ['Cardiac Anatomy', 'Blood Flow', 'ECG Interpretation'],
              keyPoints: [
                'Four chambers of the heart',
                'Systemic vs pulmonary circulation',
                'Normal ECG waveforms',
                'Common arrhythmias'
              ],
              complexity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as 'Low' | 'Medium' | 'High',
            };

            setFiles(prevFiles =>
              prevFiles.map(f =>
                f.id === file.id 
                  ? { ...f, status: 'complete', insights: mockInsights } 
                  : f
              )
            );
          }, 2000);
        } else {
          setFiles(prevFiles =>
            prevFiles.map(f =>
              f.id === file.id ? { ...f, status: 'complete' } : f
            )
          );
        }
      }
    }, 200);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-primary-color animate-spin" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-warning-color animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-success-color" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error-color" />;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Low':
        return 'bg-success-color/10 text-success-color';
      case 'Medium':
        return 'bg-warning-color/10 text-warning-color';
      case 'High':
        return 'bg-error-color/10 text-error-color';
      default:
        return 'bg-background-secondary text-text-secondary';
    }
  };

  const allComplete = files.length > 0 && files.every(f => f.status === 'complete');

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/courses">Courses</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/courses/${courseId}`}>Pathology</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/courses/${courseId}/week/${weekId}`}>
                Week {weekId}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Upload Materials</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold mb-2">Upload Week Materials</h1>
          <p className="text-text-secondary">
            Upload lecture slides, notes, and other course materials for Week {weekId}. AI will analyze the content to extract key concepts and generate questions.
          </p>
        </div>

        {/* Auto-process Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-primary-color" />
                <div>
                  <Label htmlFor="auto-process" className="font-medium">
                    Auto-process with AI
                  </Label>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Automatically extract topics and key concepts from uploaded materials
                  </p>
                </div>
              </div>
              <Switch
                id="auto-process"
                checked={autoProcess}
                onCheckedChange={setAutoProcess}
              />
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${isDragging 
              ? 'border-primary-color bg-primary-color/5' 
              : 'border-border-subtle hover:border-primary-color/50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-primary-color/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-primary-color" />
          </div>
          <h3 className="font-medium mb-2">Drop files here or click to browse</h3>
          <p className="text-sm text-text-secondary mb-4">
            Supports PDF, DOCX, PPTX, TXT files up to 50MB each
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.docx,.pptx,.txt"
            onChange={handleFileInput}
          />
          <Button
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            Browse Files
          </Button>
        </div>

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Materials ({files.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="border border-border-subtle rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-color/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary-color" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-text-secondary">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {getStatusIcon(file.status)}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFile(file.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {file.status === 'uploading' && (
                          <div className="space-y-1">
                            <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-color transition-all"
                                style={{ width: `${file.uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-text-secondary">
                              Uploading... {file.uploadProgress}%
                            </p>
                          </div>
                        )}

                        {/* Processing Status */}
                        {file.status === 'processing' && (
                          <div className="flex items-center gap-2 text-warning-color">
                            <p className="text-xs">Processing with AI...</p>
                          </div>
                        )}

                        {/* AI Insights */}
                        {file.status === 'complete' && file.insights && (
                          <div className="mt-3 space-y-3 bg-background-secondary rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Badge className={getComplexityColor(file.insights.complexity)}>
                                {file.insights.complexity} Complexity
                              </Badge>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="w-4 h-4 text-primary-color" />
                                <p className="text-xs font-medium">Topics Identified</p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {file.insights.topics.map((topic, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="w-4 h-4 text-primary-color" />
                                <p className="text-xs font-medium">Key Points</p>
                              </div>
                              <ul className="space-y-1">
                                {file.insights.keyPoints.slice(0, 3).map((point, idx) => (
                                  <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                                    <span className="text-primary-color">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(`/courses/${courseId}/week/${weekId}`)}
          >
            Back
          </Button>
          <Button
            disabled={!allComplete}
            onClick={() => navigate(`/courses/${courseId}/week/${weekId}/generate`)}
          >
            Continue to Generate Questions
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
