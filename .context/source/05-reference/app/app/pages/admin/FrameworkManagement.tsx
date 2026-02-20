import { useState } from "react";
import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Upload,
  CheckCircle,
  FileText,
} from "lucide-react";

type Framework = "LCME" | "ACGME" | "EPA" | "USMLE" | "Bloom" | "Miller";

interface FrameworkNode {
  id: string;
  code: string;
  name: string;
  description?: string;
  level: "standard" | "element" | "subelement" | "system" | "discipline" | "task" | "content" | "category";
  children?: FrameworkNode[];
}

const frameworkTabs: { id: Framework; label: string; color: string }[] = [
  { id: "LCME", label: "LCME", color: "blue" },
  { id: "ACGME", label: "ACGME", color: "purple" },
  { id: "EPA", label: "EPA", color: "green" },
  { id: "USMLE", label: "USMLE", color: "orange" },
  { id: "Bloom", label: "Bloom", color: "pink" },
  { id: "Miller", label: "Miller", color: "indigo" },
];

export default function FrameworkManagement() {
  const [activeFramework, setActiveFramework] = useState<Framework>("LCME");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [csvInput, setCsvInput] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Mock data - replace with API calls
  const [frameworkData, setFrameworkData] = useState<Record<Framework, FrameworkNode[]>>({
    LCME: [],
    ACGME: [],
    EPA: [],
    USMLE: [],
    Bloom: [],
    Miller: [],
  });

  const handleBundledImport = async () => {
    setIsImporting(true);
    try {
      // API call to import bundled data
      setTimeout(() => {
        setImportResult({
          standards: 12,
          elements: 93,
          subElements: 5,
          totalNodes: 110,
          totalRelationships: 98,
        });
        setIsImporting(false);
      }, 1500);
    } catch (error) {
      setIsImporting(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvInput.trim()) return;
    
    setIsImporting(true);
    try {
      // API call to parse and import CSV
      setTimeout(() => {
        setImportResult({
          standards: 8,
          elements: 45,
          subElements: 3,
          totalNodes: 56,
          totalRelationships: 53,
        });
        setIsImporting(false);
        setCsvInput("");
      }, 1500);
    } catch (error) {
      setIsImporting(false);
    }
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

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case "standard":
      case "system":
        return "bg-[--navy-deep]/10 text-[--navy-deep]";
      case "element":
      case "discipline":
      case "category":
        return "bg-[--blue-mid]/10 text-[--blue-mid]";
      case "subelement":
      case "task":
      case "content":
        return "bg-[--success-bg] text-[--green]";
      default:
        return "bg-[--cream] text-[--text-secondary]";
    }
  };

  const renderFrameworkNode = (node: FrameworkNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const matchesSearch = !searchQuery || 
      node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    if (!matchesSearch && !hasChildren) return null;

    return (
      <div key={node.id}>
        <div 
          className="flex items-start gap-3 py-3 px-4 hover:bg-[--parchment] rounded-lg cursor-pointer"
          style={{ marginLeft: `${level * 24}px` }}
        >
          {hasChildren && (
            <button onClick={() => toggleNode(node.id)} className="mt-1">
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          )}
          {!hasChildren && <div className="size-4 mt-1" />}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getLevelBadgeColor(node.level)}>
                {node.level.toUpperCase().slice(0, 3)}
              </Badge>
              <code className="text-sm font-mono text-gray-600">{node.code}</code>
            </div>
            <div className="font-medium text-gray-900 mb-1">{node.name}</div>
            {node.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{node.description}</p>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderFrameworkNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const currentData = frameworkData[activeFramework];
  const countNodes = (nodes: FrameworkNode[]): { total: number; visible: number } => {
    let total = 0;
    let visible = 0;

    const count = (items: FrameworkNode[]) => {
      for (const item of items) {
        total++;
        const matchesSearch = !searchQuery || 
          item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        if (matchesSearch) visible++;
        if (item.children) count(item.children);
      }
    };

    count(nodes);
    return { total, visible };
  };

  const nodeCounts = countNodes(currentData);
  const canImportCsv = ["LCME", "ACGME", "EPA", "USMLE"].includes(activeFramework);

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Framework Management</h1>
          <p className="text-gray-600 mt-1">
            Import and browse accreditation and assessment frameworks
          </p>
        </div>

        {/* Framework Tabs */}
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          {frameworkTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFramework(tab.id)}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-colors ${
                activeFramework === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Import Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Import {activeFramework} Framework</h3>

              {/* Bundled Import */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">Bundled Import</p>
                    <p className="text-sm text-gray-600">Load pre-configured 2024-25 data</p>
                  </div>
                </div>
                <Button 
                  onClick={handleBundledImport}
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" />
                      Import Bundled (2024-25)
                    </>
                  )}
                </Button>
              </div>

              {/* CSV Upload */}
              {canImportCsv && (
                <details className="border-t pt-6">
                  <summary className="cursor-pointer font-medium text-gray-900 mb-3">
                    CSV Upload (Advanced)
                  </summary>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Format: code, name, description, parent_code
                    </p>
                    <Textarea
                      placeholder="Paste CSV data here..."
                      value={csvInput}
                      onChange={(e) => setCsvInput(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <Button 
                      onClick={handleCsvImport}
                      disabled={!csvInput.trim() || isImporting}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="size-4 mr-2" />
                      Import CSV
                    </Button>
                  </div>
                </details>
              )}

              {/* Import Result */}
              {importResult && (
                <Alert className="mt-6 border-[--green]/20 bg-[--success-bg]">
                  <CheckCircle className="size-4 text-[--green]" />
                  <AlertDescription>
                    <div className="font-medium text-[--ink] mb-2">Import Successful!</div>
                    <div className="space-y-1 text-sm text-[--text-secondary]">
                      {importResult.standards && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-[--navy-deep]/10 text-[--navy-deep]">
                            {importResult.standards} Standards
                          </Badge>
                        </div>
                      )}
                      {importResult.elements && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-[--blue-mid]/10 text-[--blue-mid]">
                            {importResult.elements} Elements
                          </Badge>
                        </div>
                      )}
                      {importResult.subElements > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-[--success-bg] text-[--green]">
                            {importResult.subElements} SubElements
                          </Badge>
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t border-[--green]/20">
                        <span className="font-medium">{importResult.totalNodes} total nodes</span>
                        <span className="mx-2">•</span>
                        <span className="font-medium">{importResult.totalRelationships} relationships</span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Framework Browser */}
          <div className="space-y-6">
            <div className="bg-white rounded-[--radius-xl] border border-[--border-light]">
              <div className="p-6 border-b border-[--border-light]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{activeFramework} Framework</h3>
                  <div className="flex gap-2">
                    {currentData.length > 0 && (
                      <>
                        <Badge variant="secondary" className="bg-[--navy-deep]/10 text-[--navy-deep]">
                          12 Top
                        </Badge>
                        <Badge variant="secondary" className="bg-[--blue-mid]/10 text-[--blue-mid]">
                          93 Mid
                        </Badge>
                        <Badge variant="secondary" className="bg-[--success-bg] text-[--green]">
                          5 Leaf
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Search by code, name, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Tree View */}
              <div className="max-h-[600px] overflow-y-auto">
                {currentData.length > 0 ? (
                  <div className="p-2">
                    {currentData.map(node => renderFrameworkNode(node))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="size-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No {activeFramework} data loaded</p>
                    <p className="text-sm text-gray-500">
                      Use the import panel to load framework data
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {currentData.length > 0 && (
                <div className="p-4 border-t border-[--border-light] bg-[--parchment] text-sm text-gray-600">
                  {nodeCounts.total} total nodes, {nodeCounts.visible} visible
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}