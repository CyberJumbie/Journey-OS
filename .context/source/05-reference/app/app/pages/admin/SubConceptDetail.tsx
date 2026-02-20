import { useParams, useNavigate } from "react-router";
import AdminDashboardLayout from "../../components/layout/AdminDashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Target,
  BookOpen,
  TrendingUp,
} from "lucide-react";

export default function SubConceptDetail() {
  const { uuid } = useParams();
  const navigate = useNavigate();

  // Mock data - replace with API
  const subConcept = {
    id: uuid,
    name: "STEMI Diagnosis",
    code: "CARD-MI-001",
    cuiCode: "C0683474",
    description: "ST-elevation myocardial infarction diagnostic criteria and ECG interpretation",
    lodBrief: "Understanding the ECG manifestations of STEMI, including ST-segment elevation patterns in different leads and their correlation with affected coronary arteries.",
    breadcrumb: {
      domain: "Cardiac Physiology",
      concept: "Myocardial Infarction",
      subconcept: "STEMI Diagnosis",
    },
    teachingChunks: [
      {
        id: "1",
        text: "ST-segment elevation in leads II, III, and aVF indicates inferior wall myocardial infarction...",
        verified: true,
      },
      {
        id: "2",
        text: "Anterior wall STEMI presents with ST elevations in V1-V4, typically caused by LAD occlusion...",
        verified: true,
      },
      {
        id: "3",
        text: "Reciprocal ST depressions may be seen in leads opposite to the area of infarction...",
        verified: false,
      },
    ],
    assessmentItems: [
      {
        id: "1",
        stem: "A 62-year-old man presents with chest pain. ECG shows ST elevation in II, III, aVF...",
      },
      {
        id: "2",
        stem: "Which coronary artery is most commonly occluded in anterior wall MI...",
      },
    ],
    slos: [
      {
        id: "1",
        description: "Identify ST-segment elevation patterns characteristic of STEMI on ECG",
      },
      {
        id: "2",
        description: "Correlate ECG lead patterns with affected coronary artery territories",
      },
      {
        id: "3",
        description: "Differentiate STEMI from other causes of ST-segment elevation",
      },
    ],
  };

  return (
    <AdminDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Link */}
        <Button variant="ghost" onClick={() => navigate("/admin/knowledge")}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Knowledge Browser
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Badge className="bg-purple-100 text-purple-700">
            {subConcept.breadcrumb.domain}
          </Badge>
          <span className="text-gray-400">→</span>
          <Badge className="bg-blue-100 text-blue-700">
            {subConcept.breadcrumb.concept}
          </Badge>
          <span className="text-gray-400">→</span>
          <Badge className="bg-green-100 text-green-700">
            {subConcept.breadcrumb.subconcept}
          </Badge>
        </div>

        {/* Header */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {subConcept.name}
            </h1>
            <div className="flex gap-2">
              <Badge variant="secondary" className="font-mono">
                {subConcept.code}
              </Badge>
              {subConcept.cuiCode && (
                <Badge className="bg-blue-100 text-blue-700">
                  UMLS: {subConcept.cuiCode}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-gray-600">{subConcept.description}</p>
        </div>

        {/* LOD Brief */}
        <div className="bg-parchment rounded-[--radius-xl] border border-[--border-light] p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Level of Detail Brief</h3>
          <p className="text-gray-700">{subConcept.lodBrief}</p>
        </div>

        {/* Teaching Chunks */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light]">
          <div className="p-6 border-b border-[--border-light]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="size-5 text-amber-600" />
                Teaching Chunks ({subConcept.teachingChunks.length})
              </h3>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {subConcept.teachingChunks.length > 0 ? (
              subConcept.teachingChunks.map((chunk) => (
                <div key={chunk.id} className="p-6">
                  <div className="flex gap-3">
                    {chunk.verified ? (
                      <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="size-5 text-gray-400 shrink-0 mt-0.5" />
                    )}
                    <p className="text-gray-700 line-clamp-2">{chunk.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <BookOpen className="size-12 mx-auto mb-4 text-gray-400" />
                <p>No teaching chunks linked yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Assessment Items */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light]">
          <div className="p-6 border-b border-[--border-light]">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="size-5 text-blue-600" />
              Assessment Items ({subConcept.assessmentItems.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {subConcept.assessmentItems.length > 0 ? (
              subConcept.assessmentItems.map((item) => (
                <div key={item.id} className="p-6">
                  <div className="flex gap-3">
                    <FileText className="size-5 text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-gray-700 line-clamp-2">{item.stem}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Target className="size-12 mx-auto mb-4 text-gray-400" />
                <p>No assessment items linked yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Student Learning Outcomes */}
        <div className="bg-white rounded-[--radius-xl] border border-[--border-light]">
          <div className="p-6 border-b border-[--border-light]">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600" />
              Student Learning Outcomes ({subConcept.slos.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {subConcept.slos.length > 0 ? (
              subConcept.slos.map((slo, index) => (
                <div key={slo.id} className="p-6">
                  <div className="flex gap-3">
                    <div className="size-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-medium shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{slo.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle2 className="size-12 mx-auto mb-4 text-gray-400" />
                <p>No SLOs linked yet</p>
              </div>
            )}
          </div>
        </div>

        {/* BKT Parameters */}
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <TrendingUp className="size-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">BKT Parameters</h3>
          <p className="text-sm text-gray-600">
            Available after measurement layer (T1-W12)
          </p>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}