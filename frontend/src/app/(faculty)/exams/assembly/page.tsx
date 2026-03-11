'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Save, CheckCircle, AlertTriangle, BarChart3, Plus, X, GripVertical, RefreshCw } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface Question {
  id: string;
  stem: string;
  system: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  bloom_level: string;
  clinical_setting: string;
}

interface BlueprintValidation {
  system_distribution: { system: string; actual: number; target: number; status: 'pass' | 'warn' | 'fail' }[];
  difficulty_balance: { difficulty: string; actual: number; target: number; status: 'pass' | 'warn' | 'fail' }[];
  total_questions: number;
  total_points: number;
}

export default function ExamAssembly() {
  const router = useRouter();
  const [examName, setExamName] = useState('Cardiovascular Midterm Exam');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [validation, setValidation] = useState<BlueprintValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { fetchQuestions(); }, []);
  useEffect(() => { if (selectedQuestions.length > 0) calculateValidation(); }, [selectedQuestions]);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockQuestions: Question[] = [
        { id: '1', stem: 'A 62-year-old man presents with acute chest pain radiating to the left arm...', system: 'Cardiovascular', difficulty: 'Medium', bloom_level: 'Apply', clinical_setting: 'Emergency' },
        { id: '2', stem: 'A 68-year-old woman with progressive dyspnea on exertion over 3 months...', system: 'Cardiovascular', difficulty: 'Hard', bloom_level: 'Analyze', clinical_setting: 'Ambulatory' },
        { id: '3', stem: 'A 3-month-old infant presents with cyanosis and a systolic murmur...', system: 'Cardiovascular', difficulty: 'Hard', bloom_level: 'Analyze', clinical_setting: 'Emergency' },
        { id: '4', stem: 'Which of the following is the primary mechanism of action for ACE inhibitors...', system: 'Cardiovascular', difficulty: 'Easy', bloom_level: 'Remember', clinical_setting: 'Ambulatory' },
        { id: '5', stem: 'A 55-year-old man with atrial fibrillation presents with sudden onset leg pain...', system: 'Cardiovascular', difficulty: 'Medium', bloom_level: 'Apply', clinical_setting: 'Emergency' },
      ];
      setAvailableQuestions(mockQuestions);
      setSelectedQuestions([mockQuestions[0], mockQuestions[1]]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const calculateValidation = () => {
    const total = selectedQuestions.length;
    const systemCounts: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = {};
    selectedQuestions.forEach((q) => {
      systemCounts[q.system] = (systemCounts[q.system] || 0) + 1;
      difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
    });
    const systemTargets: Record<string, number> = { Cardiovascular: 50, Respiratory: 20, Nervous: 15, Renal: 10, Endocrine: 5 };
    const system_distribution = Object.entries(systemTargets).map(([system, target]) => {
      const actual = total > 0 ? ((systemCounts[system] || 0) / total) * 100 : 0;
      const diff = Math.abs(actual - target);
      return { system, actual, target, status: (diff <= 5 ? 'pass' : diff <= 15 ? 'warn' : 'fail') as 'pass' | 'warn' | 'fail' };
    });
    const difficultyTargets: Record<string, number> = { Easy: 30, Medium: 50, Hard: 20 };
    const difficulty_balance = Object.entries(difficultyTargets).map(([difficulty, target]) => {
      const actual = total > 0 ? ((difficultyCounts[difficulty] || 0) / total) * 100 : 0;
      const diff = Math.abs(actual - target);
      return { difficulty, actual, target, status: (diff <= 10 ? 'pass' : diff <= 20 ? 'warn' : 'fail') as 'pass' | 'warn' | 'fail' };
    });
    setValidation({ system_distribution, difficulty_balance, total_questions: total, total_points: total * 10 });
  };

  const handleAddQuestion = (question: Question) => {
    if (!selectedQuestions.find((q) => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };
  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== questionId));
  };
  const handleSaveExam = () => { router.push('/exams'); };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) { case 'Easy': return C.green; case 'Medium': return '#fa9d33'; case 'Hard': return C.error; default: return C.textMuted; }
  };
  const getStatusColor = (status: 'pass' | 'warn' | 'fail') => {
    switch (status) { case 'pass': return C.green; case 'warn': return '#fa9d33'; case 'fail': return C.error; }
  };

  const filteredQuestions = availableQuestions.filter((q) =>
    !selectedQuestions.find((sq) => sq.id === q.id) &&
    (searchQuery === '' || q.stem.toLowerCase().includes(searchQuery.toLowerCase()) || q.system.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Header actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <input type="text" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Enter exam name..."
          style={{ flex: 1, height: 44, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px', fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, outline: 'none', marginRight: 16 }} />
        <button onClick={handleSaveExam} disabled={selectedQuestions.length === 0}
          style={{ padding: '10px 20px', background: selectedQuestions.length === 0 ? C.textMuted : C.green, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: selectedQuestions.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Save size={16} /> Save Exam
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[1, 2].map((i) => (<div key={i} style={{ background: C.borderLight, borderRadius: 12, height: i === 1 ? 200 : 300, animation: 'pulse 1.5s ease-in-out infinite' }} />))}
          </div>
          <div style={{ background: C.borderLight, borderRadius: 12, height: 400, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${C.error}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <AlertTriangle size={28} style={{ color: C.error }} />
          </div>
          <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, margin: '0 0 8px' }}>Couldn&apos;t load question bank.</h2>
          <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, margin: '0 0 24px', maxWidth: 400 }}>Please check your connection and try again.</p>
          <button onClick={fetchQuestions} style={{ padding: '10px 24px', background: C.navyDeep, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Selected Questions */}
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Selected Questions</h2>
                <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.textMuted }}>{selectedQuestions.length} questions</div>
              </div>
              <div style={{ padding: 20 }}>
                {selectedQuestions.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontFamily: sans, fontSize: 15 }}>No questions selected yet. Add questions from the available pool below.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedQuestions.map((question, index) => (
                      <div key={question.id} style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, display: 'flex', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <GripVertical size={18} style={{ color: C.textMuted, cursor: 'grab' }} />
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: C.navyDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.white, flexShrink: 0 }}>{index + 1}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: C.textPrimary, margin: '0 0 8px' }}>{question.stem.substring(0, 100)}...</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: getDifficultyColor(question.difficulty) }}>{question.difficulty}</span>
                            <span style={{ color: C.textMuted }}>&#x2022;</span>
                            <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{question.system}</span>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveQuestion(question.id)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: C.error, cursor: 'pointer', flexShrink: 0 }}>
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Available Questions */}
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}` }}>
                <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, marginBottom: 16 }}>Available Questions</h2>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                  <input type="search" placeholder="Search questions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', height: 44, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px 0 44px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none' }} />
                </div>
              </div>
              <div style={{ padding: 20, maxHeight: 600, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredQuestions.map((question) => (
                    <div key={question.id} style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, display: 'flex', gap: 12, cursor: 'pointer' }} onClick={() => handleAddQuestion(question)}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: C.textPrimary, margin: '0 0 8px' }}>{question.stem.substring(0, 120)}...</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: getDifficultyColor(question.difficulty) }}>{question.difficulty}</span>
                          <span style={{ color: C.textMuted }}>&#x2022;</span>
                          <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{question.system}</span>
                        </div>
                      </div>
                      <button style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.green, border: 'none', borderRadius: 6, color: C.white, cursor: 'pointer', flexShrink: 0 }}>
                        <Plus size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Blueprint Validation */}
          <div>
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, position: 'sticky', top: 100 }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BarChart3 size={20} style={{ color: C.blueMid }} />
                  <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Blueprint Validation</h2>
                </div>
              </div>
              {validation && (
                <div style={{ padding: 24 }}>
                  <div style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Questions</div>
                        <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.navyDeep }}>{validation.total_questions}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Total Points</div>
                        <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.navyDeep }}>{validation.total_points}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>System Distribution</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {validation.system_distribution.map((item) => (
                        <div key={item.system}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{item.system}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {item.status === 'pass' ? <CheckCircle size={14} style={{ color: getStatusColor(item.status) }} /> : <AlertTriangle size={14} style={{ color: getStatusColor(item.status) }} />}
                              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: getStatusColor(item.status) }}>{Math.round(item.actual)}% / {item.target}%</span>
                            </div>
                          </div>
                          <div style={{ width: '100%', height: 6, background: C.parchment, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(item.actual, 100)}%`, background: getStatusColor(item.status), transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>Difficulty Balance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {validation.difficulty_balance.map((item) => (
                        <div key={item.difficulty}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{item.difficulty}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {item.status === 'pass' ? <CheckCircle size={14} style={{ color: getStatusColor(item.status) }} /> : <AlertTriangle size={14} style={{ color: getStatusColor(item.status) }} />}
                              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: getStatusColor(item.status) }}>{Math.round(item.actual)}% / {item.target}%</span>
                            </div>
                          </div>
                          <div style={{ width: '100%', height: 6, background: C.parchment, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(item.actual, 100)}%`, background: getStatusColor(item.status), transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
