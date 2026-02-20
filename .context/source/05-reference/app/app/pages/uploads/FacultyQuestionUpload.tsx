import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
} from "lucide-react";

export default function FacultyQuestionUpload() {
  const [jobType, setJobType] = useState<"validate" | "convert" | "import">("validate");
  const [uploadStage, setUploadStage] = useState<"upload" | "processing" | "results">("upload");

  const qualityReport = {
    passed: 5,
    warnings: 3,
    failed: 2,
    checks: [
      { name: "Stem length", status: "pass", message: "80-200 words" },
      { name: "Option count", status: "pass", message: "5 options per item" },
      { name: "Homogeneity", status: "warn", message: "3 items have uneven option lengths" },
      { name: "Bloom alignment", status: "warn", message: "2 items lack higher-order thinking" },
      { name: "Plausibility", status: "fail", message: "2 items have obvious distractors" },
    ],
  };

  const handleUpload = () => {
    setUploadStage("processing");
    setTimeout(() => setUploadStage("results"), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="size-5 text-green-600" />;
      case "warn": return <AlertTriangle className="size-5 text-amber-600" />;
      case "fail": return <XCircle className="size-5 text-red-600" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Upload Faculty Questions</h1>
          <p className="text-gray-600 mt-1">
            Import, validate, and convert existing questions
          </p>
        </div>

        {uploadStage === "upload" && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="text-sm font-medium text-gray-900 mb-3 block">
                Upload Questions
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Upload className="size-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">CSV, JSON, or DOCX</span>
                <input type="file" className="hidden" accept=".csv,.json,.docx" />
              </label>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="text-sm font-medium text-gray-900 mb-3 block">Job Type</label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    checked={jobType === "validate"}
                    onChange={() => setJobType("validate")}
                    className="size-4 text-blue-600 mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Validate Only</div>
                    <div className="text-sm text-gray-600">
                      Check quality without importing
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    checked={jobType === "convert"}
                    onChange={() => setJobType("convert")}
                    className="size-4 text-blue-600 mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Convert to NBME Style</div>
                    <div className="text-sm text-gray-600">
                      AI-assisted conversion with faculty review
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    checked={jobType === "import"}
                    onChange={() => setJobType("import")}
                    className="size-4 text-blue-600 mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Import As-Is</div>
                    <div className="text-sm text-gray-600">
                      Import directly with auto-tagging
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <Button onClick={handleUpload} className="w-full">
              <Upload className="size-4 mr-2" />
              Upload and Process
            </Button>
          </>
        )}

        {uploadStage === "processing" && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="size-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <CheckCircle2 className="size-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Questions</h2>
            <p className="text-gray-600">Running quality checks...</p>
          </div>
        )}

        {uploadStage === "results" && jobType === "validate" && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {qualityReport.passed}
                </div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="text-3xl font-bold text-amber-600 mb-1">
                  {qualityReport.warnings}
                </div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {qualityReport.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>

            {/* Quality Checks */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Quality Report</h2>
              <div className="space-y-3">
                {qualityReport.checks.map((check, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{check.name}</div>
                      <div className="text-sm text-gray-600">{check.message}</div>
                    </div>
                    <Badge className={
                      check.status === "pass" ? "bg-green-100 text-green-700" :
                      check.status === "warn" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }>
                      {check.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                Download Report
              </Button>
              <Button className="flex-1">
                Continue to Import
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {uploadStage === "results" && jobType === "convert" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">Conversion Complete</h2>
            <p className="text-blue-800 mb-4">
              Review side-by-side comparisons for each converted question
            </p>
            <Button>Review Conversions</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
