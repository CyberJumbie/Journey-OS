import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface IterationHistory {
  id: number;
  instruction: string;
  timestamp: string;
}

export default function ConversationalRefinement() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  
  const [instruction, setInstruction] = useState("");
  const [targetStage, setTargetStage] = useState<"auto" | "core" | "distractors" | "rationale">("auto");
  const [isGenerating, setIsGenerating] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);
  const [iterationHistory, setIterationHistory] = useState<IterationHistory[]>([]);

  const maxIterations = 5;

  // Mock data
  const original = {
    stem: "A 62-year-old man presents to the emergency department with acute chest pain radiating to the left arm. The pain started 2 hours ago while he was mowing the lawn.",
    leadIn: "Which coronary artery is most likely occluded?",
    options: [
      { id: "a", text: "Right coronary artery", isCorrect: true },
      { id: "b", text: "Left anterior descending artery", isCorrect: false },
      { id: "c", text: "Left circumflex artery", isCorrect: false },
      { id: "d", text: "Left main coronary artery", isCorrect: false },
      { id: "e", text: "Posterior descending artery", isCorrect: false },
    ],
    rationale: {
      a: "ST elevation in the inferior leads indicates an inferior wall MI, most commonly caused by RCA occlusion.",
      b: "The LAD supplies the anterior wall. Occlusion would cause ST elevation in precordial leads.",
      c: "While the LCx can cause inferior MI, the RCA is statistically more likely.",
    },
  };

  const [revised, setRevised] = useState(original);

  const handleRefine = async () => {
    if (!instruction.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock revision based on instruction
      if (instruction.toLowerCase().includes("plausible")) {
        setRevised({
          ...revised,
          options: revised.options.map(opt => 
            opt.id === "b" ? { ...opt, text: "Left anterior descending artery (dominant circulation)" } : opt
          ),
        });
      }
      
      setIterationCount(iterationCount + 1);
      setIterationHistory([
        ...iterationHistory,
        {
          id: iterationCount + 1,
          instruction,
          timestamp: new Date().toISOString(),
        },
      ]);
      setInstruction("");
    } catch (error) {
      console.error("Refinement failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    // API call to save revised version
    navigate(`/questions/${questionId}`);
  };

  const handleKeepOriginal = () => {
    navigate(`/questions/${questionId}`);
  };

  const getDiffHighlight = (originalText: string, revisedText: string) => {
    if (originalText === revisedText) return null;
    return "bg-yellow-100";
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/questions/${questionId}`)}
            >
              <ArrowLeft className="size-4 mr-2" />
              Back to Item
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <Badge variant="secondary">Iteration {iterationCount}/{maxIterations}</Badge>
          </div>
        </div>

        {/* Iteration Warning */}
        {iterationCount >= maxIterations - 1 && (
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription>
              {iterationCount === maxIterations 
                ? "Maximum iterations reached. Please accept or keep original."
                : "You have 1 refinement remaining. Use it wisely!"}
            </AlertDescription>
          </Alert>
        )}

        {/* Split View */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Original */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Original</h2>
              <Badge variant="secondary">Reference</Badge>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Clinical Vignette</div>
                <p className="text-sm text-gray-900 leading-relaxed">{original.stem}</p>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Question Prompt</div>
                <p className="text-sm text-gray-900 font-medium">{original.leadIn}</p>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-600 mb-3">Answer Options</div>
                <div className="space-y-2">
                  {original.options.map((option, index) => (
                    <div
                      key={option.id}
                      className={`p-3 rounded-lg border ${
                        option.isCorrect
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`size-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          option.isCorrect
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {getOptionLabel(index)}
                        </span>
                        <p className="text-sm text-gray-900 flex-1">{option.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {original.rationale && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-3">Rationales (sample)</div>
                  <div className="space-y-2">
                    {Object.entries(original.rationale).map(([key, text]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-3">
                        <span className="text-xs font-semibold text-gray-700">Option {key.toUpperCase()}:</span>
                        <p className="text-xs text-gray-900 mt-1">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Revised */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Revised</h2>
              <Badge className="bg-blue-100 text-blue-700">Live Preview</Badge>
            </div>

            <div className="bg-white rounded-lg border-2 border-blue-500 p-6 space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Clinical Vignette</div>
                <p className={`text-sm text-gray-900 leading-relaxed ${getDiffHighlight(original.stem, revised.stem)}`}>
                  {revised.stem}
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Question Prompt</div>
                <p className={`text-sm text-gray-900 font-medium ${getDiffHighlight(original.leadIn, revised.leadIn)}`}>
                  {revised.leadIn}
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-600 mb-3">Answer Options</div>
                <div className="space-y-2">
                  {revised.options.map((option, index) => {
                    const originalOption = original.options[index];
                    const hasChanged = originalOption.text !== option.text;
                    
                    return (
                      <div
                        key={option.id}
                        className={`p-3 rounded-lg border ${
                          option.isCorrect
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200"
                        } ${hasChanged ? "ring-2 ring-blue-400" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`size-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                            option.isCorrect
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {getOptionLabel(index)}
                          </span>
                          <p className={`text-sm text-gray-900 flex-1 ${hasChanged ? "bg-yellow-100 px-1" : ""}`}>
                            {option.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {revised.rationale && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-3">Rationales (sample)</div>
                  <div className="space-y-2">
                    {Object.entries(revised.rationale).map(([key, text]) => {
                      const originalText = original.rationale?.[key as keyof typeof original.rationale];
                      const hasChanged = originalText !== text;
                      
                      return (
                        <div key={key} className={`bg-gray-50 rounded-lg p-3 ${hasChanged ? "ring-2 ring-blue-400" : ""}`}>
                          <span className="text-xs font-semibold text-gray-700">Option {key.toUpperCase()}:</span>
                          <p className={`text-xs text-gray-900 mt-1 ${hasChanged ? "bg-yellow-100 px-1" : ""}`}>
                            {text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Refinement Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">AI Refinement Instructions</h3>
            <Badge variant="secondary">{iterationCount}/{maxIterations} used</Badge>
          </div>

          {/* Target Stage Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Target Stage (Auto-detected)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "auto", label: "Auto-detect" },
                { value: "core", label: "Core (Stem/Lead-in)" },
                { value: "distractors", label: "Distractors" },
                { value: "rationale", label: "Rationales" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTargetStage(option.value as any)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    targetStage === option.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Instruction Input */}
          <div>
            <label htmlFor="instruction" className="text-sm font-medium text-gray-700 mb-2 block">
              Refinement Request
            </label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="E.g., 'Make distractor B more plausible by adding clinical context'"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={iterationCount >= maxIterations || isGenerating}
            />
            <p className="text-xs text-gray-600 mt-2">
              Be specific about what you want to change. The AI will apply your instruction while preserving educational quality.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleKeepOriginal}
                disabled={isGenerating}
              >
                <RotateCcw className="size-4 mr-2" />
                Keep Original
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRefine}
                disabled={!instruction.trim() || iterationCount >= maxIterations || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Refine Again
                  </>
                )}
              </Button>

              <Button
                onClick={handleAccept}
                className="bg-green-600 hover:bg-green-700"
                disabled={iterationCount === 0 || isGenerating}
              >
                <CheckCircle2 className="size-4 mr-2" />
                Accept Revision
              </Button>
            </div>
          </div>
        </div>

        {/* Iteration History */}
        {iterationHistory.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Refinement History</h3>
            <div className="space-y-3">
              {iterationHistory.map((iteration, index) => (
                <div key={iteration.id} className="flex gap-3 pb-3 border-b border-gray-200 last:border-0">
                  <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-blue-600">{iteration.id}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 mb-1">{iteration.instruction}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(iteration.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
