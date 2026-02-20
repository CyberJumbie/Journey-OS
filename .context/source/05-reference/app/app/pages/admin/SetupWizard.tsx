import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Building2,
  Network,
  FileCheck,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Upload,
  Download
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";

interface HierarchyNode {
  id: string;
  name: string;
  type: "program" | "phase" | "block";
  children?: HierarchyNode[];
}

interface Course {
  id: string;
  code: string;
  name: string;
  creditHours: number;
  blockId: string;
}

const steps = [
  { id: 1, title: "Institution Details", icon: Building2 },
  { id: 2, title: "Hierarchy Builder", icon: Network },
  { id: 3, title: "Confirmation", icon: FileCheck },
  { id: 4, title: "Course Catalog", icon: BookOpen },
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Step 1: Institution Details
  const [institutionData, setInstitutionData] = useState({
    name: "",
    abbreviation: "",
    address: "",
    accreditationBody: "LCME",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2: Hierarchy
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([
    {
      id: "prog-1",
      name: "Doctor of Medicine",
      type: "program",
      children: [
        {
          id: "phase-1",
          name: "Phase 1",
          type: "phase",
          children: [
            { id: "block-1", name: "Block 1", type: "block" },
            { id: "block-2", name: "Block 2", type: "block" },
            { id: "block-3", name: "Block 3", type: "block" },
            { id: "block-4", name: "Block 4", type: "block" },
          ],
        },
        {
          id: "phase-2",
          name: "Phase 2",
          type: "phase",
          children: [
            { id: "block-5", name: "Block 5", type: "block" },
            { id: "block-6", name: "Block 6", type: "block" },
            { id: "block-7", name: "Block 7", type: "block" },
            { id: "block-8", name: "Block 8", type: "block" },
          ],
        },
      ],
    },
  ]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["prog-1", "phase-1", "phase-2"]));
  const [editingNode, setEditingNode] = useState<string | null>(null);

  // Step 4: Courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [csvData, setCsvData] = useState("");
  const [manualCourseData, setManualCourseData] = useState({
    code: "",
    name: "",
    creditHours: 3,
    blockId: "",
  });

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && currentStep < 4) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, currentStep]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!institutionData.name.trim()) {
      newErrors.name = "Institution name is required";
    }
    if (!institutionData.abbreviation.trim()) {
      newErrors.abbreviation = "Abbreviation is required";
    } else if (institutionData.abbreviation.length < 2 || institutionData.abbreviation.length > 10) {
      newErrors.abbreviation = "Abbreviation must be 2-10 characters";
    }
    if (!institutionData.address.trim()) {
      newErrors.address = "Address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateHierarchy = () => {
    for (const program of hierarchy) {
      if (!program.children || program.children.length === 0) {
        return { valid: false, message: "Each program must have at least 1 phase" };
      }
      for (const phase of program.children) {
        if (!phase.children || phase.children.length === 0) {
          return { valid: false, message: "Each phase must have at least 1 block" };
        }
        if (phase.children.length > 20) {
          return { valid: false, message: `${phase.name} has more than 20 blocks` };
        }
      }
    }
    return { valid: true };
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
    } else if (currentStep === 2) {
      const validation = validateHierarchy();
      if (!validation.valid) {
        alert(validation.message);
        return;
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      setHasUnsavedChanges(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // Submit to API
    navigate("/admin");
  };

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const addNode = (parentId: string, type: "phase" | "block") => {
    const newNode: HierarchyNode = {
      id: `${type}-${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      children: type === "phase" ? [] : undefined,
    };

    const addToParent = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, children: [...(node.children || []), newNode] };
        }
        if (node.children) {
          return { ...node, children: addToParent(node.children) };
        }
        return node;
      });
    };

    setHierarchy(addToParent(hierarchy));
    setHasUnsavedChanges(true);
  };

  const deleteNode = (id: string) => {
    const removeFromTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.filter(node => node.id !== id).map(node => {
        if (node.children) {
          return { ...node, children: removeFromTree(node.children) };
        }
        return node;
      });
    };

    setHierarchy(removeFromTree(hierarchy));
    setHasUnsavedChanges(true);
  };

  const renameNode = (id: string, newName: string) => {
    const updateTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) };
        }
        return node;
      });
    };

    setHierarchy(updateTree(hierarchy));
    setEditingNode(null);
    setHasUnsavedChanges(true);
  };

  const addManualCourse = () => {
    if (!manualCourseData.code || !manualCourseData.name || !manualCourseData.blockId) {
      alert("Please fill in all required fields");
      return;
    }

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      ...manualCourseData,
    };

    setCourses([...courses, newCourse]);
    setManualCourseData({ code: "", name: "", creditHours: 3, blockId: "" });
  };

  const deleteCourse = (id: string) => {
    setCourses(courses.filter(c => c.id !== id));
  };

  const getAllBlocks = (nodes: HierarchyNode[]): HierarchyNode[] => {
    let blocks: HierarchyNode[] = [];
    for (const node of nodes) {
      if (node.type === "block") {
        blocks.push(node);
      }
      if (node.children) {
        blocks = [...blocks, ...getAllBlocks(node.children)];
      }
    }
    return blocks;
  };

  const countNodes = (nodes: HierarchyNode[]): { programs: number; phases: number; blocks: number } => {
    let programs = 0, phases = 0, blocks = 0;
    
    const count = (items: HierarchyNode[]) => {
      for (const item of items) {
        if (item.type === "program") programs++;
        if (item.type === "phase") phases++;
        if (item.type === "block") blocks++;
        if (item.children) count(item.children);
      }
    };
    
    count(nodes);
    return { programs, phases, blocks };
  };

  const renderHierarchyNode = (node: HierarchyNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isEditing = editingNode === node.id;

    return (
      <div key={node.id} style={{ marginLeft: `${level * 24}px` }}>
        <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg group">
          {hasChildren && (
            <button onClick={() => toggleNode(node.id)} className="size-5">
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          )}
          {!hasChildren && <div className="size-5" />}
          
          {isEditing ? (
            <Input
              autoFocus
              defaultValue={node.name}
              className="h-8"
              onBlur={(e) => renameNode(node.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  renameNode(node.id, (e.target as HTMLInputElement).value);
                }
              }}
            />
          ) : (
            <div 
              className="flex-1 flex items-center gap-2 cursor-pointer"
              onDoubleClick={() => setEditingNode(node.id)}
            >
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                node.type === "program" ? "bg-purple-100 text-purple-700" :
                node.type === "phase" ? "bg-blue-100 text-blue-700" :
                "bg-green-100 text-green-700"
              }`}>
                {node.type.toUpperCase()}
              </span>
              <span className="font-medium">{node.name}</span>
            </div>
          )}

          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            {node.type !== "block" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addNode(node.id, node.type === "program" ? "phase" : "block")}
              >
                <Plus className="size-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingNode(node.id)}
            >
              <Edit2 className="size-4" />
            </Button>
            {node.type !== "program" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteNode(node.id)}
              >
                <Trash2 className="size-4 text-red-600" />
              </Button>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderHierarchyNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Institution Details</h2>
        <p className="text-gray-600">Enter basic information about your institution</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Institution Name *</Label>
          <Input
            id="name"
            value={institutionData.name}
            onChange={(e) => {
              setInstitutionData({ ...institutionData, name: e.target.value });
              setHasUnsavedChanges(true);
            }}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="abbreviation">Abbreviation * (2-10 characters)</Label>
          <Input
            id="abbreviation"
            value={institutionData.abbreviation}
            onChange={(e) => {
              setInstitutionData({ ...institutionData, abbreviation: e.target.value });
              setHasUnsavedChanges(true);
            }}
            maxLength={10}
            className={errors.abbreviation ? "border-red-500" : ""}
          />
          {errors.abbreviation && <p className="text-sm text-red-600 mt-1">{errors.abbreviation}</p>}
        </div>

        <div>
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            value={institutionData.address}
            onChange={(e) => {
              setInstitutionData({ ...institutionData, address: e.target.value });
              setHasUnsavedChanges(true);
            }}
            className={errors.address ? "border-red-500" : ""}
          />
          {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
        </div>

        <div>
          <Label htmlFor="accreditation">Accreditation Body</Label>
          <Input
            id="accreditation"
            value={institutionData.accreditationBody}
            onChange={(e) => {
              setInstitutionData({ ...institutionData, accreditationBody: e.target.value });
              setHasUnsavedChanges(true);
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const validation = validateHierarchy();
    
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Hierarchy Builder</h2>
          <p className="text-gray-600">Define your academic structure (double-click to rename)</p>
        </div>

        {!validation.valid && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {hierarchy.map(node => renderHierarchyNode(node))}
        </div>

        <div className="text-sm text-gray-600">
          <p>💡 Tip: Double-click any node to rename it</p>
          <p>⚠️ Each program must have at least 1 phase, each phase at least 1 block</p>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const counts = countNodes(hierarchy);
    const totalNodes = counts.programs + counts.phases + counts.blocks;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Review & Confirm</h2>
          <p className="text-gray-600">Please review your institution setup before proceeding</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Institution Details</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600">Name</dt>
                <dd className="font-medium">{institutionData.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Abbreviation</dt>
                <dd className="font-medium">{institutionData.abbreviation}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-gray-600">Address</dt>
                <dd className="font-medium">{institutionData.address}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Accreditation</dt>
                <dd className="font-medium">{institutionData.accreditationBody}</dd>
              </div>
            </dl>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Academic Hierarchy</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-700">{counts.programs}</div>
                <div className="text-sm text-purple-600">Programs</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{counts.phases}</div>
                <div className="text-sm text-blue-600">Phases</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{counts.blocks}</div>
                <div className="text-sm text-green-600">Blocks</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Total: {totalNodes} nodes
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const allBlocks = getAllBlocks(hierarchy);

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Course Catalog</h2>
          <p className="text-gray-600">Add courses to your institution</p>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "upload"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            CSV/JSON Upload
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "manual"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Manual Entry
          </button>
        </div>

        {activeTab === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <Upload className="size-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop CSV/JSON file here</p>
              <Button variant="outline">
                <Upload className="size-4 mr-2" />
                Browse Files
              </Button>
              <div className="mt-4">
                <Button variant="ghost" size="sm">
                  <Download className="size-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "manual" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Course Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., ANAT-101"
                  value={manualCourseData.code}
                  onChange={(e) => setManualCourseData({ ...manualCourseData, code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="courseName">Course Name *</Label>
                <Input
                  id="courseName"
                  placeholder="e.g., Gross Anatomy"
                  value={manualCourseData.name}
                  onChange={(e) => setManualCourseData({ ...manualCourseData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="creditHours">Credit Hours (1-12) *</Label>
                <Input
                  id="creditHours"
                  type="number"
                  min={1}
                  max={12}
                  value={manualCourseData.creditHours}
                  onChange={(e) => setManualCourseData({ ...manualCourseData, creditHours: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="block">Block *</Label>
                <select
                  id="block"
                  value={manualCourseData.blockId}
                  onChange={(e) => setManualCourseData({ ...manualCourseData, blockId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a block</option>
                  {allBlocks.map(block => (
                    <option key={block.id} value={block.id}>{block.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={addManualCourse}>
              <Plus className="size-4 mr-2" />
              Add Course
            </Button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{courses.length} course(s)</h3>
          </div>
          {courses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Block</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {courses.map(course => {
                    const block = allBlocks.find(b => b.id === course.blockId);
                    return (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-sm">{course.code}</td>
                        <td className="px-6 py-4">{course.name}</td>
                        <td className="px-6 py-4">{course.creditHours}</td>
                        <td className="px-6 py-4">{block?.name}</td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCourse(course.id)}
                          >
                            <Trash2 className="size-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <BookOpen className="size-12 mx-auto mb-4 text-gray-400" />
              <p>No courses added yet</p>
              <p className="text-sm">Use the form above to add your first course</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Progress Bar */}
      <div className="bg-white border-b border-[--border-light]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center ${
                      currentStep > step.id
                        ? "bg-green-600 text-white"
                        : currentStep === step.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="size-5" />
                    ) : (
                      <step.icon className="size-5" />
                    )}
                  </div>
                  <div className="ml-3 hidden md:block">
                    <div className="text-sm font-medium text-gray-900">{step.title}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? "bg-green-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[--border-light]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              Continue
              <ArrowRight className="size-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={courses.length === 0}
            >
              Complete Setup
              <Check className="size-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}