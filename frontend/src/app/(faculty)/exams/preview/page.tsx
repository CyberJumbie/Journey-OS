'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, GripVertical, RefreshCcw, CheckCircle, AlertTriangle, Send, Lock, X, Search } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface ExamItem {
  id: string;
  position: number;
  stem_preview: string;
  bloom_level: string;
  usmle_system: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  critic_score: number;
}

interface ConstraintStatus {
  dimension: string;
  target: string;
  actual: string;
  satisfied: boolean;
}

const MOCK_ITEMS: ExamItem[] = [
  { id: 'ei1', position: 1, stem_preview: 'A 58-year-old man with a history of myocardial infarction presents with new-onset shortness of breath...', bloom_level: 'Apply', usmle_system: 'Cardiovascular', difficulty: 'Medium', critic_score: 0.92 },
  { id: 'ei2', position: 2, stem_preview: 'A 72-year-old woman on warfarin therapy presents with an INR of 5.8 and no active bleeding...', bloom_level: 'Analyze', usmle_system: 'Hematology', difficulty: 'Hard', critic_score: 0.88 },
  { id: 'ei3', position: 3, stem_preview: 'A 45-year-old woman with type 2 diabetes is started on an ACE inhibitor. Which lab test should be monitored...', bloom_level: 'Apply', usmle_system: 'Renal', difficulty: 'Easy', critic_score: 0.85 },
  { id: 'ei4', position: 4, stem_preview: 'A 32-year-old woman reports progressive ptosis and diplopia that worsens throughout the day...', bloom_level: 'Apply', usmle_system: 'Nervous System', difficulty: 'Medium', critic_score: 0.91 },
  { id: 'ei5', position: 5, stem_preview: 'A neonate born to a mother on labetalol during pregnancy presents with hypoglycemia and bradycardia...', bloom_level: 'Analyze', usmle_system: 'Cardiovascular', difficulty: 'Hard', critic_score: 0.89 },
  { id: 'ei6', position: 6, stem_preview: 'A patient with pheochromocytoma is started on a beta-blocker without prior alpha-blockade...', bloom_level: 'Apply', usmle_system: 'Endocrine', difficulty: 'Medium', critic_score: 0.86 },
  { id: 'ei7', position: 7, stem_preview: 'A 68-year-old man with COPD and heart failure requires antihypertensive therapy. Which beta-blocker is preferred...', bloom_level: 'Apply', usmle_system: 'Respiratory', difficulty: 'Medium', critic_score: 0.83 },
  { id: 'ei8', position: 8, stem_preview: 'A 55-year-old man with chronic kidney disease has a potassium level of 6.2 mEq/L. ECG shows peaked T waves...', bloom_level: 'Apply', usmle_system: 'Renal', difficulty: 'Hard', critic_score: 0.90 },
];

const MOCK_CONSTRAINTS: ConstraintStatus[] = [
  { dimension: 'Total Questions', target: '8', actual: '8', satisfied: true },
  { dimension: 'Min Critic Score', target: '\u2265 0.70', actual: '0.83', satisfied: true },
  { dimension: 'Bloom: Apply', target: '60%', actual: '62.5%', satisfied: true },
  { dimension: 'Bloom: Analyze', target: '25%', actual: '25%', satisfied: true },
  { dimension: 'Difficulty: Easy', target: '15%', actual: '12.5%', satisfied: true },
  { dimension: 'Difficulty: Medium', target: '50%', actual: '50%', satisfied: true },
  { dimension: 'Difficulty: Hard', target: '35%', actual: '37.5%', satisfied: true },
  { dimension: 'MIP Status', target: 'Optimal', actual: 'Optimal', satisfied: true },
];

const MOCK_SWAP_CANDIDATES: ExamItem[] = [
  { id: 'sc1', position: 0, stem_preview: 'A 64-year-old man with stable angina undergoes a stress test. Which finding would most likely indicate three-vessel coronary artery disease?', bloom_level: 'Apply', usmle_system: 'Cardiovascular', difficulty: 'Medium', critic_score: 0.91 },
  { id: 'sc2', position: 0, stem_preview: 'A 50-year-old woman with mitral valve prolapse develops acute mitral regurgitation following chordae tendinae rupture. Which hemodynamic change is expected?', bloom_level: 'Apply', usmle_system: 'Cardiovascular', difficulty: 'Hard', critic_score: 0.87 },
  { id: 'sc3', position: 0, stem_preview: 'A 40-year-old man presents with exertional dyspnea and a harsh systolic murmur that decreases with squatting. Which condition is most likely?', bloom_level: 'Apply', usmle_system: 'Cardiovascular', difficulty: 'Medium', critic_score: 0.89 },
  { id: 'sc4', position: 0, stem_preview: 'A 75-year-old woman on digoxin therapy develops nausea, visual disturbances, and a ventricular rate of 45 bpm. What is the most appropriate intervention?', bloom_level: 'Analyze', usmle_system: 'Cardiovascular', difficulty: 'Hard', critic_score: 0.93 },
  { id: 'sc5', position: 0, stem_preview: 'A 28-year-old athlete collapses during a basketball game. Autopsy reveals asymmetric septal hypertrophy. Which genetic mutation is most commonly associated?', bloom_level: 'Apply', usmle_system: 'Cardiovascular', difficulty: 'Medium', critic_score: 0.84 },
];

function getSwapCandidates(item: ExamItem): ExamItem[] {
  return MOCK_SWAP_CANDIDATES.filter(
    c => c.bloom_level === item.bloom_level || c.usmle_system === item.usmle_system
  ).slice(0, 5);
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
      <div style={{ width: 28, height: 16, background: C.borderLight, borderRadius: 4 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '85%', height: 14, background: C.borderLight, borderRadius: 4, marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 52, height: 18, background: C.borderLight, borderRadius: 4 }} />
          <div style={{ width: 72, height: 18, background: C.borderLight, borderRadius: 4 }} />
          <div style={{ width: 48, height: 18, background: C.borderLight, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

// Swap Question Modal
function SwapQuestionModal({ item, onSwap, onClose }: { item: ExamItem; onSwap: (newItem: ExamItem) => void; onClose: () => void }) {
  const [candidates, setCandidates] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);

  const diffColor = (d: ExamItem['difficulty']) => d === 'Easy' ? C.green : d === 'Medium' ? C.warning : C.error;

  useEffect(() => {
    setLoading(true); setSelected(null);
    const timer = setTimeout(() => { setCandidates(getSwapCandidates(item)); setLoading(false); }, 400);
    return () => clearTimeout(timer);
  }, [item.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleConfirmSwap = () => {
    const candidate = candidates.find(c => c.id === selected);
    if (!candidate) return;
    setSwapping(true);
    setTimeout(() => { onSwap(candidate); }, 300);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,44,118,0.18)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'swapFadeIn 0.15s ease' }}>
      <style>{`@keyframes swapFadeIn { from { opacity: 0 } to { opacity: 1 } } @keyframes swapSlideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 16, width: '95%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,44,118,0.12), 0 4px 12px rgba(0,0,0,0.06)', animation: 'swapSlideUp 0.2s ease', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, margin: '0 0 6px' }}>Swap Question &mdash; Position {item.position}</h3>
            <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.4 }}>
              Select a blueprint-compatible alternative matching <strong>{item.bloom_level}</strong> + <strong>{item.usmle_system}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, color: C.textMuted, flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>
        {/* Current item */}
        <div style={{ padding: '12px 24px', background: C.cream, borderBottom: `1px solid ${C.borderLight}` }}>
          <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, margin: '0 0 6px' }}>Current Question</p>
          <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>{item.stem_preview}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: sans, background: C.borderLight, color: C.textMuted }}>{item.bloom_level}</span>
            <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: sans, background: C.borderLight, color: C.textMuted }}>{item.usmle_system}</span>
            <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: sans, background: C.borderLight, color: C.textMuted }}>{item.difficulty}</span>
            <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: sans, background: C.borderLight, color: C.textMuted }}>Critic: {item.critic_score.toFixed(2)}</span>
          </div>
        </div>
        {/* Candidates */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, padding: '14px 24px 8px', margin: 0 }}>
            {loading ? 'Loading alternatives...' : `${candidates.length} Alternative${candidates.length !== 1 ? 's' : ''} Found`}
          </p>
          {loading && <div><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>}
          {!loading && candidates.length === 0 && (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <Search size={28} style={{ color: C.textMuted, opacity: 0.4, marginBottom: 8 }} />
              <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, lineHeight: 1.5, margin: 0 }}>No compatible alternatives found for this item.</p>
            </div>
          )}
          {!loading && candidates.map(c => {
            const isSelected = selected === c.id;
            return (
              <button key={c.id} onClick={() => setSelected(c.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: '14px 24px', textAlign: 'left', background: isSelected ? `${C.blue}08` : 'transparent', borderTop: 'none', borderRight: 'none', borderLeft: isSelected ? `3px solid ${C.blue}` : '3px solid transparent', borderBottom: `1px solid ${C.borderLight}`, cursor: 'pointer', transition: 'all 0.12s ease' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: isSelected ? `5px solid ${C.blue}` : `2px solid ${C.warmGray}`, transition: 'border 0.15s ease' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.5 }}>{c.stem_preview}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: sans, background: C.cream, color: C.textSecondary }}>{c.bloom_level}</span>
                    <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: sans, background: C.cream, color: C.textSecondary }}>{c.usmle_system}</span>
                    <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: sans, background: `${diffColor(c.difficulty)}12`, color: diffColor(c.difficulty) }}>{c.difficulty}</span>
                    <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, fontFamily: sans, background: C.cream, color: C.textSecondary }}>Critic: {c.critic_score.toFixed(2)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, fontFamily: sans, fontSize: 13, background: C.white, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleConfirmSwap} disabled={!selected || swapping} style={{ padding: '10px 20px', borderRadius: 8, fontFamily: sans, fontSize: 13, fontWeight: 600, background: selected && !swapping ? C.navyDeep : C.warmGray, color: C.white, border: 'none', cursor: selected && !swapping ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s ease' }}>
            {swapping ? (
              <><svg width="14" height="14" viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="30" strokeLinecap="round" /></svg> Swapping...</>
            ) : (
              <><RefreshCcw size={14} /> Confirm Swap</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExamPreview() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [items, setItems] = useState<ExamItem[]>([]);
  const [constraints, setConstraints] = useState<ConstraintStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [swapTarget, setSwapTarget] = useState<ExamItem | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      setItems(MOCK_ITEMS);
      setConstraints(MOCK_CONSTRAINTS);
      setLoading(false);
    })();
  }, [id]);

  const allSatisfied = constraints.every(c => c.satisfied);

  const handleFinalize = () => {
    setShowFinalizeModal(false);
    router.push(`/exams/${id}/assign`);
  };

  const diffColor = (d: ExamItem['difficulty']) => d === 'Easy' ? C.green : d === 'Medium' ? C.warning : C.error;

  return (
    <>
      <button onClick={() => router.push('/exams/assembly')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0, border: 'none', background: 'transparent', color: C.blue, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Back to Exam Builder
      </button>

      {loading && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <p style={{ fontFamily: sans, color: C.textMuted }}>Loading exam...</p>
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  <GripVertical size={16} style={{ color: C.warmGray, flexShrink: 0, cursor: 'grab' }} />
                  <div style={{ fontFamily: sans, fontSize: 16, color: C.textMuted, width: 28, flexShrink: 0 }}>Q{item.position}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.stem_preview}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: sans, background: C.cream, color: C.textSecondary }}>{item.bloom_level}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: sans, background: C.cream, color: C.textSecondary }}>{item.usmle_system}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: sans, background: `${diffColor(item.difficulty)}12`, color: diffColor(item.difficulty) }}>{item.difficulty}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: sans, background: C.cream, color: C.textSecondary }}>Critic: {item.critic_score.toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={() => setSwapTarget(item)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, color: C.blue, fontFamily: sans, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                    <RefreshCcw size={12} /> Swap
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 300, flexShrink: 0, alignSelf: 'flex-start' }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontFamily: serif, fontSize: 16, color: C.textPrimary, margin: '0 0 16px' }}>Blueprint Constraints</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {constraints.map(c => (
                  <div key={c.dimension} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontFamily: sans, fontSize: 13, color: C.textPrimary }}>{c.dimension}</div>
                      <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{c.target} &rarr; {c.actual}</div>
                    </div>
                    {c.satisfied ? <CheckCircle size={16} style={{ color: C.green }} /> : <AlertTriangle size={16} style={{ color: C.warning }} />}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setShowFinalizeModal(true)} disabled={!allSatisfied} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: allSatisfied ? C.green : C.warmGray, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, cursor: allSatisfied ? 'pointer' : 'not-allowed' }}>
              {allSatisfied ? <><Send size={16} /> Finalize Exam</> : <><Lock size={16} /> Constraints Not Met</>}
            </button>
          </div>
        </div>
      )}

      {swapTarget && (
        <SwapQuestionModal
          item={swapTarget}
          onSwap={(newItem) => { setItems(prev => prev.map(it => it.id === swapTarget.id ? { ...newItem, position: swapTarget.position } : it)); setSwapTarget(null); }}
          onClose={() => setSwapTarget(null)}
        />
      )}

      {showFinalizeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.white, borderRadius: 16, padding: 32, maxWidth: 440, width: '90%' }}>
            <h3 style={{ fontFamily: serif, fontSize: 20, color: C.textPrimary, marginBottom: 12 }}>Finalize Exam?</h3>
            <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 24 }}>
              This exam will be published and cannot be modified after assignment. You can still assign it to students after finalizing.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFinalizeModal(false)} style={{ padding: '10px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.textSecondary, fontFamily: sans, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleFinalize} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: C.green, color: C.white, fontFamily: sans, cursor: 'pointer' }}>Finalize &amp; Publish</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
