import { useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Save,
  RotateCcw,
  CheckCircle2,
  GripVertical,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";

interface SLO {
  id: string;
  text: string;
  bloomLevel: string;
  confidence: number;
}

interface Session {
  id: string;
  name: string;
  slos: SLO[];
}

interface Week {
  id: string;
  name: string;
  sessions: Session[];
}

export default function SyllabusEditor() {
  const navigate = useNavigate();
  const [hasChanges, setHasChanges] = useState(false);
  const [editingSLO, setEditingSLO] = useState<string | null>(null);

  const [weeks, setWeeks] = useState<Week[]>([
    {
      id: "w1",
      name: "Week 1: Introduction to Cardiology",
      sessions: [
        {
          id: "s1",
          name: "Session 1: Cardiac Anatomy",
          slos: [
            {
              id: "slo1",
              text: "Correlate ECG findings with coronary anatomy",
              bloomLevel: "Apply",
              confidence: 0.92,
            },
            {
              id: "slo2",
              text: "Identify major cardiac structures on imaging",
              bloomLevel: "Understand",
              confidence: 0.88,
            },
          ],
        },
        {
          id: "s2",
          name: "Session 2: Heart Failure",
          slos: [
            {
              id: "slo3",
              text: "Differentiate causes of heart failure",
              bloomLevel: "Analyze",
              confidence: 0.85,
            },
          ],
        },
      ],
    },
  ]);

  const handleSave = () => {
    alert("Syllabus structure saved!");
    setHasChanges(false);
  };

  const handleReset = () => {
    if (confirm("Reset to original structure? All changes will be lost.")) {
      setHasChanges(false);
    }
  };

  const handleConfirm = () => {
    navigate("/dashboard");
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return "bg-green-100 text-green-700";
    if (confidence >= 0.70) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Edit Syllabus Structure</h1>
              <p className="text-gray-600 mt-1">Review AI-parsed structure and make adjustments</p>
            </div>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="size-4 mr-2" />
                Reset
              </Button>
            )}
            <Button variant="outline" onClick={handleSave}>
              <Save className="size-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="size-4 mr-2" />
              Confirm Structure
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Editing Instructions</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Click to edit week/session names or SLO text</li>
                <li>Drag to reorder sessions within weeks</li>
                <li>Merge similar SLOs or split combined ones</li>
                <li>Adjust Bloom levels for each SLO</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Weeks */}
        <div className="space-y-6">
          {weeks.map((week) => (
            <div key={week.id} className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Week Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <Input
                  value={week.name}
                  onChange={(e) => {
                    setWeeks(weeks.map(w =>
                      w.id === week.id ? { ...w, name: e.target.value } : w
                    ));
                    setHasChanges(true);
                  }}
                  className="flex-1 mr-4 font-semibold"
                />
                <Badge variant="secondary">{week.sessions.length} sessions</Badge>
              </div>

              {/* Sessions */}
              <div className="space-y-4">
                {week.sessions.map((session) => (
                  <div key={session.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <GripVertical className="size-5 text-gray-400 cursor-move" />
                      <Input
                        value={session.name}
                        onChange={(e) => {
                          setWeeks(weeks.map(w =>
                            w.id === week.id
                              ? {
                                  ...w,
                                  sessions: w.sessions.map(s =>
                                    s.id === session.id ? { ...s, name: e.target.value } : s
                                  ),
                                }
                              : w
                          ));
                          setHasChanges(true);
                        }}
                        className="flex-1 font-medium"
                      />
                      <Button variant="ghost" size="sm">
                        <Plus className="size-4" />
                      </Button>
                    </div>

                    {/* SLOs */}
                    <div className="space-y-2">
                      {session.slos.map((slo) => (
                        <div key={slo.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="flex-1">
                              {editingSLO === slo.id ? (
                                <Input
                                  value={slo.text}
                                  onChange={(e) => {
                                    setWeeks(weeks.map(w =>
                                      w.id === week.id
                                        ? {
                                            ...w,
                                            sessions: w.sessions.map(s =>
                                              s.id === session.id
                                                ? {
                                                    ...s,
                                                    slos: s.slos.map(sl =>
                                                      sl.id === slo.id ? { ...sl, text: e.target.value } : sl
                                                    ),
                                                  }
                                                : s
                                            ),
                                          }
                                        : w
                                    ));
                                    setHasChanges(true);
                                  }}
                                  onBlur={() => setEditingSLO(null)}
                                  autoFocus
                                />
                              ) : (
                                <p
                                  className="text-sm text-gray-900 cursor-text"
                                  onClick={() => setEditingSLO(slo.id)}
                                >
                                  {slo.text}
                                </p>
                              )}
                            </div>
                            <Badge className={getConfidenceColor(slo.confidence)}>
                              {(slo.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-xs text-gray-600 mr-2">Bloom Level:</label>
                              <select
                                value={slo.bloomLevel}
                                onChange={(e) => {
                                  setWeeks(weeks.map(w =>
                                    w.id === week.id
                                      ? {
                                          ...w,
                                          sessions: w.sessions.map(s =>
                                            s.id === session.id
                                              ? {
                                                  ...s,
                                                  slos: s.slos.map(sl =>
                                                    sl.id === slo.id ? { ...sl, bloomLevel: e.target.value } : sl
                                                  ),
                                                }
                                              : s
                                          ),
                                        }
                                      : w
                                  ));
                                  setHasChanges(true);
                                }}
                                className="text-xs px-2 py-1 border border-gray-300 rounded"
                              >
                                <option>Remember</option>
                                <option>Understand</option>
                                <option>Apply</option>
                                <option>Analyze</option>
                                <option>Evaluate</option>
                                <option>Create</option>
                              </select>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="size-3" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <X className="size-3 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
