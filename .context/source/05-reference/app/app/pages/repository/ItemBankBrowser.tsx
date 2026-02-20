import { useState } from "react";
import { Link, useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Search,
  Filter,
  ChevronDown,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AssessmentItem {
  id: string;
  stem: string;
  format: "Single Best Answer" | "Multiple True/False" | "Extended Matching";
  usmleSyst: string;
  difficulty: "Easy" | "Medium" | "Hard";
  bloomLevel: string;
  clinicalSetting: string;
  leadInType: string;
  ageGroup: string;
  sex: string;
  status: "draft" | "pending" | "approved" | "rejected";
  usageCount: number;
  createdAt: string;
  source: string;
}

const FILTER_OPTIONS = {
  status: ["All", "Draft", "Pending", "Approved", "Rejected"],
  format: ["All", "Single Best Answer", "Multiple True/False", "Extended Matching"],
  difficulty: ["All", "Easy", "Medium", "Hard"],
  bloomLevel: ["All", "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"],
  usmleSystems: ["All", "Cardiovascular", "Respiratory", "Nervous", "Endocrine", "Renal"],
  clinicalSetting: ["All", "Ambulatory", "Emergency", "Inpatient", "OR", "ICU"],
  leadInType: ["All", "Diagnosis", "Management", "Mechanism", "Prognosis"],
  ageGroup: ["All", "Neonate", "Infant", "Child", "Adolescent", "Adult", "Elderly"],
  sex: ["All", "Male", "Female", "N/A"],
};

export default function ItemBankBrowser() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState({
    status: "All",
    format: "All",
    difficulty: "All",
    bloomLevel: "All",
    usmleSystem: "All",
    clinicalSetting: "All",
    leadInType: "All",
    ageGroup: "All",
    sex: "All",
  });

  const [sortBy, setSortBy] = useState<"created_at" | "difficulty" | "usage_count">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Mock data - replace with API
  const items: AssessmentItem[] = [
    {
      id: "1",
      stem: "A 62-year-old man presents with acute chest pain radiating to the left arm. ECG shows ST elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?",
      format: "Single Best Answer",
      usmleSyst: "Cardiovascular",
      difficulty: "Medium",
      bloomLevel: "Apply",
      clinicalSetting: "Emergency",
      leadInType: "Diagnosis",
      ageGroup: "Adult",
      sex: "Male",
      status: "approved",
      usageCount: 12,
      createdAt: "2026-02-15T10:30:00",
      source: "AI Generated",
    },
    {
      id: "2",
      stem: "A 45-year-old woman with type 2 diabetes presents with polyuria and polydipsia. Lab results show HbA1c of 9.2%. What is the most appropriate first-line therapy?",
      format: "Single Best Answer",
      usmleSyst: "Endocrine",
      difficulty: "Easy",
      bloomLevel: "Understand",
      clinicalSetting: "Ambulatory",
      leadInType: "Management",
      ageGroup: "Adult",
      sex: "Female",
      status: "pending",
      usageCount: 3,
      createdAt: "2026-02-16T09:15:00",
      source: "AI Generated",
    },
  ];

  const filteredItems = items.filter(item => {
    if (searchQuery && !item.stem.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.status !== "All" && item.status !== filters.status.toLowerCase()) {
      return false;
    }
    if (filters.format !== "All" && item.format !== filters.format) {
      return false;
    }
    if (filters.difficulty !== "All" && item.difficulty !== filters.difficulty) {
      return false;
    }
    if (filters.bloomLevel !== "All" && item.bloomLevel !== filters.bloomLevel) {
      return false;
    }
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "created_at":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "difficulty":
        const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 };
        comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        break;
      case "usage_count":
        comparison = a.usageCount - b.usageCount;
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-700">Draft</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-700";
      case "Medium":
        return "text-amber-700";
      case "Hard":
        return "text-red-700";
      default:
        return "text-gray-700";
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === paginatedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedItems.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  if (items.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <FileText className="size-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No Items Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Generate your first assessment items to get started
            </p>
            <Button onClick={() => navigate("/generation/syllabus")}>
              <TrendingUp className="size-4 mr-2" />
              Generate Questions
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Item Bank</h1>
            <p className="text-gray-600 mt-1">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <div className="flex gap-2">
            {selectedItems.size > 0 && (
              <Button variant="outline">
                Bulk Actions ({selectedItems.size})
                <ChevronDown className="size-4 ml-1" />
              </Button>
            )}
            <Button onClick={() => navigate("/generation/syllabus")}>
              <TrendingUp className="size-4 mr-2" />
              Generate Questions
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search item stems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="size-4 mr-2" />
              Filters
              <ChevronDown className={`size-4 ml-1 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {showFilters && (
            <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FILTER_OPTIONS.status.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Format</label>
                <select
                  value={filters.format}
                  onChange={(e) => setFilters({ ...filters, format: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FILTER_OPTIONS.format.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Difficulty</label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FILTER_OPTIONS.difficulty.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Bloom Level</label>
                <select
                  value={filters.bloomLevel}
                  onChange={(e) => setFilters({ ...filters, bloomLevel: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FILTER_OPTIONS.bloomLevel.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">USMLE System</label>
                <select
                  value={filters.usmleSystem}
                  onChange={(e) => setFilters({ ...filters, usmleSystem: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FILTER_OPTIONS.usmleSystems.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Clinical Setting</label>
                <select
                  value={filters.clinicalSetting}
                  onChange={(e) => setFilters({ ...filters, clinicalSetting: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FILTER_OPTIONS.clinicalSetting.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">Date Created</option>
              <option value="difficulty">Difficulty</option>
              <option value="usage_count">Usage Count</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === paginatedItems.length && paginatedItems.length > 0}
                      onChange={toggleSelectAll}
                      className="size-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Properties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="size-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 line-clamp-2 max-w-2xl">
                        {item.stem}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{item.source}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {item.format}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.usmleSyst} • {item.clinicalSetting}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={getDifficultyColor(item.difficulty)}>
                            {item.difficulty}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">{item.bloomLevel}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{item.usageCount}×</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/questions/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="size-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedItems.length)} of {sortedItems.length} items
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}