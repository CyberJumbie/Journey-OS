'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle, AlertTriangle, RefreshCw, XCircle, Clock } from 'lucide-react';
import { C, sans, serif } from '@/lib/design-tokens';

interface OptionData { key: string; text: string; isCorrect: boolean; explanation: string; }
interface ValidationRule { id: string; name: string; severity: 'critical' | 'warning'; passed: boolean; message?: string; }

const MOCK_OPTIONS: OptionData[] = [
  { key: 'A', text: 'Metoprolol succinate', isCorrect: true, explanation: 'Beta-blockers are first-line post-MI therapy and reduce mortality via decreased myocardial oxygen demand and anti-arrhythmic effects.' },
  { key: 'B', text: 'Amlodipine', isCorrect: false, explanation: 'Calcium channel blockers are second-line and do not provide the same mortality benefit post-MI as beta-blockers.' },
  { key: 'C', text: 'Hydralazine', isCorrect: false, explanation: 'Hydralazine is used in heart failure combination therapy, not first-line post-MI management.' },
  { key: 'D', text: 'Verapamil', isCorrect: false, explanation: 'Non-dihydropyridine CCBs are contraindicated in heart failure and should be used cautiously post-MI.' },
  { key: 'E', text: 'Furosemide', isCorrect: false, explanation: 'Loop diuretics manage fluid overload but do not improve long-term survival post-MI.' },
];

const MOCK_VALIDATION: ValidationRule[] = [
  { id: 'v1', name: 'Clinical vignette present', severity: 'critical', passed: true },
  { id: 'v2', name: 'Stem ends with question', severity: 'critical', passed: true },
  { id: 'v3', name: 'Exactly one correct answer', severity: 'critical', passed: true },
  { id: 'v4', name: 'All distractors plausible', severity: 'warning', passed: true },
  { id: 'v5', name: 'No absolute terms (always/never)', severity: 'warning', passed: true },
  { id: 'v6', name: 'Vignette >= 30 words', severity: 'warning', passed: true },
  { id: 'v7', name: 'Options similar length', severity: 'warning', passed: false, message: 'Option C is 42% shorter than the longest option' },
  { id: 'v8', name: 'No double negatives', severity: 'critical', passed: true },
  { id: 'v9', name: 'Bloom level >= Apply', severity: 'warning', passed: true },
  { id: 'v10', name: 'Options alphabetically reasonable', severity: 'warning', passed: true },
];

export default function ItemEditorPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params?.questionId as string;

  const [loading, setLoading] = useState(true);
  const [vignette, setVignette] = useState('A 58-year-old man with a history of myocardial infarction 3 months ago presents for a routine follow-up. His current medications include aspirin, atorvastatin, and lisinopril. His blood pressure is 145/92 mmHg and heart rate is 78 bpm.');
  const [stem, setStem] = useState('Which of the following medications should be added to this patient\'s regimen to improve long-term survival?');
  const [options, setOptions] = useState<OptionData[]>(MOCK_OPTIONS);
  const [bloomLevel, setBloomLevel] = useState('Apply');
  const [usmleSystem, setUSMLESystem] = useState('Cardiovascular');
  const [difficulty, setDifficulty] = useState('Medium');
  const [validation] = useState<ValidationRule[]>(MOCK_VALIDATION);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [questionId]);

  const updateOption = (idx: number, field: keyof OptionData, value: string | boolean) => {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  const allCriticalPass = validation.filter((v) => v.severity === 'critical' && !v.passed).length === 0;

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RefreshCw size={32} className="animate-spin" style={{ color: C.blue }} />
        <p style={{ fontFamily: sans, color: C.textMuted, marginTop: 16 }}>Loading item...</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => router.push(`/questions/${questionId}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0, border: 'none', background: 'transparent', color: C.blue, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Back to Item Detail
      </button>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditorSection label="Clinical Vignette">
            <textarea value={vignette} onChange={(e) => setVignette(e.target.value)} rows={4} style={{ width: '100%', padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, lineHeight: 1.6, resize: 'vertical', color: C.textPrimary }} />
          </EditorSection>

          <EditorSection label="Question Stem">
            <textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={2} style={{ width: '100%', padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, lineHeight: 1.6, resize: 'vertical', color: C.textPrimary }} />
          </EditorSection>

          <EditorSection label="Answer Options">
            <div className="flex flex-col gap-3">
              {options.map((opt, idx) => (
                <div key={opt.key} style={{ padding: 12, border: `1px solid ${opt.isCorrect ? C.green : C.borderLight}`, borderRadius: 8, background: opt.isCorrect ? `${C.green}06` : 'transparent' }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, width: 20 }}>{opt.key}.</span>
                    <input value={opt.text} onChange={(e) => updateOption(idx, 'text', e.target.value)} style={{ flex: 1, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 14, color: C.textPrimary }} />
                    <label className="flex items-center gap-1 whitespace-nowrap" style={{ fontFamily: sans, fontSize: 12, color: opt.isCorrect ? C.green : C.textMuted, cursor: 'pointer' }}>
                      <input type="radio" name="correct" checked={opt.isCorrect} onChange={() => setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === idx })))} style={{ accentColor: C.green }} />
                      Correct
                    </label>
                  </div>
                  <input value={opt.explanation} onChange={(e) => updateOption(idx, 'explanation', e.target.value)} placeholder="Explanation for this option..." style={{ width: '100%', padding: '6px 10px', border: `1px solid ${C.borderLight}`, borderRadius: 6, fontFamily: sans, fontSize: 13, color: C.textSecondary }} />
                </div>
              ))}
            </div>
          </EditorSection>

          <EditorSection label="Metadata">
            <div className="grid grid-cols-3 gap-3">
              <MetaSelect label="Bloom Level" value={bloomLevel} onChange={setBloomLevel} options={['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']} />
              <MetaSelect label="USMLE System" value={usmleSystem} onChange={setUSMLESystem} options={['Cardiovascular', 'Respiratory', 'Renal', 'GI', 'Endocrine', 'Nervous System', 'Hematology', 'Musculoskeletal', 'Reproductive', 'Immune System']} />
              <MetaSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={['Easy', 'Medium', 'Hard']} />
            </div>
          </EditorSection>
        </div>

        <div style={{ width: 300, flexShrink: 0, alignSelf: 'flex-start' }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontFamily: serif, fontSize: 16, color: C.textPrimary, margin: '0 0 16px' }}>Validation ({validation.filter((v) => v.passed).length}/{validation.length})</h3>
            <div className="flex flex-col gap-2">
              {validation.map((rule) => (
                <div key={rule.id} className="flex items-start gap-2">
                  {rule.passed ? <CheckCircle size={14} style={{ color: C.green, marginTop: 2, flexShrink: 0 }} /> : rule.severity === 'critical' ? <XCircle size={14} style={{ color: C.error, marginTop: 2, flexShrink: 0 }} /> : <AlertTriangle size={14} style={{ color: C.warning, marginTop: 2, flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontFamily: sans, fontSize: 13, color: rule.passed ? C.textSecondary : (rule.severity === 'critical' ? C.error : C.warning) }}>{rule.name}</div>
                    {rule.message && <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{rule.message}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={handleSave} disabled={!allCriticalPass || saving} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: allCriticalPass ? C.blue : C.warmGray, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, cursor: allCriticalPass && !saving ? 'pointer' : 'not-allowed' }}>
              {saving ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save &amp; Re-validate</>}
            </button>
            <button onClick={() => router.push(`/questions/${questionId}/history`)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', background: C.parchment, color: C.blue, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}>
              <Clock size={16} /> Version History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <label style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

function MetaSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 13 }}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
