import { useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  DollarSign,
  Clock,
} from "lucide-react";

interface GapAnalysis {
  coverageGaps: string[];
  usmleImbalance: { system: string; current: number; target: number }[];
  difficultyGaps: { level: string; current: number; target: number }[];
  recommendedTargets: string[];
}

export default function GenerationSpecificationWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [useRecommended, setUseRecommended] = useState(false);

  // Step 1: Gap Analysis
  const [gapAnalysis] = useState<GapAnalysis>({
    coverageGaps: [
      "Heart Failure Management (0 items)",
      "Arrhythmia Diagnosis (2 items - need 8 more)",
      "Acute Coronary Syndrome (4 items - need 6 more)",
    ],
    usmleImbalance: [
      { system: "Cardiovascular", current: 35, target: 50 },
      { system: "Respiratory", current: 10, target: 20 },
      { system: "Renal", current: 5, target: 15 },
    ],
    difficultyGaps: [
      { level: "Easy", current: 15, target: 20 },
      { level: "Medium", current: 25, target: 60 },
      { level: "Hard", current: 10, target: 20 },
    ],
    recommendedTargets: [
      "Heart Failure: Diagnosis and Management",
      "Atrial Fibrillation: Treatment Options",
      "STEMI: Immediate Management",
    ],
  });

  // Step 2: Parameters
  const [parameters, setParameters] = useState({
    selectedSubConcepts: [] as string[],
    format: "Single Best Answer",
    bloomLevels: ["Apply", "Analyze"],
    difficulties: ["Medium", "Hard"],
    sourceScope: "course",
    itemCount: 10,
  });

  // Step 3: Confirmation
  const [estimatedCost, setEstimatedCost] = useState(4.5);
  const [estimatedDuration, setEstimatedDuration] = useState(8);
  const [modelRouting] = useState({
    core: "Claude Sonnet 3.5",
    rationales: "Claude Haiku 3.5",
    quality: "GPT-4o mini",
  });

  const handleUseRecommended = () => {
    setUseRecommended(true);
    setParameters({
      ...parameters,
      selectedSubConcepts: gapAnalysis.recommendedTargets,
      itemCount: 15,
    });
    setCurrentStep(3);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // API call to create generation job
    navigate("/generation/progress");
  };

  const toggleSubConcept = (concept: string) => {
    if (parameters.selectedSubConcepts.includes(concept)) {
      setParameters({
        ...parameters,
        selectedSubConcepts: parameters.selectedSubConcepts.filter(c => c !== concept),
      });
    } else {
      setParameters({
        ...parameters,
        selectedSubConcepts: [...parameters.selectedSubConcepts, concept],
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="size-4 mr-2" />
              Cancel
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Generate Assessment Items
            </h1>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            {[
              { number: 1, label: "Gap Analysis" },
              { number: 2, label: "Parameters" },
              { number: 3, label: "Confirmation" },
            ].map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep === step.number
                        ? "bg-blue-600 text-white"
                        : currentStep > step.number
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="size-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Step {step.number}</div>
                    <div className="font-medium text-gray-900">{step.label}</div>
                  </div>
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      currentStep > step.number ? "bg-green-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Coverage Gaps */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Coverage Gaps</h2>
                <Badge className="bg-amber-100 text-amber-700">
                  {gapAnalysis.coverageGaps.length} gaps identified
                </Badge>
              </div>
              <div className="space-y-2">
                {gapAnalysis.coverageGaps.map((gap, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">{gap}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* USMLE Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">USMLE System Distribution</h2>
              <div className="space-y-4">
                {gapAnalysis.usmleImbalance.map((item) => (
                  <div key={item.system}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{item.system}</span>
                      <span className="text-sm text-gray-600">
                        {item.current}% → {item.target}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${(item.current / item.target) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Difficulty Distribution</h2>
              <div className="grid grid-cols-3 gap-4">
                {gapAnalysis.difficultyGaps.map((item) => (
                  <div key={item.level} className="text-center">
                    <div className="size-20 mx-auto mb-3 rounded-full border-4 border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{item.current}</div>
                        <div className="text-xs text-gray-600">of {item.target}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{item.level}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Targets */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="size-5 text-blue-600" />
                <h2 className="font-semibold text-blue-900">AI Recommended Targets</h2>
              </div>
              <div className="space-y-2 mb-4">
                {gapAnalysis.recommendedTargets.map((target, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-blue-900">
                    <Check className="size-4 flex-shrink-0 mt-0.5" />
                    <span>{target}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleUseRecommended}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="size-4 mr-2" />
                Use Recommended Defaults
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            {/* SubConcept Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Select SubConcepts ({parameters.selectedSubConcepts.length} selected)
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {gapAnalysis.recommendedTargets.map((concept) => (
                  <label
                    key={concept}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={parameters.selectedSubConcepts.includes(concept)}
                      onChange={() => toggleSubConcept(concept)}
                      className="size-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{concept}</div>
                      <div className="text-xs text-gray-600 mt-1">0 existing items</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Format & Bloom Levels */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <label className="font-semibold text-gray-900 mb-4 block">Item Format</label>
                <select
                  value={parameters.format}
                  onChange={(e) => setParameters({ ...parameters, format: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Single Best Answer</option>
                  <option>Multiple True/False</option>
                  <option>Extended Matching</option>
                </select>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <label className="font-semibold text-gray-900 mb-4 block">
                  Bloom Levels ({parameters.bloomLevels.length} selected)
                </label>
                <div className="space-y-2">
                  {["Apply", "Analyze", "Evaluate"].map((level) => (
                    <label key={level} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={parameters.bloomLevels.includes(level)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setParameters({
                              ...parameters,
                              bloomLevels: [...parameters.bloomLevels, level],
                            });
                          } else {
                            setParameters({
                              ...parameters,
                              bloomLevels: parameters.bloomLevels.filter(l => l !== level),
                            });
                          }
                        }}
                        className="size-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Difficulty & Item Count */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <label className="font-semibold text-gray-900 mb-4 block">
                  Difficulty Levels ({parameters.difficulties.length} selected)
                </label>
                <div className="space-y-2">
                  {["Easy", "Medium", "Hard"].map((level) => (
                    <label key={level} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={parameters.difficulties.includes(level)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setParameters({
                              ...parameters,
                              difficulties: [...parameters.difficulties, level],
                            });
                          } else {
                            setParameters({
                              ...parameters,
                              difficulties: parameters.difficulties.filter(d => d !== level),
                            });
                          }
                        }}
                        className="size-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <label htmlFor="itemCount" className="font-semibold text-gray-900 mb-4 block">
                  Number of Items
                </label>
                <Input
                  id="itemCount"
                  type="number"
                  min={1}
                  max={50}
                  value={parameters.itemCount}
                  onChange={(e) => setParameters({ ...parameters, itemCount: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-600 mt-2">Maximum 50 items per batch</p>
              </div>
            </div>

            {/* Source Scope */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="font-semibold text-gray-900 mb-4 block">Source Scope</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "course", label: "Current Course Only" },
                  { value: "section", label: "Current Section" },
                  { value: "all", label: "All Available Content" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setParameters({ ...parameters, sourceScope: option.value })}
                    className={`p-4 rounded-lg border text-sm font-medium transition-all ${
                      parameters.sourceScope === option.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Generation Summary</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Selected SubConcepts</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {parameters.selectedSubConcepts.length}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Items</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {parameters.itemCount}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <DollarSign className="size-4" />
                    <span>Estimated Cost</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${estimatedCost.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Clock className="size-4" />
                    <span>Estimated Duration</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {estimatedDuration} min
                  </div>
                </div>
              </div>
            </div>

            {/* Model Routing */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Model Routing</h2>
              <div className="space-y-3">
                {Object.entries(modelRouting).map(([stage, model]) => (
                  <div key={stage} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                    <span className="text-sm text-gray-600 capitalize">{stage}</span>
                    <Badge variant="secondary">{model}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Parameters */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Generation Parameters</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Format</span>
                  <Badge variant="secondary">{parameters.format}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bloom Levels</span>
                  <div className="flex gap-1">
                    {parameters.bloomLevels.map((level) => (
                      <Badge key={level} variant="secondary">{level}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Difficulties</span>
                  <div className="flex gap-1">
                    {parameters.difficulties.map((level) => (
                      <Badge key={level} variant="secondary">{level}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Source Scope</span>
                  <Badge variant="secondary">{parameters.sourceScope}</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="size-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              <TrendingUp className="size-4 mr-2" />
              Start Generation
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
