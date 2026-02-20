import { useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Edit,
  ChevronDown,
  Filter,
  Target,
  Brain,
} from "lucide-react";

interface SubConcept {
  id: string;
  name: string;
  description: string;
  confidence: number;
  sourceChunk: string;
  usmleSyst: string;
  levelOfDetail: string;
  lecture: string;
}

export default function SubConceptReviewQueue() {
  const navigate = useNavigate();
  const [batchThreshold, setBatchThreshold] = useState(0.85);
  const [sortBy, setSortBy] = useState<"confidence" | "system" | "lecture">("confidence");
  const [filterSystem, setFilterSystem] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const [subConcepts, setSubConcepts] = useState<SubConcept[]>([
    {
      id: "1",
      name: "STEMI Diagnosis by ECG Leads",
      description: "Correlation between ST-elevation patterns in specific ECG leads and coronary artery territories",
      confidence: 0.92,
      sourceChunk: "ST elevation in leads II, III, and aVF indicates inferior wall MI, typically RCA occlusion...",
      usmleSyst: "Cardiovascular",
      levelOfDetail: "Procedural",
      lecture: "Cardiology Lecture 5: Acute MI",
    },
    {
      id: "2",
      name: "Heart Failure Compensatory Mechanisms",
      description: "Neurohormonal adaptations in chronic heart failure including RAAS activation",
      confidence: 0.88,
      sourceChunk: "The failing heart activates compensatory mechanisms including increased sympathetic tone...",
      usmleSyst: "Cardiovascular",
      levelOfDetail: "Conceptual",
      lecture: "Cardiology Lecture 3: Heart Failure",
    },
    {
      id: "3",
      name: "Atrial Fibrillation Stroke Risk",
      description: "CHA2DS2-VASc scoring system for anticoagulation decisions in atrial fibrillation",
      confidence: 0.75,
      sourceChunk: "Risk stratification using CHA2DS2-VASc: 1 point for age 65-74, CHF, HTN, DM...",
      usmleSyst: "Cardiovascular",
      levelOfDetail: "Procedural",
      lecture: "Cardiology Lecture 7: Arrhythmias",
    },
  ]);

  const [reviewedCount, setReviewedCount] = useState(0);

  const filteredSubConcepts = subConcepts.filter(sc => {
    if (filterSystem !== "All" && sc.usmleSyst !== filterSystem) return false;
    return true;
  });

  const sortedSubConcepts = [...filteredSubConcepts].sort((a, b) => {
    switch (sortBy) {
      case "confidence":
        return b.confidence - a.confidence;
      case "system":
        return a.usmleSyst.localeCompare(b.usmleSyst);
      case "lecture":
        return a.lecture.localeCompare(b.lecture);
      default:
        return 0;
    }
  });

  const handleApprove = (id: string) => {
    setSubConcepts(subConcepts.filter(sc => sc.id !== id));
    setReviewedCount(reviewedCount + 1);
  };

  const handleReject = (id: string) => {
    setSubConcepts(subConcepts.filter(sc => sc.id !== id));
    setReviewedCount(reviewedCount + 1);
  };

  const handleEdit = (id: string) => {
    // Open edit modal
    alert(`Edit SubConcept ${id}`);
  };

  const handleBatchApprove = () => {
    const aboveThreshold = subConcepts.filter(sc => sc.confidence >= batchThreshold);
    setSubConcepts(subConcepts.filter(sc => sc.confidence < batchThreshold));
    setReviewedCount(reviewedCount + aboveThreshold.length);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return "text-green-600 bg-green-100";
    if (confidence >= 0.70) return "text-amber-600 bg-amber-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">SubConcept Review Queue</h1>
            <p className="text-gray-600 mt-1">
              {reviewedCount} of {reviewedCount + subConcepts.length} reviewed
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="size-4 mr-2" />
              Filters
              <ChevronDown className={`size-4 ml-1 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="confidence">Confidence</option>
                  <option value="system">USMLE System</option>
                  <option value="lecture">Lecture</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">USMLE System</label>
                <select
                  value={filterSystem}
                  onChange={(e) => setFilterSystem(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Systems</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Respiratory">Respiratory</option>
                  <option value="Nervous">Nervous</option>
                </select>
              </div>

              <div>
                <label htmlFor="threshold" className="text-sm font-medium text-gray-700 mb-2 block">
                  Batch Approval Threshold
                </label>
                <Input
                  id="threshold"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={batchThreshold}
                  onChange={(e) => setBatchThreshold(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Batch Actions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Batch Approval</h3>
              <p className="text-sm text-blue-800">
                {subConcepts.filter(sc => sc.confidence >= batchThreshold).length} SubConcepts with confidence ≥ {(batchThreshold * 100).toFixed(0)}%
              </p>
            </div>
            <Button
              onClick={handleBatchApprove}
              disabled={subConcepts.filter(sc => sc.confidence >= batchThreshold).length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="size-4 mr-2" />
              Approve All Above Threshold
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Review Progress</span>
            <span className="text-sm font-semibold text-gray-900">
              {Math.round((reviewedCount / (reviewedCount + subConcepts.length)) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(reviewedCount / (reviewedCount + subConcepts.length)) * 100}%` }}
            />
          </div>
        </div>

        {/* SubConcept Cards */}
        {sortedSubConcepts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle2 className="size-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">All Done!</h2>
            <p className="text-gray-600">You've reviewed all SubConcepts.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedSubConcepts.map((subConcept) => (
              <div key={subConcept.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Target className="size-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{subConcept.name}</h3>
                        <p className="text-sm text-gray-600">{subConcept.lecture}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full font-semibold text-sm ${getConfidenceColor(subConcept.confidence)}`}>
                    {(subConcept.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <p className="text-gray-900 mb-4">{subConcept.description}</p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                  <div className="text-xs font-medium text-gray-600 mb-1">Source Chunk</div>
                  <p className="text-sm text-gray-900 line-clamp-2">{subConcept.sourceChunk}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge className="bg-blue-100 text-blue-700">{subConcept.usmleSyst}</Badge>
                    <Badge variant="secondary">{subConcept.levelOfDetail}</Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(subConcept.id)}
                    >
                      <Edit className="size-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleReject(subConcept.id)}
                    >
                      <XCircle className="size-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(subConcept.id)}
                    >
                      <CheckCircle2 className="size-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
