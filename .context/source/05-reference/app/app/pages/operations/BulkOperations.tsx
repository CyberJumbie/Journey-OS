import { useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  ArrowLeft
} from "lucide-react";

interface BulkOperation {
  id: string;
  type: "import" | "export" | "delete" | "update";
  status: "processing" | "completed" | "failed";
  fileName?: string;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failedCount: number;
  timestamp: string;
  errors?: string[];
}

const operations: BulkOperation[] = [
  {
    id: "1",
    type: "import",
    status: "completed",
    fileName: "cardiology_questions_feb2026.csv",
    totalItems: 45,
    processedItems: 45,
    successCount: 43,
    failedCount: 2,
    timestamp: "2026-02-16T09:30:00",
    errors: [
      "Row 12: Missing correct answer field",
      "Row 28: Invalid difficulty level"
    ],
  },
  {
    id: "2",
    type: "export",
    status: "completed",
    fileName: "course_1_questions_export.json",
    totalItems: 127,
    processedItems: 127,
    successCount: 127,
    failedCount: 0,
    timestamp: "2026-02-15T14:20:00",
  },
  {
    id: "3",
    type: "update",
    status: "processing",
    totalItems: 34,
    processedItems: 18,
    successCount: 18,
    failedCount: 0,
    timestamp: "2026-02-16T10:45:00",
  },
];

export default function BulkOperations() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="size-5 text-green-600" />;
      case "failed":
        return <AlertCircle className="size-5 text-red-600" />;
      default:
        return <div className="size-5 border-2 border-[#FFC645] border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Bulk Operations</h1>
            <p className="text-sm text-gray-600 mt-1">
              Import, export, or manage multiple questions at once
            </p>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Questions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV or JSON file with multiple questions. Download our template to ensure proper formatting.
          </p>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-[#FFC645] bg-[#FFC645]/5' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="size-12 text-gray-400 mx-auto mb-4" />
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mb-4">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => {/* Process file */}}>
                    Upload and Process
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedFile(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your file here, or click to browse
                </p>
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  Select File
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="size-4" />
              Download CSV Template
            </Button>
            <Button variant="outline" size="sm">
              <Download className="size-4" />
              Download JSON Template
            </Button>
            <Button variant="ghost" size="sm">
              View Import Guidelines
            </Button>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Questions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Export questions from your repository or specific courses
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Export All Questions</h3>
              <p className="text-sm text-gray-600 mb-4">
                Download all questions from your repository
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Export as CSV
                </Button>
                <Button variant="outline" size="sm">
                  Export as JSON
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Export by Course</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a specific course to export questions from
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Select Course
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Export by Status</h3>
              <p className="text-sm text-gray-600 mb-4">
                Export questions filtered by approval status
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Select Status
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Custom Export</h3>
              <p className="text-sm text-gray-600 mb-4">
                Apply custom filters for specific exports
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Configure Export
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Delete Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trash2 className="size-5 text-red-600" />
            Bulk Delete
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex gap-2">
              <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">Warning: This action cannot be undone</p>
                <p className="text-sm text-red-700">
                  Bulk delete operations permanently remove questions from the system. Use with caution.
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
            <Trash2 className="size-4" />
            Configure Bulk Delete
          </Button>
        </div>

        {/* Recent Operations */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Operations</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {operations.map((operation) => (
              <div key={operation.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    {getStatusIcon(operation.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">
                          {getTypeLabel(operation.type)} Operation
                        </h3>
                        {operation.fileName && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <FileText className="size-4" />
                            {operation.fileName}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(operation.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {operation.status === "processing" ? (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Processing...</span>
                          <span className="font-medium text-gray-900">
                            {operation.processedItems} / {operation.totalItems}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#FFC645] transition-all duration-300"
                            style={{ width: `${(operation.processedItems / operation.totalItems) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-6 text-sm mb-2">
                        <span className="text-gray-600">
                          Total: <span className="font-medium text-gray-900">{operation.totalItems}</span>
                        </span>
                        <span className="text-green-600">
                          Success: <span className="font-medium">{operation.successCount}</span>
                        </span>
                        {operation.failedCount > 0 && (
                          <span className="text-red-600">
                            Failed: <span className="font-medium">{operation.failedCount}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Errors */}
                    {operation.errors && operation.errors.length > 0 && (
                      <details className="text-sm">
                        <summary className="text-red-600 cursor-pointer hover:text-red-700 font-medium">
                          View {operation.errors.length} error{operation.errors.length !== 1 ? 's' : ''}
                        </summary>
                        <div className="mt-2 space-y-1 text-red-700 bg-red-50 rounded p-2">
                          {operation.errors.map((error, index) => (
                            <p key={index}>• {error}</p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}