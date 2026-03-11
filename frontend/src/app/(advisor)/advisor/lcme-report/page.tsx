'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Download, RefreshCw, AlertCircle, CheckCircle2,
  Loader2, Edit3, Copy, ChevronDown, ChevronUp,
} from 'lucide-react';
import { C, sans, mono, ProgressBar } from '@/lib/design-tokens';

interface LCMEStandard {
  id: string; code: string; title: string;
  status: 'not_started' | 'generating' | 'generated' | 'reviewed';
  narrative: string | null; evidence_count: number; compliance_pct: number;
}

const MOCK_STANDARDS: LCMEStandard[] = [
  { id: 'std1', code: 'ED-2', title: 'Curricular Design, Review, Revision and Evaluation', status: 'generated', evidence_count: 42, compliance_pct: 78, narrative: 'The institution provides evidence of a robust curriculum design process through its implementation of Journey OS, which enables systematic mapping of learning objectives to USMLE content areas. As of March 2026, 78% of required competencies have been mapped with verified assessment items. The Pharmacology department demonstrates particularly strong coverage (85%) through 156 approved items mapped across 12 organ systems. Faculty engage in regular item quality review through the integrated critic scoring system, with an average quality score of 0.84. Areas identified for improvement include cardiovascular pharmacology coverage, which currently stands at 62% and is being addressed through targeted item generation initiatives.' },
  { id: 'std2', code: 'ED-5-A', title: 'Faculty Sufficiency', status: 'generated', evidence_count: 18, compliance_pct: 85, narrative: 'The institution maintains adequate faculty resources to deliver and assess curriculum content. Currently, 8 faculty members actively contribute to the item bank across 4 core departments. Faculty workload analysis through the generation analytics system indicates balanced distribution of item authoring responsibilities, with no individual faculty member responsible for more than 25% of total items. The automated quality assurance system (critic scoring) has reduced manual review burden by an estimated 40%, allowing faculty to focus on higher-order pedagogical activities.' },
  { id: 'std3', code: 'ED-11', title: 'Academic Advising', status: 'not_started', evidence_count: 8, compliance_pct: 52, narrative: null },
  { id: 'std4', code: 'ED-19-A', title: 'Formative Assessment and Feedback', status: 'not_started', evidence_count: 31, compliance_pct: 68, narrative: null },
  { id: 'std5', code: 'ED-30', title: 'Curriculum Management', status: 'reviewed', evidence_count: 56, compliance_pct: 91, narrative: 'The institution demonstrates exemplary curriculum management practices through systematic use of the Journey OS platform. All learning objectives are digitally cataloged and linked to national standards (USMLE Step 1 content outline) via the SLO-ILO-USMLE mapping pipeline. Coverage gap detection is automated, with weekly pipeline runs identifying areas where assessment item density falls below threshold.' },
  { id: 'std6', code: 'ED-46', title: 'Student Assessment and Grading', status: 'not_started', evidence_count: 22, compliance_pct: 63, narrative: null },
];

function StatusIcon({ status }: { status: LCMEStandard['status'] }) {
  if (status === 'reviewed') return <CheckCircle2 size={20} style={{ color: C.green, flexShrink: 0 }} />;
  if (status === 'generated') return <FileText size={20} style={{ color: C.blue, flexShrink: 0 }} />;
  if (status === 'generating') return <Loader2 size={20} style={{ color: C.blue, flexShrink: 0, animation: 'spin 1s linear infinite' }} />;
  return <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${C.borderLight}`, flexShrink: 0 }} />;
}

function StatusBadge({ status }: { status: LCMEStandard['status'] }) {
  const config = {
    not_started: { bg: `${C.warmGray}60`, color: C.textMuted, label: 'Not Started' },
    generating:  { bg: `${C.blue}10`, color: C.blue, label: 'Generating...' },
    generated:   { bg: `${C.blue}12`, color: C.blue, label: 'Draft Ready' },
    reviewed:    { bg: `${C.green}12`, color: C.green, label: 'Reviewed' },
  }[status];
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontFamily: mono, fontSize: 10, fontWeight: 600, background: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: sans, fontSize: 22, fontWeight: 700, color: highlight ? C.green : C.textPrimary, margin: 0 }}>{value}</p>
    </div>
  );
}

export default function AdvisorLCMEReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [standards, setStandards] = useState<LCMEStandard[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(false);
      await new Promise((r) => setTimeout(r, 600));
      setStandards(MOCK_STANDARDS); setLoading(false);
    })();
  }, []);

  const handleGenerate = async (standardId: string) => {
    setGeneratingId(standardId);
    await new Promise((r) => setTimeout(r, 3000));
    setStandards((prev) =>
      prev.map((s) =>
        s.id === standardId
          ? { ...s, status: 'generated' as const, narrative: `The institution provides evidence that ${s.title.toLowerCase()} standards are being met through systematic curriculum management and assessment practices facilitated by the Journey OS platform. Based on ${s.evidence_count} evidence artifacts collected across the current academic year, the institution demonstrates a ${s.compliance_pct}% compliance rate with this standard.` }
          : s
      )
    );
    setGeneratingId(null);
    setExpandedId(standardId);
  };

  const handleMarkReviewed = (standardId: string) => {
    setStandards((prev) => prev.map((s) => (s.id === standardId ? { ...s, status: 'reviewed' as const } : s)));
  };

  const generatedCount = standards.filter((s) => s.status === 'generated' || s.status === 'reviewed').length;
  const reviewedCount = standards.filter((s) => s.status === 'reviewed').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: 80, background: C.warmGray, borderRadius: 10, opacity: 0.4 }} className="animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
        <AlertCircle size={32} style={{ color: C.error }} />
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textPrimary }}>Couldn&apos;t load LCME standards.</p>
        <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontFamily: sans, fontSize: 14, cursor: 'pointer', color: C.textPrimary }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: C.navyDeep, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}>
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        <SummaryCard label="Standards" value={standards.length} />
        <SummaryCard label="Narratives Generated" value={`${generatedCount}/${standards.length}`} />
        <SummaryCard label="Reviewed & Final" value={reviewedCount} highlight={reviewedCount === standards.length} />
        <SummaryCard label="Avg Compliance" value={`${Math.round(standards.reduce((a, s) => a + s.compliance_pct, 0) / standards.length)}%`} />
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: `${C.blue}06`, border: `1px solid ${C.blue}20`, borderRadius: 10, marginBottom: 24 }}>
        <FileText size={18} style={{ color: C.blue, flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: 0, marginBottom: 4 }}>How this works</p>
          <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, lineHeight: 1.5, margin: 0 }}>
            Click &quot;Generate Narrative&quot; on any standard to have Claude (Sonnet) write formal accreditation prose
            from your current evidence chain data. Each narrative is a draft -- review and edit before finalizing.
          </p>
        </div>
      </div>

      {/* Standards list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {standards.map((std) => {
          const isExpanded = expandedId === std.id;
          const isGenerating = generatingId === std.id;
          return (
            <div key={std.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div onClick={() => setExpandedId(isExpanded ? null : std.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer' }}>
                <StatusIcon status={std.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: C.navyDeep }}>{std.code}</span>
                    <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{std.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                    <span style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{std.evidence_count} evidence artifacts</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 100 }}>
                      <ProgressBar value={std.compliance_pct} max={100} height={4} />
                      <span style={{ fontFamily: mono, fontSize: 11, color: C.textSecondary }}>{std.compliance_pct}%</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusBadge status={std.status} />
                  {isExpanded ? <ChevronUp size={16} style={{ color: C.textMuted }} /> : <ChevronDown size={16} style={{ color: C.textMuted }} />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: `1px solid ${C.borderLight}`, padding: '20px 24px' }}>
                  {std.narrative ? (
                    <>
                      <div style={{ background: C.cream, borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
                        <p style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{std.narrative}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontFamily: sans, fontSize: 13, cursor: 'pointer', color: C.textSecondary }}>
                          <Edit3 size={13} /> Edit
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(std.narrative || '')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontFamily: sans, fontSize: 13, cursor: 'pointer', color: C.textSecondary }}>
                          <Copy size={13} /> Copy
                        </button>
                        <button onClick={() => handleGenerate(std.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontFamily: sans, fontSize: 13, cursor: 'pointer', color: C.textSecondary }}>
                          <RefreshCw size={13} /> Regenerate
                        </button>
                        {std.status !== 'reviewed' && (
                          <button onClick={() => handleMarkReviewed(std.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: 8, background: C.green, fontFamily: sans, fontSize: 13, cursor: 'pointer', color: C.white }}>
                            <CheckCircle2 size={13} /> Mark as Reviewed
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32 }}>
                      {isGenerating ? (
                        <>
                          <Loader2 size={28} style={{ color: C.blue, animation: 'spin 1s linear infinite' }} />
                          <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>Claude is generating narrative from {std.evidence_count} evidence artifacts...</p>
                          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </>
                      ) : (
                        <>
                          <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>No narrative generated yet for this standard.</p>
                          <button onClick={() => handleGenerate(std.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: C.navyDeep, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}>
                            <FileText size={14} /> Generate Narrative
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
