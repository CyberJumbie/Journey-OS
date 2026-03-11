'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Crosshair, X } from 'lucide-react';
import { C, sans, serif } from '@/lib/design-tokens';

const SYSTEMS = [
  'General Principles', 'Blood & Lymph', 'Nervous System', 'Musculoskeletal',
  'Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Renal',
  'Reproductive', 'Endocrine', 'Immune System', 'Multisystem',
  'Biostatistics', 'Behavioral Science', 'Aging', 'Skin & Subcutaneous',
];

const DISCIPLINES = [
  'Anatomy', 'Biochemistry', 'Microbiology', 'Pathology',
  'Pharmacology', 'Physiology', 'Behavioral',
];

function generateMockData(): number[][] {
  const data: number[][] = [];
  for (let s = 0; s < SYSTEMS.length; s++) {
    const row: number[] = [];
    for (let d = 0; d < DISCIPLINES.length; d++) {
      const rand = Math.random();
      if (rand < 0.15) row.push(0);
      else if (rand < 0.35) row.push(Math.floor(Math.random() * 3) + 1);
      else if (rand < 0.65) row.push(Math.floor(Math.random() * 6) + 4);
      else row.push(Math.floor(Math.random() * 8) + 10);
    }
    data[s] = row;
  }
  return data;
}

function tierColor(count: number): string {
  if (count === 0) return C.white;
  if (count <= 3) return '#cce0f5';
  if (count <= 9) return '#6699cc';
  return C.navy;
}

function tierLabel(count: number): string {
  if (count === 0) return 'Gap';
  if (count <= 3) return 'Weak';
  if (count <= 9) return 'Adequate';
  return 'Strong';
}

interface SelectedCell { system: string; discipline: string; count: number; row: number; col: number }

export default function USMLEHeatmap() {
  const router = useRouter();
  const [data, setData] = useState<number[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 700));
      setData(generateMockData());
      setLoading(false);
    })();
  }, []);

  const totalCells = SYSTEMS.length * DISCIPLINES.length;
  const coveredCells = data ? data.flat().filter(v => v > 0).length : 0;

  return (
    <>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: sans, fontSize: 13, color: C.textMuted }}>Legend:</span>
        {[
          { label: 'Gap (0)', color: C.white, border: true },
          { label: 'Weak (1\u20133)', color: '#cce0f5', border: false },
          { label: 'Adequate (4\u20139)', color: '#6699cc', border: false },
          { label: 'Strong (10+)', color: C.navy, border: false },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: l.color, border: l.border ? `1px solid ${C.border}` : 'none' }} />
            <span style={{ fontFamily: sans, fontSize: 12, color: C.textSecondary }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginLeft: 'auto' }}>{coveredCells} of {totalCells} cells covered</span>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <RefreshCw size={32} style={{ color: C.blue, animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: sans, color: C.textMuted, marginTop: 16 }}>Computing coverage heatmap...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 12px', fontFamily: sans, fontSize: 11, color: C.textMuted, textAlign: 'left' }} />
                    {DISCIPLINES.map(d => (
                      <th key={d} style={{ padding: '8px 6px', fontFamily: sans, fontSize: 11, color: C.textMuted, textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 80 }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SYSTEMS.map((sys, si) => (
                    <tr key={sys}>
                      <td style={{ padding: '4px 12px 4px 0', fontFamily: sans, fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sys}</td>
                      {DISCIPLINES.map((disc, di) => {
                        const count = data[si][di];
                        const isSelected = selected?.row === si && selected?.col === di;
                        return (
                          <td key={di} style={{ padding: 2 }}>
                            <button onClick={() => setSelected({ system: sys, discipline: disc, count, row: si, col: di })}
                              style={{ width: '100%', height: 32, minWidth: 32, border: isSelected ? `2px solid ${C.blue}` : `1px solid ${C.borderLight}`, borderRadius: 4, background: tierColor(count), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontSize: 11, color: count >= 10 ? C.white : count === 0 ? C.textMuted : C.textPrimary }}>
                              {count}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selected && (
            <div style={{ width: 300, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, alignSelf: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: serif, fontSize: 16, color: C.textPrimary }}>{selected.system}</div>
                  <div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted }}>{selected.discipline}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.textMuted }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, padding: 12, background: C.cream, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontFamily: sans, fontSize: 24, color: tierColor(selected.count) === C.white ? C.error : tierColor(selected.count) === '#cce0f5' ? C.warning : C.green }}>{selected.count}</div>
                  <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>Approved Items</div>
                </div>
                <div style={{ flex: 1, padding: 12, background: C.cream, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary }}>{tierLabel(selected.count)}</div>
                  <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>Coverage Tier</div>
                </div>
              </div>
              {selected.count === 0 && (
                <button onClick={() => router.push('/generation')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}>
                  <Crosshair size={16} /> Generate for This Gap
                </button>
              )}
              {selected.count > 0 && (
                <div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted }}>Contributing courses: Cardiovascular Pharmacology, Pathology I</div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
