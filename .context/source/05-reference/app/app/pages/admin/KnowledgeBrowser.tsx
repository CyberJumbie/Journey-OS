import { useState } from "react";
import { useNavigate } from "react-router";
import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Search,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  Target,
} from "lucide-react";

interface KnowledgeNode {
  id: string;
  name: string;
  description?: string;
  level: "domain" | "concept" | "subconcept";
  childCount?: number;
  teachingChunks?: number;
  assessmentItems?: number;
  children?: KnowledgeNode[];
}

export default function KnowledgeBrowser() {
  const navigate = useNavigate();
  const [selectedSystem, setSelectedSystem] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Mock data - replace with API
  const [systems] = useState([
    { id: "all", name: "All Systems" },
    { id: "cardiovascular", name: "Cardiovascular System" },
    { id: "respiratory", name: "Respiratory System" },
    { id: "nervous", name: "Nervous System" },
    { id: "endocrine", name: "Endocrine System" },
  ]);

  const [knowledgeTree] = useState<KnowledgeNode[]>([
    {
      id: "dom-1",
      name: "Cardiac Physiology",
      description: "Structure and function of the cardiovascular system",
      level: "domain",
      childCount: 3,
      children: [
        {
          id: "con-1",
          name: "Myocardial Infarction",
          description: "Death of heart muscle due to blocked blood supply",
          level: "concept",
          childCount: 2,
          children: [
            {
              id: "sub-1",
              name: "STEMI Diagnosis",
              description: "ST-elevation myocardial infarction diagnostic criteria",
              level: "subconcept",
              teachingChunks: 8,
              assessmentItems: 12,
            },
            {
              id: "sub-2",
              name: "NSTEMI Management",
              description: "Non-ST-elevation myocardial infarction treatment protocols",
              level: "subconcept",
              teachingChunks: 5,
              assessmentItems: 7,
            },
          ],
        },
      ],
    },
  ]);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "domain":
        return <Badge className="bg-[--navy-deep]/10 text-[--navy-deep]">DOM</Badge>;
      case "concept":
        return <Badge className="bg-[--blue-mid]/10 text-[--blue-mid]">CON</Badge>;
      case "subconcept":
        return <Badge className="bg-[--success-bg] text-[--green]">SUB</Badge>;
      default:
        return null;
    }
  };

  const renderNode = (node: KnowledgeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSubConcept = node.level === "subconcept";

    return (
      <div key={node.id}>
        <div
          className={`flex items-start gap-3 py-3 px-4 rounded-lg ${
            isSubConcept ? "cursor-pointer hover:bg-[--info-bg]" : "hover:bg-[--parchment]"
          }`}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => isSubConcept && navigate(`/admin/knowledge/${node.id}`)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="mt-1"
            >
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          )}
          {!hasChildren && <div className="size-4 mt-1" />}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getLevelBadge(node.level)}
              <span className="font-medium text-[--ink]">{node.name}</span>
            </div>
            {node.description && (
              <p className="text-sm text-[--text-secondary] mb-2">{node.description}</p>
            )}
            <div className="flex items-center gap-3 text-sm">
              {node.childCount !== undefined && (
                <span className="text-[--text-secondary]">{node.childCount} children</span>
              )}
              {node.teachingChunks !== undefined && (
                <Badge variant="secondary" className="bg-[--warning-bg] text-[--green-dark]">
                  <BookOpen className="size-3 mr-1" />
                  {node.teachingChunks}
                </Badge>
              )}
              {node.assessmentItems !== undefined && (
                <Badge variant="secondary" className="bg-[--info-bg] text-[--blue]">
                  <Target className="size-3 mr-1" />
                  {node.assessmentItems}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>{node.children!.map((child) => renderNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1>Knowledge Browser</h1>
          <p className="text-[--text-secondary] mt-1">
            Browse the medical knowledge taxonomy
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-4">
          <div className="flex gap-4">
            <div className="w-64">
              <select
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[--border-default] focus:outline-none focus:ring-2 focus:ring-[--blue-mid]"
              >
                {systems.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[--text-muted]" />
              <Input
                placeholder="Search nodes and descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Knowledge Tree */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light]">
          <div className="max-h-[700px] overflow-y-auto p-2">
            {knowledgeTree.map((node) => renderNode(node))}
          </div>
          <div className="p-4 border-t border-[--border-light] bg-[--parchment] text-sm text-gray-600">
            110 total nodes, 110 visible
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}