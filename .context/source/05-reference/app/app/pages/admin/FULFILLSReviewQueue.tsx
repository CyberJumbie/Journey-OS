import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";

export default function FULFILLSReviewQueue() {
  const mappings = [
    {
      id: "1",
      sloText: "Correlate ECG findings with coronary anatomy",
      parentSession: "Week 1, Session 1",
      linkedILO: "ILO-1: Diagnose cardiovascular emergencies",
      lcmeElement: "7.2 Organ Systems",
      mappedBy: "Dr. Smith",
      mappedAt: "2026-02-15T10:30:00",
      verified: false,
    },
    {
      id: "2",
      sloText: "Differentiate causes of heart failure",
      parentSession: "Week 1, Session 2",
      linkedILO: "ILO-1: Diagnose cardiovascular emergencies",
      lcmeElement: "7.2 Organ Systems",
      mappedBy: "Dr. Johnson",
      mappedAt: "2026-02-15T14:20:00",
      verified: false,
    },
  ];

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">FULFILLS Review Queue</h1>
            <p className="text-gray-600 mt-1">
              Approve or reject SLO→ILO mappings created by faculty
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="size-4 mr-2" />
              Filter
            </Button>
            <Button>Bulk Approve</Button>
          </div>
        </div>

        <div className="bg-white rounded-[--radius-xl] border border-[--border-light]">
          <div className="p-6 border-b border-[--border-light]">
            <h2 className="font-semibold text-gray-900">{mappings.length} Pending Mappings</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-2">{mapping.sloText}</div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Session: {mapping.parentSession}</div>
                      <div>Linked ILO: {mapping.linkedILO}</div>
                      <div>LCME Element: {mapping.lcmeElement}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {mapping.mappedBy} • {new Date(mapping.mappedAt).toLocaleDateString()}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-red-600 border-red-300">
                    <XCircle className="size-4 mr-2" />
                    Reject
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="size-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}