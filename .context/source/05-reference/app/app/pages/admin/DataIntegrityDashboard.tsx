import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Trash2,
  Plus,
} from "lucide-react";

export default function DataIntegrityDashboard() {
  const lastCheck = "2026-02-16T09:30:00";
  
  const entityCounts = {
    supabase: { profiles: 45, assessmentItems: 234, courses: 12 },
    neo4j: { AssessmentItem: 234, Course: 12, SubConcept: 156 },
  };

  const issues = [
    {
      id: "1",
      type: "orphan",
      entity: "AssessmentItem",
      identifier: "item_abc123",
      issue: "Exists in Neo4j but missing in Supabase",
      severity: "high",
    },
    {
      id: "2",
      type: "ghost",
      entity: "Course",
      identifier: "CARD-502",
      issue: "Exists in Supabase but missing in Neo4j",
      severity: "medium",
    },
    {
      id: "3",
      type: "mismatch",
      entity: "SubConcept",
      identifier: "sc_xyz789",
      issue: "Metadata mismatch between databases",
      severity: "low",
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-[--danger-bg] text-[--danger]";
      case "medium": return "bg-[--warning-bg] text-[--green-dark]";
      case "low": return "bg-[--info-bg] text-[--blue]";
      default: return "bg-[--cream] text-[--text-secondary]";
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>Data Integrity Dashboard</h1>
            <p className="text-[--text-secondary] mt-1">
              Monitor and resolve cross-database inconsistencies
            </p>
          </div>
          <Button>
            <PlayCircle className="size-4 mr-2" />
            Run Check Now
          </Button>
        </div>

        {/* Last Check */}
        <div className="bg-[--info-bg] border border-[--blue]/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-[--blue]">
            <CheckCircle2 className="size-5" />
            <span className="font-medium">Last check: {new Date(lastCheck).toLocaleString()}</span>
          </div>
        </div>

        {/* Entity Counts */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
            <h2>Supabase Entities</h2>
            <div className="space-y-3">
              {Object.entries(entityCounts.supabase).map(([entity, count]) => (
                <div key={entity} className="flex items-center justify-between">
                  <span className="text-[--text-secondary]">{entity}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
            <h2>Neo4j Nodes</h2>
            <div className="space-y-3">
              {Object.entries(entityCounts.neo4j).map(([entity, count]) => (
                <div key={entity} className="flex items-center justify-between">
                  <span className="text-[--text-secondary]">{entity}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Issues Table */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light]">
          <div className="p-6 border-b border-[--border-light] flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Issues Found ({issues.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[--parchment] border-b border-[--border-light]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Identifier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Issue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Severity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border-light]">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-[--parchment] transition-colors">
                    <td className="px-6 py-4">
                      <Badge variant="secondary">{issue.type}</Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">
                      {issue.entity}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">
                      {issue.identifier}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {issue.issue}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {issue.type === "orphan" && (
                          <Button size="sm" variant="outline">
                            <Trash2 className="size-4 mr-1" />
                            Delete
                          </Button>
                        )}
                        {issue.type === "ghost" && (
                          <Button size="sm" variant="outline">
                            <Plus className="size-4 mr-1" />
                            Create
                          </Button>
                        )}
                        {issue.type === "mismatch" && (
                          <Button size="sm" variant="outline">
                            Sync
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}