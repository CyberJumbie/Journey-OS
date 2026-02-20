import { useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { 
  FileText, 
  Plus, 
  Search, 
  Star,
  Copy,
  Edit,
  Trash2,
  MoreVertical
} from "lucide-react";
import { Input } from "../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  type: "multiple-choice" | "case-study" | "calculation";
  difficulty: "easy" | "medium" | "hard";
  usageCount: number;
  isFavorite: boolean;
  lastUsed: string;
  structure: {
    questionFormat: string;
    optionCount: number;
    hasExplanation: boolean;
    hasReferences: boolean;
  };
}

const templates: QuestionTemplate[] = [
  {
    id: "1",
    name: "Clinical Case with Diagnosis",
    description: "Patient presentation with symptoms leading to diagnosis question",
    type: "multiple-choice",
    difficulty: "medium",
    usageCount: 45,
    isFavorite: true,
    lastUsed: "2026-02-15",
    structure: {
      questionFormat: "Patient case → Signs/symptoms → Diagnosis",
      optionCount: 4,
      hasExplanation: true,
      hasReferences: true,
    },
  },
  {
    id: "2",
    name: "Treatment Selection",
    description: "Question format for choosing appropriate treatment options",
    type: "multiple-choice",
    difficulty: "hard",
    usageCount: 32,
    isFavorite: true,
    lastUsed: "2026-02-14",
    structure: {
      questionFormat: "Diagnosis → Patient factors → Best treatment",
      optionCount: 5,
      hasExplanation: true,
      hasReferences: true,
    },
  },
  {
    id: "3",
    name: "Lab Interpretation",
    description: "Interpreting laboratory results and clinical significance",
    type: "multiple-choice",
    difficulty: "medium",
    usageCount: 28,
    isFavorite: false,
    lastUsed: "2026-02-10",
    structure: {
      questionFormat: "Lab values → Clinical context → Interpretation",
      optionCount: 4,
      hasExplanation: true,
      hasReferences: true,
    },
  },
  {
    id: "4",
    name: "Drug Dosage Calculation",
    description: "Mathematical calculation for medication dosing",
    type: "calculation",
    difficulty: "easy",
    usageCount: 19,
    isFavorite: false,
    lastUsed: "2026-02-08",
    structure: {
      questionFormat: "Patient weight → Drug order → Calculate dose",
      optionCount: 4,
      hasExplanation: true,
      hasReferences: false,
    },
  },
  {
    id: "5",
    name: "Multi-Step Case Study",
    description: "Complex case with multiple decision points",
    type: "case-study",
    difficulty: "hard",
    usageCount: 15,
    isFavorite: true,
    lastUsed: "2026-02-12",
    structure: {
      questionFormat: "Initial presentation → Test results → Follow-up decisions",
      optionCount: 4,
      hasExplanation: true,
      hasReferences: true,
    },
  },
  {
    id: "6",
    name: "Mechanism of Action",
    description: "Understanding drug or disease mechanisms",
    type: "multiple-choice",
    difficulty: "medium",
    usageCount: 23,
    isFavorite: false,
    lastUsed: "2026-02-09",
    structure: {
      questionFormat: "Drug/condition → Mechanism explanation",
      optionCount: 4,
      hasExplanation: true,
      hasReferences: true,
    },
  },
];

export default function QuestionTemplates() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "multiple-choice" | "case-study" | "calculation">("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || template.type === filterType;
    const matchesFavorite = !showFavoritesOnly || template.isFavorite;
    return matchesSearch && matchesType && matchesFavorite;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Question Templates</h1>
            <p className="text-sm text-gray-600 mt-1">
              Pre-built structures to speed up question creation
            </p>
          </div>
          <Button onClick={() => navigate("/templates/create")}>
            <Plus className="size-4" />
            Create Template
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-[#FFC645]/10 flex items-center justify-center">
                <FileText className="size-5 text-[#FFC645]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Templates</p>
                <p className="text-xl font-semibold text-gray-900">{templates.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Star className="size-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Favorites</p>
                <p className="text-xl font-semibold text-gray-900">
                  {templates.filter(t => t.isFavorite).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Usage</p>
                <p className="text-xl font-semibold text-gray-900">
                  {templates.reduce((sum, t) => sum + t.usageCount, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Most Used</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {templates.sort((a, b) => b.usageCount - a.usageCount)[0].name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Star className={`size-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favorites
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Type: {filterType === "all" ? "All" : getTypeLabel(filterType)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterType("all")}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("multiple-choice")}>
                    Multiple Choice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("case-study")}>
                    Case Study
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("calculation")}>
                    Calculation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-all cursor-pointer group"
              onClick={() => {/* Use template */}}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="size-12 rounded-lg bg-[#FFC645]/10 flex items-center justify-center shrink-0">
                  <FileText className="size-6 text-[#FFC645]" />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle favorite
                    }}
                  >
                    <Star className={`size-4 ${template.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Copy className="size-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium text-gray-900">{getTypeLabel(template.type)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Options:</span>
                  <span className="font-medium text-gray-900">{template.structure.optionCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Used:</span>
                  <span className="font-medium text-gray-900">{template.usageCount} times</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                  {template.difficulty}
                </span>
                <span className="text-xs text-gray-500">
                  Last used {new Date(template.lastUsed).toLocaleDateString()}
                </span>
              </div>

              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  // Use template
                }}
              >
                Use Template
              </Button>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText className="size-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No templates found</p>
            <p className="text-sm text-gray-500 mb-4">
              Try adjusting your search or filters
            </p>
            <Button onClick={() => navigate("/templates/create")}>
              <Plus className="size-4" />
              Create New Template
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}