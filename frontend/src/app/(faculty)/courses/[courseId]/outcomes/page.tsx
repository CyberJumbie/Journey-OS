'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, XCircle, Search, RefreshCw, Zap } from 'lucide-react';

type ConceptStatus = 'unverified' | 'verified' | 'rejected';

interface SubConcept {
  id: string;
  name: string;
  usmle_system: string;
  confidence: number;
  status: ConceptStatus;
}

const MOCK_CONCEPTS: SubConcept[] = [
  { id: 'sc1', name: 'Beta-Adrenergic Receptor Antagonism', usmle_system: 'Cardiovascular', confidence: 0.94, status: 'verified' },
  { id: 'sc2', name: 'Renin-Angiotensin-Aldosterone System', usmle_system: 'Cardiovascular', confidence: 0.91, status: 'verified' },
  { id: 'sc3', name: 'Cardiac Ion Channel Physiology', usmle_system: 'Cardiovascular', confidence: 0.87, status: 'unverified' },
  { id: 'sc4', name: 'Myocardial Oxygen Demand', usmle_system: 'Cardiovascular', confidence: 0.82, status: 'unverified' },
  { id: 'sc5', name: 'Platelet Aggregation Pathways', usmle_system: 'Hematology', confidence: 0.78, status: 'unverified' },
  { id: 'sc6', name: 'Baroreceptor Reflex Arc', usmle_system: 'Cardiovascular', confidence: 0.72, status: 'unverified' },
  { id: 'sc7', name: 'Diuretic Mechanism: Loop of Henle', usmle_system: 'Renal', confidence: 0.65, status: 'unverified' },
  { id: 'sc8', name: 'Prostaglandin Synthesis Inhibition', usmle_system: 'Musculoskeletal', confidence: 0.58, status: 'rejected' },
  { id: 'sc9', name: 'Endothelin Receptor Signaling', usmle_system: 'Cardiovascular', confidence: 0.42, status: 'unverified' },
  { id: 'sc10', name: 'Nitric Oxide Vasodilation', usmle_system: 'Cardiovascular', confidence: 0.89, status: 'verified' },
];

const STATUS_COLORS: Record<ConceptStatus, string> = {
  unverified: 'bg-gray-500/10 text-gray-500',
  verified: 'bg-green-500/10 text-green-600',
  rejected: 'bg-red-500/10 text-red-600',
};

const STATUS_DOT_COLORS: Record<ConceptStatus, string> = {
  unverified: 'bg-gray-400',
  verified: 'bg-green-500',
  rejected: 'bg-red-500',
};

export default function ConceptReview() {
  const { courseId } = useParams();
  const router = useRouter();
  const [concepts, setConcepts] = useState<SubConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 600));
      setConcepts(MOCK_CONCEPTS);
      setLoading(false);
    })();
  }, [courseId]);

  const updateStatus = (id: string, status: ConceptStatus) => {
    setConcepts((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const bulkVerifyHighConfidence = () => {
    setConcepts((prev) =>
      prev.map((c) =>
        c.status === 'unverified' && c.confidence >= 0.85 ? { ...c, status: 'verified' } : c
      )
    );
  };

  const bulkRejectLowConfidence = () => {
    setConcepts((prev) =>
      prev.map((c) =>
        c.status === 'unverified' && c.confidence < 0.5 ? { ...c, status: 'rejected' } : c
      )
    );
  };

  const filtered = concepts.filter(
    (c) =>
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.usmle_system.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verified = concepts.filter((c) => c.status === 'verified').length;
  const pending = concepts.filter((c) => c.status === 'unverified').length;
  const rejected = concepts.filter((c) => c.status === 'rejected').length;

  const confidenceColor = (v: number) =>
    v >= 0.85 ? 'text-green-600' : v >= 0.5 ? 'text-amber-500' : 'text-red-500';

  return (
    <>
      {/* Back */}
      <button
        onClick={() => router.push(`/courses/${courseId}`)}
        className="flex items-center gap-1.5 mb-5 p-0 border-none bg-transparent text-[var(--blue)] font-sans text-sm cursor-pointer hover:underline"
      >
        <ArrowLeft size={16} /> Back to Course
      </button>

      {/* Progress bar */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-5 mb-6">
        <div className="flex gap-8 mb-4">
          <div>
            <span className="text-2xl text-green-600">{verified}</span>
            <span className="text-sm text-gray-500 ml-1.5">Verified</span>
          </div>
          <div>
            <span className="text-2xl text-amber-500">{pending}</span>
            <span className="text-sm text-gray-500 ml-1.5">Pending</span>
          </div>
          <div>
            <span className="text-2xl text-red-500">{rejected}</span>
            <span className="text-sm text-gray-500 ml-1.5">Rejected</span>
          </div>
        </div>
        <div className="h-1.5 bg-[var(--cream)] rounded-sm overflow-hidden flex">
          <div
            className="bg-green-500 transition-[width] duration-300"
            style={{ width: `${concepts.length ? (verified / concepts.length) * 100 : 0}%` }}
          />
          <div
            className="bg-red-500 transition-[width] duration-300"
            style={{ width: `${concepts.length ? (rejected / concepts.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts..."
            className="pl-9"
          />
        </div>
        <Button onClick={bulkVerifyHighConfidence} className="bg-green-600 hover:bg-green-700 text-white">
          <Zap size={14} className="mr-1.5" /> Verify All High-Confidence (&ge;0.85)
        </Button>
        <Button
          variant="outline"
          onClick={bulkRejectLowConfidence}
          className="text-red-500 border-red-200 hover:bg-red-50"
        >
          Reject All Low-Confidence (&lt;0.50)
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <RefreshCw size={32} className="text-[var(--blue)] animate-spin mx-auto" />
          <p className="text-gray-500 mt-4 font-sans">Loading concepts...</p>
        </div>
      )}

      {/* Concept list */}
      {!loading && (
        <div className="flex flex-col gap-2">
          {filtered.map((concept) => (
            <div
              key={concept.id}
              className="flex items-center gap-4 px-5 py-3.5 bg-white border border-[var(--border)] rounded-lg flex-wrap"
            >
              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[concept.status]}`} />

              {/* Info */}
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm text-gray-900">{concept.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{concept.usmle_system}</div>
              </div>

              {/* Confidence */}
              <div className="text-center min-w-[80px]">
                <div className="text-xs text-gray-500">Confidence</div>
                <div className={`text-sm ${confidenceColor(concept.confidence)}`}>
                  {(concept.confidence * 100).toFixed(0)}%
                </div>
              </div>

              {/* Status badge */}
              <span
                className={`px-3 py-1 rounded-xl text-xs capitalize ${STATUS_COLORS[concept.status]}`}
              >
                {concept.status}
              </span>

              {/* Actions */}
              {concept.status === 'unverified' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(concept.id, 'verified')}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    <CheckCircle size={12} className="mr-1" /> Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(concept.id, 'rejected')}
                    className="text-red-500 border-red-300 hover:bg-red-50 text-xs"
                  >
                    <XCircle size={12} className="mr-1" /> Reject
                  </Button>
                </div>
              )}
              {concept.status !== 'unverified' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(concept.id, 'unverified')}
                  className="text-xs text-gray-500"
                >
                  Reset
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
