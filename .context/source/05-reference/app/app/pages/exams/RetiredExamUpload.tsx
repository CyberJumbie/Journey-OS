import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle2,
  Edit,
  X,
} from "lucide-react";

interface ExtractedItem {
  id: string;
  text: string;
  suggestedTags: { tag: string; confidence: number }[];
  similarItems: { id: string; similarity: number; stem: string }[];
  status: "pending" | "confirmed" | "skipped";
}

export default function RetiredExamUpload() {
  const [uploadStage, setUploadStage] = useState<"upload" | "processing" | "review">("upload");
  const [formData, setFormData] = useState({
    sourceName: "",
    examType: "",
    usageRights: "",
    section: "",
  });

  const [items] = useState<ExtractedItem[]>([
    {
      id: "1",
      text: "A 62-year-old man presents with chest pain...",
      suggestedTags: [
        { tag: "Cardiovascular", confidence: 0.92 },
        { tag: "Diagnosis", confidence: 0.88 },
        { tag: "Medium", confidence: 0.85 },
      ],
      similarItems: [
        { id: "item_123", similarity: 0.78, stem: "A 65-year-old presents with acute chest pain..." },
      ],
      status: "pending",
    },
  ]);

  const handleUpload = () => {
    setUploadStage("processing");
    setTimeout(() => setUploadStage("review"), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Upload Retired Exam</h1>
          <p className="text-gray-600 mt-1">
            Import questions from past exams for similarity detection
          </p>
        </div>

        {uploadStage === "upload" && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-3 block">
                  Upload Document
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Upload className="size-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">PDF or DOCX</span>
                  <input type="file" className="hidden" accept=".pdf,.docx" />
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">Source Name</label>
                <Input
                  value={formData.sourceName}
                  onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                  placeholder="Fall 2025 Midterm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">Exam Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Midterm", "Final", "Quiz"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, examType: type })}
                      className={`p-3 rounded-lg border text-sm ${
                        formData.examType === type
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">Usage Rights</label>
                <div className="space-y-2">
                  {["Reference only", "Can reuse with edits", "Public domain"].map((rights) => (
                    <label key={rights} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="rights"
                        checked={formData.usageRights === rights}
                        onChange={() => setFormData({ ...formData, usageRights: rights })}
                        className="size-4 text-blue-600"
                      />
                      <span className="text-sm">{rights}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleUpload} className="w-full">
              Upload and Process
            </Button>
          </>
        )}

        {uploadStage === "processing" && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="size-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <FileText className="size-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Exam</h2>
            <p className="text-gray-600">Extracting items and generating auto-tags...</p>
          </div>
        )}

        {uploadStage === "review" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                {items.length} items extracted. Review auto-tags and similar items.
              </p>
            </div>

            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-900 mb-4">{item.text}</p>

                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Suggested Tags</div>
                  <div className="flex gap-2">
                    {item.suggestedTags.map((tag) => (
                      <Badge key={tag.tag} variant="secondary">
                        {tag.tag} ({(tag.confidence * 100).toFixed(0)}%)
                      </Badge>
                    ))}
                  </div>
                </div>

                {item.similarItems.length > 0 && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-amber-900 mb-2">Similar Items Found</div>
                    {item.similarItems.map((similar) => (
                      <div key={similar.id} className="text-sm text-amber-800 mb-1">
                        {(similar.similarity * 100).toFixed(0)}% similar: {similar.stem.substring(0, 60)}...
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="size-4 mr-2" />
                    Adjust Tags
                  </Button>
                  <Button variant="outline" size="sm">
                    <X className="size-4 mr-2" />
                    Skip
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="size-4 mr-2" />
                    Confirm
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
