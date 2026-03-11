'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Crosshair, Zap, AlertTriangle, Target } from 'lucide-react';
import { C, sans, serif } from '@/lib/design-tokens';

interface CoverageGap {
  id: string;
  system: string;
  discipline: string;
  current_count: number;
  target_count: number;
  exam_frequency: number;
  severity: 'true_gap' | 'below_target';
  top_subconcepts: string[];
}

const MOCK_GAPS: CoverageGap[] = [
  { id: 'g1', system: 'Renal', discipline: 'Pathology', current_count: 0, target_count: 8, exam_frequency: 0.92, severity: 'true_gap', top_subconcepts: ['Acute Kidney Injury', 'Chronic Kidney Disease Staging', 'Nephrotic vs Nephritic Syndrome'] },
  { id: 'g2', system: 'Endocrine', discipline: 'Pharmacology', current_count: 0, target_count: 10, exam_frequency: 0.88, severity: 'true_gap', top_subconcepts: ['Insulin Analogs', 'Thyroid Replacement', 'Adrenal Corticosteroids'] },
  { id: 'g3', system: 'Nervous System', discipline: 'Pathology', current_count: 0, target_count: 8, exam_frequency: 0.85, severity: 'true_gap', top_subconcepts: ['Stroke Subtypes', 'Demyelinating Diseases', 'Seizure Classification'] },
  { id: 'g4', system: 'Gastrointestinal', discipline: 'Anatomy', current_count: 0, target_count: 6, exam_frequency: 0.78, severity: 'true_gap', top_subconcepts: ['Peritoneal Reflections', 'Portal Venous Drainage', 'Biliary Anatomy'] },
  { id: 'g5', system: 'Cardiovascular', discipline: 'Biochemistry', current_count: 2, target_count: 8, exam_frequency: 0.9, severity: 'below_target', top_subconcepts: ['Lipid Metabolism', 'Atherosclerosis Pathogenesis', 'Cardiac Biomarkers'] },
  { id: 'g6', system: 'Respiratory', discipline: 'Physiology', current_count: 3, target_count: 10, exam_frequency: 0.82, severity: 'below_target', top_subconcepts: ['V/Q Mismatch', 'Oxygen Dissociation Curve', 'Surfactant Physiology'] },
  { id: 'g7', system: 'Immune System', discipline: 'Microbiology', current_count: 1, target_count: 8, exam_frequency: 0.75, severity: 'below_target', top_subconcepts: ['Hypersensitivity Reactions', 'Complement Pathways', 'Autoimmune Mechanisms'] },
  { id: 'g8', system: 'Reproductive', discipline: 'Pharmacology', current_count: 0, target_count: 6, exam_frequency: 0.65, severity: 'true_gap', top_subconcepts: ['Contraceptive Mechanisms', 'Tocolytics', 'HPV Vaccination'] },
];

export default function GapPriorities() {
  const router = useRouter();
  const [gaps, setGaps] = useState<CoverageGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemFilter, setSystemFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      setGaps(MOCK_GAPS.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'true_gap' ? -1 : 1;
        return b.exam_frequency - a.exam_frequency;
      }));
      setLoading(false);
    })();
  }, []);

  const systems = [...new Set(MOCK_GAPS.map(g => g.system))];
  const filtered = gaps.filter(g => systemFilter === 'all' || g.system === systemFilter);
  const trueGaps = filtered.filter(g => g.severity === 'true_gap');
  const belowTarget = filtered.filter(g => g.severity === 'below_target');

  return (
    <>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={systemFilter} onChange={e => setSystemFilter(e.target.value)} style={{ padding: '8px 28px 8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 13, background: C.white }}>
          <option value="all">All USMLE Systems</option>
          {systems.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {trueGaps.length >= 5 && (
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', marginLeft: 'auto', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}>
            <Zap size={14} /> Fill Top 5 Gaps
          </button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <RefreshCw size={32} style={{ color: C.blue, animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: sans, color: C.textMuted, marginTop: 16 }}>Analyzing coverage gaps...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Target size={48} style={{ color: C.green, marginBottom: 16 }} />
          <p style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, marginBottom: 8 }}>No gaps detected!</p>
          <p style={{ fontFamily: sans, color: C.textMuted }}>All cells have coverage. Check the heatmap for distribution details.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {trueGaps.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <AlertTriangle size={18} style={{ color: C.error }} />
                <h3 style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, margin: 0 }}>True Gaps (0 items)</h3>
                <span style={{ fontFamily: sans, fontSize: 13, color: C.error, background: `${C.error}12`, padding: '2px 10px', borderRadius: 10 }}>{trueGaps.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {trueGaps.map((gap, idx) => (
                  <div key={gap.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: sans, fontSize: 20, color: C.error, width: 32, textAlign: 'center', flexShrink: 0 }}>#{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontFamily: serif, fontSize: 15, color: C.textPrimary }}>{gap.system} &mdash; {gap.discipline}</div>
                      <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, marginTop: 4 }}>Top SubConcepts: {gap.top_subconcepts.join(', ')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>Current</div>
                        <div style={{ fontFamily: sans, fontSize: 18, color: C.error }}>{gap.current_count}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>Target</div>
                        <div style={{ fontFamily: sans, fontSize: 18, color: C.textPrimary }}>{gap.target_count}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>Exam Freq</div>
                        <div style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>{(gap.exam_frequency * 100).toFixed(0)}%</div>
                      </div>
                      <button onClick={() => router.push('/generation')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <Crosshair size={14} /> Generate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {belowTarget.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Target size={18} style={{ color: C.warning }} />
                <h3 style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, margin: 0 }}>Below Target</h3>
                <span style={{ fontFamily: sans, fontSize: 13, color: C.warning, background: `${C.warning}16`, padding: '2px 10px', borderRadius: 10 }}>{belowTarget.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {belowTarget.map(gap => (
                  <div key={gap.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontFamily: serif, fontSize: 15, color: C.textPrimary }}>{gap.system} &mdash; {gap.discipline}</div>
                      <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, marginTop: 4 }}>{gap.top_subconcepts.join(', ')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>Current</div>
                        <div style={{ fontFamily: sans, fontSize: 18, color: C.warning }}>{gap.current_count}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>Target</div>
                        <div style={{ fontFamily: sans, fontSize: 18, color: C.textPrimary }}>{gap.target_count}</div>
                      </div>
                      <button onClick={() => router.push('/generation')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.parchment, color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <Crosshair size={14} /> Generate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
