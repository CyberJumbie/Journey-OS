import { useNavigate } from "react-router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Target,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

interface Chunk {
  id: string;
  text: string;
  slideNumber: number;
}

interface Slide {
  id: string;
  number: number;
  title: string;
  chunks: Chunk[];
}

export default function LectureProcessing() {
  const navigate = useNavigate();
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set([1]));

  const lecture = {
    name: "Acute Myocardial Infarction",
    totalSlides: 45,
    totalChunks: 156,
    extractedSubConcepts: 23,
  };

  const slides: Slide[] = [
    {
      id: "s1",
      number: 1,
      title: "Learning Objectives",
      chunks: [
        {
          id: "c1",
          text: "By the end of this lecture, students will be able to: 1. Correlate ECG findings with coronary anatomy 2. Describe pathophysiology of STEMI...",
          slideNumber: 1,
        },
      ],
    },
    {
      id: "s2",
      number: 2,
      title: "Coronary Anatomy Review",
      chunks: [
        {
          id: "c2",
          text: "The right coronary artery (RCA) supplies the inferior wall of the left ventricle in 85% of patients with right-dominant circulation...",
          slideNumber: 2,
        },
        {
          id: "c3",
          text: "The left anterior descending (LAD) artery supplies the anterior wall and septum...",
          slideNumber: 2,
        },
      ],
    },
  ];

  const toggleSlide = (slideNumber: number) => {
    const newExpanded = new Set(expandedSlides);
    if (newExpanded.has(slideNumber)) {
      newExpanded.delete(slideNumber);
    } else {
      newExpanded.add(slideNumber);
    }
    setExpandedSlides(newExpanded);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lecture Processing Complete</h1>
          <p className="text-gray-600 mt-1">{lecture.name}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Slides</div>
            <div className="text-3xl font-bold text-gray-900">{lecture.totalSlides}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Content Chunks</div>
            <div className="text-3xl font-bold text-blue-600">{lecture.totalChunks}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">SubConcepts Extracted</div>
            <div className="text-3xl font-bold text-purple-600">{lecture.extractedSubConcepts}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
            <Button onClick={() => navigate("/courses/subconcept-review")}>
              <Target className="size-4 mr-2" />
              Review SubConcepts
            </Button>
          </div>
        </div>

        {/* Slide List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Parsed Slides & Chunks</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {slides.map((slide) => (
              <div key={slide.id}>
                <button
                  onClick={() => toggleSlide(slide.number)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {expandedSlides.has(slide.number) ? (
                      <ChevronDown className="size-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="size-5 text-gray-600" />
                    )}
                    <FileText className="size-5 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Slide {slide.number}</div>
                      <div className="text-sm text-gray-600">{slide.title}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{slide.chunks.length} chunks</Badge>
                </button>

                {expandedSlides.has(slide.number) && (
                  <div className="px-6 pb-6 space-y-3">
                    {slide.chunks.map((chunk, index) => (
                      <div key={chunk.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Badge variant="secondary">Chunk {index + 1}</Badge>
                          <p className="text-sm text-gray-900 flex-1">{chunk.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Next Steps</h3>
          <p className="text-sm text-blue-800 mb-4">
            Review the {lecture.extractedSubConcepts} SubConcepts extracted from this lecture. Approve or edit them before generating questions.
          </p>
          <Button onClick={() => navigate("/courses/subconcept-review")}>
            Review SubConcepts
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
