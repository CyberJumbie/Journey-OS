import { useState } from "react";
import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Download,
  FileText,
  Loader2,
} from "lucide-react";

export default function LCMEComplianceHeatmap() {
  const [isGenerating, setIsGenerating] = useState(false);

  const standards = ["Standard 7", "Standard 8", "Standard 9"];
  const elements = ["7.1", "7.2", "7.3", "8.1", "8.2", "9.1"];

  // Coverage percentages (mock data)
  const coverage: Record<string, number> = {
    "7.1": 85,
    "7.2": 92,
    "7.3": 45,
    "8.1": 78,
    "8.2": 55,
    "9.1": 0,
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage === 0) return "bg-gray-200 text-gray-700";
    if (percentage >= 80) return "bg-green-500 text-white";
    if (percentage >= 50) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
    alert("Report generated!");
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">LCME Compliance Heatmap</h1>
            <p className="text-gray-600 mt-1">
              View coverage across LCME standards and elements
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="size-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="size-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Coverage Legend</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="size-6 bg-green-500 rounded" />
              <span className="text-sm text-gray-600">≥80% (Excellent)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-6 bg-amber-500 rounded" />
              <span className="text-sm text-gray-600">50-79% (Adequate)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-6 bg-red-500 rounded" />
              <span className="text-sm text-gray-600">&lt;50% (Deficient)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-6 bg-gray-200 rounded" />
              <span className="text-sm text-gray-600">No data</span>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Coverage Matrix</h2>
          
          <div className="grid grid-cols-7 gap-2">
            {/* Header */}
            <div className="font-medium text-sm text-gray-900">Element</div>
            {standards.map((std) => (
              <div key={std} className="font-medium text-sm text-gray-900 text-center">
                {std}
              </div>
            ))}

            {/* Rows */}
            {elements.map((element) => (
              <>
                <div key={`label-${element}`} className="font-medium text-sm text-gray-900 py-3">
                  {element}
                </div>
                <div
                  key={`cell-${element}`}
                  className={`${getCoverageColor(coverage[element])} rounded-lg p-3 text-center font-bold text-sm`}
                >
                  {coverage[element] === 0 ? "—" : `${coverage[element]}%`}
                </div>
                <div className="col-span-5" /> {/* Empty cells */}
              </>
            ))}
          </div>
        </div>

        {/* Element Details */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Element Details</h2>
          <div className="space-y-3">
            {elements.map((element) => (
              <div key={element} className="flex items-center justify-between p-3 bg-[--parchment] rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{element}</div>
                  <div className="text-sm text-gray-600">LCME Element</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getCoverageColor(coverage[element])}>
                    {coverage[element]}% coverage
                  </Badge>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}