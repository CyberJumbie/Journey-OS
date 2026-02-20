import { useParams, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Clock, User, AlertCircle } from "lucide-react";

interface QuestionVersion {
  id: string;
  version: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  modifiedBy: string;
  modifiedAt: string;
  changeNote: string;
  status: "draft" | "review" | "approved" | "archived";
}

const versions: QuestionVersion[] = [
  {
    id: "v4",
    version: 4,
    question: "A 65-year-old patient presents with acute chest pain radiating to the left arm. ECG shows ST-segment elevation in leads II, III, and aVF. What is the most likely diagnosis?",
    options: [
      "Anterior myocardial infarction",
      "Inferior myocardial infarction",
      "Lateral myocardial infarction",
      "Posterior myocardial infarction",
    ],
    correctAnswer: 1,
    explanation: "ST-segment elevation in leads II, III, and aVF indicates an inferior myocardial infarction, typically caused by occlusion of the right coronary artery.",
    modifiedBy: "Dr. Sarah Johnson",
    modifiedAt: "2026-02-16T10:30:00",
    changeNote: "Clarified explanation and added more specific diagnostic criteria",
    status: "approved",
  },
  {
    id: "v3",
    version: 3,
    question: "A 65-year-old patient presents with acute chest pain radiating to the left arm. ECG shows ST-segment elevation in leads II, III, and aVF. What is the most likely diagnosis?",
    options: [
      "Anterior myocardial infarction",
      "Inferior myocardial infarction",
      "Lateral myocardial infarction",
      "Posterior myocardial infarction",
    ],
    correctAnswer: 1,
    explanation: "ST-elevation in leads II, III, and aVF indicates inferior MI.",
    modifiedBy: "Dr. Michael Chen",
    modifiedAt: "2026-02-15T14:20:00",
    changeNote: "Simplified explanation for better clarity",
    status: "archived",
  },
  {
    id: "v2",
    version: 2,
    question: "A 65-year-old male patient presents with chest pain radiating to the left arm. ECG shows ST-segment elevation in leads II, III, and aVF. What is the diagnosis?",
    options: [
      "Anterior MI",
      "Inferior MI",
      "Lateral MI",
      "Posterior MI",
    ],
    correctAnswer: 1,
    explanation: "The ECG pattern shows inferior myocardial infarction based on the leads affected.",
    modifiedBy: "Dr. Sarah Johnson",
    modifiedAt: "2026-02-10T09:15:00",
    changeNote: "Expanded answer options with full medical terminology",
    status: "archived",
  },
  {
    id: "v1",
    version: 1,
    question: "Patient with chest pain. ECG shows ST elevation in II, III, aVF. Diagnosis?",
    options: [
      "Anterior MI",
      "Inferior MI",
      "Lateral MI",
      "Posterior MI",
    ],
    correctAnswer: 1,
    explanation: "Inferior MI based on ECG leads.",
    modifiedBy: "AI Generator",
    modifiedAt: "2026-02-08T16:45:00",
    changeNote: "Initial AI-generated version",
    status: "archived",
  },
];

export default function QuestionHistory() {
  const { questionId } = useParams();
  const navigate = useNavigate();

  const currentVersion = versions[0];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "review":
        return "bg-yellow-100 text-yellow-700";
      case "draft":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/questions/${questionId}`)}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Question History</h1>
            <p className="text-sm text-gray-600 mt-1">
              View all versions and changes for Question #{questionId}
            </p>
          </div>
        </div>

        {/* Current Version Highlight */}
        <div className="bg-gradient-to-br from-[#FFC645]/10 to-[#FFB020]/5 rounded-lg border-2 border-[#FFC645]/30 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Current Version (v{currentVersion.version})
                </h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentVersion.status)}`}>
                  {currentVersion.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <User className="size-4" />
                  {currentVersion.modifiedBy}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  {new Date(currentVersion.modifiedAt).toLocaleString()}
                </span>
              </div>
            </div>
            <Button onClick={() => navigate(`/questions/${questionId}`)}>
              View Full Question
            </Button>
          </div>

          <div className="bg-white rounded-lg p-4 mb-3">
            <h3 className="font-medium text-gray-900 mb-3">{currentVersion.question}</h3>
            <div className="space-y-2">
              {currentVersion.options.map((option, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    index === currentVersion.correctAnswer
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {String.fromCharCode(65 + index)}. {option}
                  {index === currentVersion.correctAnswer && (
                    <span className="ml-2 text-xs text-green-700 font-medium">✓ Correct</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {currentVersion.changeNote && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Change Note</p>
                <p className="text-sm text-blue-700">{currentVersion.changeNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* Version History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
          <div className="space-y-4">
            {versions.slice(1).map((version, index) => (
              <div key={version.id} className="relative">
                {index < versions.length - 2 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-semibold text-gray-700">
                      v{version.version}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">Version {version.version}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(version.status)}`}>
                              {version.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <User className="size-4" />
                              {version.modifiedBy}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-4" />
                              {new Date(version.modifiedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {/* View this version in detail */}}
                        >
                          View Details
                        </Button>
                      </div>

                      {version.changeNote && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-sm text-gray-700">{version.changeNote}</p>
                        </div>
                      )}

                      <details className="group">
                        <summary className="text-sm text-[#FFC645] hover:text-[#FFB020] cursor-pointer font-medium">
                          Show full question content
                        </summary>
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-900 mb-3">{version.question}</p>
                          <div className="space-y-2">
                            {version.options.map((option, optIndex) => (
                              <div 
                                key={optIndex}
                                className={`p-2 rounded text-sm ${
                                  optIndex === version.correctAnswer
                                    ? 'bg-green-100 text-green-900'
                                    : 'bg-white text-gray-700'
                                }`}
                              >
                                {String.fromCharCode(65 + optIndex)}. {option}
                                {optIndex === version.correctAnswer && (
                                  <span className="ml-2 text-xs text-green-700 font-medium">✓</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Explanation:</p>
                            <p className="text-sm text-gray-700">{version.explanation}</p>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="flex gap-2">
            <Button variant="outline">Restore Previous Version</Button>
            <Button variant="outline">Compare Versions</Button>
            <Button variant="outline">Export History</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}