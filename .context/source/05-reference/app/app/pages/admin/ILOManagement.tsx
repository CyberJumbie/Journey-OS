import { useState } from "react";
import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Upload,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link2,
} from "lucide-react";

interface ILO {
  id: string;
  courseCode: string;
  iloCode: string;
  description: string;
  mappings: {
    acgme: number;
    epa: number;
    lcme: number;
  };
}

export default function ILOManagement() {
  const [showUpload, setShowUpload] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set(["CARD-501"]));
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedILO, setSelectedILO] = useState<string | null>(null);

  const [ilos] = useState<ILO[]>([
    {
      id: "1",
      courseCode: "CARD-501",
      iloCode: "ILO-1",
      description: "Diagnose and manage cardiovascular emergencies using evidence-based protocols",
      mappings: { acgme: 3, epa: 1, lcme: 2 },
    },
    {
      id: "2",
      courseCode: "CARD-501",
      iloCode: "ILO-2",
      description: "Interpret cardiac diagnostic tests including ECG, echocardiography, and cardiac catheterization",
      mappings: { acgme: 2, epa: 0, lcme: 1 },
    },
    {
      id: "3",
      courseCode: "MED-302",
      iloCode: "ILO-1",
      description: "Perform comprehensive patient assessment and develop differential diagnoses",
      mappings: { acgme: 4, epa: 2, lcme: 3 },
    },
  ]);

  const groupedILOs = ilos.reduce((acc, ilo) => {
    if (!acc[ilo.courseCode]) acc[ilo.courseCode] = [];
    acc[ilo.courseCode].push(ilo);
    return acc;
  }, {} as Record<string, ILO[]>);

  const toggleCourse = (courseCode: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseCode)) {
      newExpanded.delete(courseCode);
    } else {
      newExpanded.add(courseCode);
    }
    setExpandedCourses(newExpanded);
  };

  const handleOpenMapping = (iloId: string) => {
    setSelectedILO(iloId);
    setShowMappingModal(true);
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">ILO Management</h1>
            <p className="text-gray-600 mt-1">
              Manage Intended Learning Outcomes and map to frameworks
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUpload(true)}>
              <Upload className="size-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => setShowManualEntry(true)}>
              <Plus className="size-4 mr-2" />
              Add ILO
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
            <div className="text-sm text-gray-600 mb-1">Total ILOs</div>
            <div className="text-3xl font-bold text-gray-900">{ilos.length}</div>
          </div>
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
            <div className="text-sm text-gray-600 mb-1">ACGME Mapped</div>
            <div className="text-3xl font-bold text-blue-600">
              {ilos.filter(i => i.mappings.acgme > 0).length}
            </div>
          </div>
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
            <div className="text-sm text-gray-600 mb-1">EPA Mapped</div>
            <div className="text-3xl font-bold text-purple-600">
              {ilos.filter(i => i.mappings.epa > 0).length}
            </div>
          </div>
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
            <div className="text-sm text-gray-600 mb-1">LCME Mapped</div>
            <div className="text-3xl font-bold text-green-600">
              {ilos.filter(i => i.mappings.lcme > 0).length}
            </div>
          </div>
        </div>

        {/* ILO Table */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light]">
          <div className="p-6 border-b border-[--border-light]">
            <h2 className="font-semibold text-gray-900">ILOs by Course</h2>
          </div>
          <div>
            {Object.entries(groupedILOs).map(([courseCode, courseILOs]) => (
              <div key={courseCode} className="border-b border-gray-200 last:border-0">
                <button
                  onClick={() => toggleCourse(courseCode)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[--parchment] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedCourses.has(courseCode) ? (
                      <ChevronDown className="size-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="size-5 text-gray-600" />
                    )}
                    <div className="text-left">
                      <div className="font-mono text-sm font-semibold text-blue-600">
                        {courseCode}
                      </div>
                      <div className="text-sm text-gray-600">
                        {courseILOs.length} ILO{courseILOs.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{courseILOs.length} total</Badge>
                  </div>
                </button>

                {expandedCourses.has(courseCode) && (
                  <div className="px-6 pb-6 space-y-3">
                    {courseILOs.map((ilo) => (
                      <div key={ilo.id} className="bg-[--parchment] rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{ilo.iloCode}</Badge>
                              <div className="flex gap-1">
                                {ilo.mappings.acgme > 0 && (
                                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                                    {ilo.mappings.acgme} ACGME
                                  </Badge>
                                )}
                                {ilo.mappings.epa > 0 && (
                                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                                    {ilo.mappings.epa} EPA
                                  </Badge>
                                )}
                                {ilo.mappings.lcme > 0 && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    {ilo.mappings.lcme} LCME
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-900">{ilo.description}</p>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenMapping(ilo.id)}
                            >
                              <Link2 className="size-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="size-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="size-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CSV Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Import ILOs from CSV</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file with columns: course_code, ilo_code, description
              </p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Upload className="size-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload CSV</span>
                <input type="file" className="hidden" accept=".csv" />
              </label>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowUpload(false)}>
                  Cancel
                </Button>
                <Button className="flex-1">Upload</Button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Modal */}
        {showManualEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New ILO</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Course Code</label>
                  <Input placeholder="CARD-501" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">ILO Code</label>
                  <Input placeholder="ILO-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe the learning outcome..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowManualEntry(false)}>
                  Cancel
                </Button>
                <Button className="flex-1">Create ILO</Button>
              </div>
            </div>
          </div>
        )}

        {/* Mapping Modal */}
        {showMappingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Map ILO to Frameworks</h2>
              
              <div className="grid gap-6 md:grid-cols-3">
                {/* ACGME */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">ACGME Competencies</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {["Patient Care", "Medical Knowledge", "Practice-Based Learning"].map((comp) => (
                      <label key={comp} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <input type="checkbox" className="size-4 text-blue-600 rounded" />
                        <span className="text-sm text-gray-900">{comp}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* EPA */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">EPAs</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {["EPA 1: History", "EPA 2: Physical Exam", "EPA 3: Diagnosis"].map((epa) => (
                      <label key={epa} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <input type="checkbox" className="size-4 text-purple-600 rounded" />
                        <span className="text-sm text-gray-900">{epa}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* LCME */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">LCME Standards</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {["7.1 Biomedical Sciences", "7.2 Organ Systems", "7.3 Clinical Skills"].map((std) => (
                      <label key={std} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <input type="checkbox" className="size-4 text-green-600 rounded" />
                        <span className="text-sm text-gray-900">{std}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowMappingModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1">Save Mappings</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}