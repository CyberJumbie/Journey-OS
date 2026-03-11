'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface Topic { id: string; name: string; parent: string; questionCount: number; }
interface SystemCategory { id: string; name: string; topics: Topic[]; }

const categories: SystemCategory[] = [
  { id: 'cardiovascular', name: 'Cardiovascular System', topics: [
    { id: 'cv-1', name: 'Normal Cardiac Function', parent: 'Cardiovascular System', questionCount: 124 },
    { id: 'cv-2', name: 'Pathologic Processes', parent: 'Cardiovascular System', questionCount: 156 },
    { id: 'cv-3', name: 'Congenital Defects', parent: 'Cardiovascular System', questionCount: 89 },
    { id: 'cv-4', name: 'Pharmacology', parent: 'Cardiovascular System', questionCount: 142 },
  ]},
  { id: 'respiratory', name: 'Respiratory System', topics: [
    { id: 'resp-1', name: 'Normal Respiratory Function', parent: 'Respiratory System', questionCount: 98 },
    { id: 'resp-2', name: 'Pathologic Processes', parent: 'Respiratory System', questionCount: 134 },
    { id: 'resp-3', name: 'Diagnostic Tests', parent: 'Respiratory System', questionCount: 76 },
  ]},
  { id: 'nervous', name: 'Nervous System & Psychiatry', topics: [
    { id: 'ns-1', name: 'Normal Neural Function', parent: 'Nervous System', questionCount: 112 },
    { id: 'ns-2', name: 'Pathologic Processes', parent: 'Nervous System', questionCount: 168 },
    { id: 'ns-3', name: 'Neuropharmacology', parent: 'Nervous System', questionCount: 94 },
    { id: 'ns-4', name: 'Behavioral Science', parent: 'Nervous System', questionCount: 82 },
  ]},
  { id: 'renal', name: 'Renal & Urinary System', topics: [
    { id: 'renal-1', name: 'Normal Renal Function', parent: 'Renal System', questionCount: 86 },
    { id: 'renal-2', name: 'Pathologic Processes', parent: 'Renal System', questionCount: 118 },
    { id: 'renal-3', name: 'Acid-Base Disorders', parent: 'Renal System', questionCount: 72 },
  ]},
];

export default function GenerateTopicPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['cardiovascular']);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [questionType, setQuestionType] = useState<'mcq' | 'clinical_vignette' | 'mixed'>('mixed');
  const [generating, setGenerating] = useState(false);

  const toggleCategory = (id: string) => setExpandedCategories((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  const toggleTopic = (id: string) => setSelectedTopics((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    setGenerating(false);
    router.push('/generation/batch/new');
  };

  const filtered = categories.map((c) => ({ ...c, topics: c.topics.filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())) })).filter((c) => c.topics.length > 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
      {/* Topic Selector */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, marginBottom: 16 }}>Select Topics</h2>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input type="search" placeholder="Search topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', height: 44, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px 0 44px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none' }} />
        </div>
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {filtered.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 12 }}>
              <button onClick={() => toggleCategory(cat.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.navyDeep, cursor: 'pointer' }}>
                <span>{cat.name}</span>
                {expandedCategories.includes(cat.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              {expandedCategories.includes(cat.id) && (
                <div style={{ marginTop: 8, marginLeft: 16, padding: '12px 0', borderLeft: `2px solid ${C.borderLight}` }}>
                  {cat.topics.map((topic) => (
                    <label key={topic.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedTopics.includes(topic.id)} onChange={() => toggleTopic(topic.id)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{topic.name}</div>
                        <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{topic.questionCount} questions available</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Panel */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24, position: 'sticky', top: 100, alignSelf: 'flex-start' }}>
        <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, marginBottom: 20 }}>Generation Settings</h2>

        <div style={{ background: selectedTopics.length > 0 ? `${C.green}15` : C.parchment, border: `1px solid ${selectedTopics.length > 0 ? C.green : C.border}`, borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 6 }}>Topics Selected</div>
          <div style={{ fontFamily: serif, fontSize: 32, fontWeight: 700, color: selectedTopics.length > 0 ? C.green : C.textMuted }}>{selectedTopics.length}</div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>Number of Questions: {questionCount}</label>
          <input type="range" min={1} max={50} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
          <div className="flex justify-between" style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, marginTop: 6 }}><span>1</span><span>50</span></div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>Difficulty Level</label>
          <div className="flex flex-col gap-2">
            {(['easy', 'medium', 'hard', 'mixed'] as const).map((opt) => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: difficulty === opt ? `${C.blue}15` : C.parchment, border: `1px solid ${difficulty === opt ? C.blue : C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                <input type="radio" name="difficulty" value={opt} checked={difficulty === opt} onChange={() => setDifficulty(opt)} style={{ width: 16, height: 16 }} />
                <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary, textTransform: 'capitalize' }}>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>Question Type</label>
          <select value={questionType} onChange={(e) => setQuestionType(e.target.value as typeof questionType)} style={{ width: '100%', height: 44, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px', fontFamily: sans, fontSize: 15, color: C.ink, cursor: 'pointer' }}>
            <option value="mcq">Multiple Choice (MCQ)</option>
            <option value="clinical_vignette">Clinical Vignette</option>
            <option value="mixed">Mixed Types</option>
          </select>
        </div>

        <button onClick={handleGenerate} disabled={selectedTopics.length === 0 || generating} style={{ width: '100%', padding: '14px 24px', background: selectedTopics.length === 0 || generating ? C.textMuted : C.green, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, cursor: selectedTopics.length === 0 || generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Sparkles size={20} />
          {generating ? 'Generating...' : 'Generate Questions'}
        </button>
        {selectedTopics.length === 0 && <p style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 12 }}>Select at least one topic to generate questions</p>}
      </div>
    </div>
  );
}
