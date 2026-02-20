import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Link2,
  Check,
  ArrowRight,
} from "lucide-react";

interface SLO {
  id: string;
  text: string;
  week: string;
  session: string;
  isMapped: boolean;
  linkedILO?: string;
}

interface ILO {
  id: string;
  code: string;
  description: string;
  linkedSLOs: number;
}

export default function OutcomeMapping() {
  const [slos] = useState<SLO[]>([
    { id: "s1", text: "Correlate ECG findings with coronary anatomy", week: "Week 1", session: "Session 1", isMapped: false },
    { id: "s2", text: "Differentiate causes of heart failure", week: "Week 1", session: "Session 2", isMapped: true, linkedILO: "ILO-1" },
    { id: "s3", text: "Select appropriate anticoagulation for atrial fibrillation", week: "Week 2", session: "Session 1", isMapped: false },
  ]);

  const [ilos] = useState<ILO[]>([
    { id: "i1", code: "ILO-1", description: "Diagnose and manage cardiovascular emergencies", linkedSLOs: 1 },
    { id: "i2", code: "ILO-2", description: "Apply evidence-based medicine to cardiology", linkedSLOs: 0 },
    { id: "i3", code: "ILO-3", description: "Interpret cardiac diagnostic tests", linkedSLOs: 0 },
  ]);

  const [selectedSLO, setSelectedSLO] = useState<string | null>(null);
  const [selectedILO, setSelectedILO] = useState<string | null>(null);

  const unmappedCount = slos.filter(s => !s.isMapped).length;

  const handleCreateMapping = () => {
    if (selectedSLO && selectedILO) {
      alert(`Mapping SLO ${selectedSLO} to ILO ${selectedILO}`);
      setSelectedSLO(null);
      setSelectedILO(null);
    }
  };

  const groupedSLOs = slos.reduce((acc, slo) => {
    const key = `${slo.week} - ${slo.session}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slo);
    return acc;
  }, {} as Record<string, SLO[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Outcome Mapping</h1>
          <p className="text-gray-600 mt-1">
            Map Session Learning Outcomes (SLOs) to Intended Learning Outcomes (ILOs)
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Mapping Progress</span>
            <Badge className="bg-amber-100 text-amber-700">
              {unmappedCount} SLOs not yet mapped
            </Badge>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${((slos.length - unmappedCount) / slos.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Two-Panel View */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* SLOs Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Session Learning Outcomes (SLOs)</h2>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {Object.entries(groupedSLOs).map(([group, groupSLOs]) => (
                <div key={group}>
                  <div className="text-xs font-medium text-gray-600 mb-2">{group}</div>
                  <div className="space-y-2">
                    {groupSLOs.map((slo) => (
                      <button
                        key={slo.id}
                        onClick={() => setSelectedSLO(slo.id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          selectedSLO === slo.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-gray-900 flex-1">{slo.text}</p>
                          {slo.isMapped && (
                            <div className="flex items-center gap-1 text-xs text-green-600 ml-2">
                              <Check className="size-3" />
                              <Badge variant="secondary" className="text-xs">
                                {slo.linkedILO}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ILOs Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Intended Learning Outcomes (ILOs)</h2>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {ilos.map((ilo) => (
                <button
                  key={ilo.id}
                  onClick={() => setSelectedILO(ilo.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedILO === ilo.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{ilo.code}</Badge>
                    {ilo.linkedSLOs > 0 && (
                      <Badge className="bg-green-100 text-green-700">
                        {ilo.linkedSLOs} SLO{ilo.linkedSLOs !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-900">{ilo.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mapping Action */}
        {selectedSLO && selectedILO && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link2 className="size-6 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">Create Mapping</p>
                  <p className="text-sm text-blue-800">
                    Link selected SLO to selected ILO
                  </p>
                </div>
              </div>
              <Button onClick={handleCreateMapping} className="bg-blue-600 hover:bg-blue-700">
                Create Mapping
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
