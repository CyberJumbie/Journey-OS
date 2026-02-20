import { useParams } from "react-router";
import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  FileText,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

export default function LCMEElementDrillDown() {
  const { elementId } = useParams();

  const element = {
    code: "7.2",
    name: "Organ Systems and Clinical Presentation",
    overallScore: 78,
    fulfillsScore: 25,
    teachingScore: 28,
    assessmentScore: 25,
  };

  const mappedILOs = [
    { id: "1", code: "ILO-1", description: "Diagnose cardiovascular emergencies", sloCount: 5 },
    { id: "2", code: "ILO-2", description: "Interpret cardiac diagnostic tests", sloCount: 3 },
  ];

  const gaps = [
    "Insufficient coverage of renal physiology",
    "Limited assessment items on endocrine disorders",
    "No teaching content on reproductive system pathology",
  ];

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back to Heatmap
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">LCME Element {element.code}</h1>
            <p className="text-gray-600 mt-1">{element.name}</p>
          </div>
        </div>

        {/* Compliance Scorecard */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Compliance Scorecard</h2>
          
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-1">{element.overallScore}%</div>
              <div className="text-sm text-gray-600">Overall</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-1">{element.fulfillsScore}%</div>
              <div className="text-sm text-gray-600">FULFILLS (30%)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-1">{element.teachingScore}%</div>
              <div className="text-sm text-gray-600">Teaching (30%)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-1">{element.assessmentScore}%</div>
              <div className="text-sm text-gray-600">Assessment (40%)</div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Overall Coverage</span>
                <span className="font-medium text-gray-900">{element.overallScore}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${element.overallScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Mapped ILOs */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Mapped ILOs</h2>
          <div className="space-y-3">
            {mappedILOs.map((ilo) => (
              <div key={ilo.id} className="flex items-center justify-between p-3 bg-[--parchment] rounded-lg">
                <div>
                  <Badge variant="secondary" className="mb-1">{ilo.code}</Badge>
                  <p className="text-sm text-gray-900">{ilo.description}</p>
                </div>
                <Badge>{ilo.sloCount} SLOs</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Gaps */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-5 text-red-600" />
            <h2 className="font-semibold text-red-900">Coverage Gaps</h2>
          </div>
          <ul className="space-y-2">
            {gaps.map((gap, index) => (
              <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                <span className="text-red-600">•</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}