'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Flag, ChevronLeft, ChevronRight, Clock, AlertTriangle,
  Send, BookOpen, CheckCircle2, XCircle, LayoutGrid,
} from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { MOCK_QUESTIONS } from './exam-mock-data';

const EXAM_NAME = 'Pharmacology Midterm Exam';
const DURATION_MINUTES = 60;
const TOTAL_QUESTIONS = MOCK_QUESTIONS.length;

export default function ExamDelivery() {
  const params = useParams();
  const sessionId = params.sessionId as string | undefined;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(3600);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [score, setScore] = useState<{
    rawScore: number; pctScore: number; correctCount: number; totalQuestions: number;
  } | null>(null);

  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 500));
      setLoading(false);
    })();
  }, [sessionId]);

  useEffect(() => {
    if (loading || submitted || !started) return;
    if (startTimeRef.current === 0) startTimeRef.current = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = DURATION_MINUTES * 60 - elapsed;
      if (remaining <= 0) { clearInterval(timer); setTimeLeft(0); handleAutoSubmit(); }
      else { setTimeLeft(remaining); }
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, submitted, started]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const question = MOCK_QUESTIONS[currentIndex];

  const selectAnswer = useCallback((key: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [question.id]: key }));
  }, [question?.id, submitted]);

  const toggleFlag = useCallback(() => {
    if (submitted) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) { next.delete(question.id); } else { next.add(question.id); }
      return next;
    });
  }, [question?.id, submitted]);

  const goNext = useCallback(() => { setCurrentIndex((prev) => Math.min(TOTAL_QUESTIONS - 1, prev + 1)); }, []);
  const goPrev = useCallback(() => { setCurrentIndex((prev) => Math.max(0, prev - 1)); }, []);

  useEffect(() => {
    if (!started || submitted || loading) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); goNext(); break;
        case 'ArrowLeft': e.preventDefault(); goPrev(); break;
        case 'f': case 'F': if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleFlag(); } break;
        case 'a': case 'A': if (!e.ctrlKey && !e.metaKey) selectAnswer('A'); break;
        case 'b': case 'B': if (!e.ctrlKey && !e.metaKey) selectAnswer('B'); break;
        case 'c': case 'C': if (!e.ctrlKey && !e.metaKey) selectAnswer('C'); break;
        case 'd': case 'D': if (!e.ctrlKey && !e.metaKey && !e.shiftKey) selectAnswer('D'); break;
        case 'e': case 'E': if (!e.ctrlKey && !e.metaKey) selectAnswer('E'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, submitted, loading, goNext, goPrev, toggleFlag, selectAnswer]);

  const computeScore = useCallback(() => {
    let correct = 0;
    MOCK_QUESTIONS.forEach((q) => { if (answers[q.id] === q.correctKey) correct++; });
    return { rawScore: correct, pctScore: Math.round((correct / TOTAL_QUESTIONS) * 100), correctCount: correct, totalQuestions: TOTAL_QUESTIONS };
  }, [answers]);

  const handleAutoSubmit = useCallback(() => { setSubmitted(true); setScore(computeScore()); }, [computeScore]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setShowSubmitModal(false); setSubmitting(false); setSubmitted(true); setScore(computeScore());
  }, [computeScore]);

  // Score screen
  if (submitted && score) {
    const answeredCount = Object.keys(answers).length;
    const passed = score.pctScore >= 70;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 64 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: passed ? `${C.green}12` : `${C.error}10`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 24, border: `3px solid ${passed ? C.green : C.error}` }}>
          <span style={{ fontFamily: sans, fontSize: 36, fontWeight: 700, color: passed ? C.green : C.error, lineHeight: 1 }}>{score.pctScore}%</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: passed ? C.greenDark : C.error, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{passed ? 'PASSED' : 'BELOW PASSING'}</span>
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: C.textPrimary, marginBottom: 8 }}>Exam Complete</h2>
        <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, marginBottom: 32, textAlign: 'center' }}>
          {score.correctCount} of {score.totalQuestions} correct &middot; {answeredCount} answered &middot; {TOTAL_QUESTIONS - answeredCount} skipped
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40, width: '100%', maxWidth: 560 }}>
          {[
            { label: 'Raw Score', value: `${score.correctCount}/${score.totalQuestions}`, color: C.navyDeep },
            { label: 'Percentage', value: `${score.pctScore}%`, color: passed ? C.green : C.error },
            { label: 'Flagged', value: String(flagged.size), color: C.warning },
            { label: 'Time Used', value: formatTimer(DURATION_MINUTES * 60 - timeLeft), color: C.blue },
          ].map((card) => (
            <div key={card.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
              <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>{card.label}</p>
              <p style={{ fontFamily: sans, fontSize: 22, fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
            </div>
          ))}
        </div>
        <div style={{ width: '100%', maxWidth: 560, marginBottom: 32 }}>
          <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>Question Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MOCK_QUESTIONS.map((q, idx) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correctKey;
              const wasSkipped = !userAns;
              return (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 8 }}>
                  <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textSecondary, width: 20 }}>{idx + 1}</span>
                  {wasSkipped ? (
                    <span style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, fontStyle: 'italic' }}>Skipped</span>
                  ) : isCorrect ? (
                    <CheckCircle2 size={16} style={{ color: C.green }} />
                  ) : (
                    <XCircle size={16} style={{ color: C.error }} />
                  )}
                  <span style={{ flex: 1, fontFamily: sans, fontSize: 13, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.stem.slice(0, 80)}{q.stem.length > 80 ? '...' : ''}
                  </span>
                  {!wasSkipped && (
                    <span style={{ fontFamily: mono, fontSize: 11, color: isCorrect ? C.green : C.error }}>
                      {userAns}{!isCorrect && ` \u2192 ${q.correctKey}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '12px 24px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Loading
  if (loading) return (
    <div style={{ textAlign: 'center', padding: 64 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.borderLight}`, borderTopColor: C.blue, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ fontFamily: sans, color: C.textMuted }}>Loading exam session...</p>
    </div>
  );

  // Begin exam gate
  if (!started) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${C.blue}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <BookOpen size={36} style={{ color: C.blue }} />
      </div>
      <h2 style={{ fontFamily: serif, fontSize: 24, color: C.textPrimary, marginBottom: 8, textAlign: 'center' }}>{EXAM_NAME}</h2>
      <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, marginBottom: 32, textAlign: 'center', maxWidth: 480, lineHeight: 1.6 }}>
        Please review the exam details below. Once you begin, the timer will start and cannot be paused.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40, width: '100%', maxWidth: 480 }}>
        {[
          { label: 'Questions', value: String(TOTAL_QUESTIONS) },
          { label: 'Time Limit', value: `${DURATION_MINUTES} min` },
          { label: 'Format', value: 'MCQ' },
        ].map((c) => (
          <div key={c.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
            <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>{c.label}</p>
            <p style={{ fontFamily: sans, fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div style={{ background: `${C.warning}08`, border: `1px solid ${C.warning}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 32, maxWidth: 480, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={16} style={{ color: C.warning, flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, lineHeight: 1.5, margin: 0 }}>
            Answers auto-save on selection. Use <kbd style={{ fontFamily: mono, fontSize: 11, background: C.cream, padding: '1px 4px', borderRadius: 3, border: `1px solid ${C.border}` }}>A-E</kbd> keys to answer, <kbd style={{ fontFamily: mono, fontSize: 11, background: C.cream, padding: '1px 4px', borderRadius: 3, border: `1px solid ${C.border}` }}>F</kbd> to flag, and <kbd style={{ fontFamily: mono, fontSize: 11, background: C.cream, padding: '1px 4px', borderRadius: 3, border: `1px solid ${C.border}` }}>&larr; &rarr;</kbd> to navigate.
          </p>
        </div>
      </div>
      <button onClick={() => setStarted(true)} style={{ padding: '14px 40px', background: C.navyDeep, color: C.white, border: 'none', borderRadius: 10, fontFamily: sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
        Begin Exam
      </button>
    </div>
  );

  // Exam in progress
  return (
    <>
      {/* Timer + progress bar */}
      <div style={{ marginBottom: 20, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ height: 3, background: C.borderLight, borderRadius: '10px 10px 0 0' }}>
          <div style={{ height: '100%', width: `${(Object.keys(answers).length / TOTAL_QUESTIONS) * 100}%`, background: C.blue, borderRadius: '3px 0 0 0', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: timeLeft < 300 ? C.error : C.textMuted }} />
            <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 600, color: timeLeft < 300 ? C.error : C.textPrimary }}>{formatTimer(timeLeft)}</span>
            {timeLeft < 300 && <span style={{ fontFamily: sans, fontSize: 12, color: C.error }}>Less than 5 min remaining</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{Object.keys(answers).length}/{TOTAL_QUESTIONS} answered</span>
            <button onClick={() => setShowNav(!showNav)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showNav ? C.cream : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: C.textSecondary }}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Question navigator */}
      {showNav && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 10 }}>Question Navigator</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {MOCK_QUESTIONS.map((q, idx) => (
              <button key={q.id} onClick={() => { setCurrentIndex(idx); setShowNav(false); }}
                style={{ width: '100%', aspectRatio: '1', borderRadius: 8, border: idx === currentIndex ? `2px solid ${C.blue}` : `1px solid ${C.border}`, background: answers[q.id] ? C.blue : flagged.has(q.id) ? C.warning : C.white, color: answers[q.id] ? C.white : C.textPrimary, fontFamily: sans, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {idx + 1}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            {[{ color: C.blue, label: 'Answered' }, { color: C.warning, label: 'Flagged' }, { color: C.white, label: 'Unanswered' }].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color, border: l.color === C.white ? `1px solid ${C.border}` : 'none' }} />
                <span style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question content */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, background: C.cream, padding: '3px 8px', borderRadius: 4 }}>Q{currentIndex + 1} of {TOTAL_QUESTIONS}</span>
          {flagged.has(question.id) && (
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.warning, background: `${C.warning}12`, padding: '3px 8px', borderRadius: 4 }}>Flagged</span>
          )}
        </div>
        {question.vignette && (
          <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, lineHeight: 1.7, marginBottom: 20, padding: 16, background: C.cream, borderRadius: 8 }}>{question.vignette}</p>
        )}
        <p style={{ fontFamily: sans, fontSize: 16, color: C.textPrimary, lineHeight: 1.6, marginBottom: 24 }}>{question.stem}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {question.options.map((opt) => {
            const isSelected = answers[question.id] === opt.key;
            return (
              <button key={opt.key} onClick={() => selectAnswer(opt.key)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', border: isSelected ? `2px solid ${C.blue}` : `1px solid ${C.border}`, borderRadius: 10, background: isSelected ? `${C.blue}06` : C.white, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s ease' }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? C.blue : C.cream, color: isSelected ? C.white : C.textSecondary, fontFamily: sans, fontSize: 13, transition: 'all 0.12s ease' }}>{opt.key}</span>
                <span style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary, lineHeight: 1.5, paddingTop: 3 }}>{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={goPrev} disabled={currentIndex === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: currentIndex === 0 ? C.warmGray : C.textPrimary, fontFamily: sans, cursor: currentIndex === 0 ? 'default' : 'pointer', opacity: currentIndex === 0 ? 0.5 : 1 }}>
          <ChevronLeft size={16} /> Previous
        </button>
        <button onClick={toggleFlag} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: `1px solid ${flagged.has(question.id) ? C.warning : C.border}`, borderRadius: 8, background: flagged.has(question.id) ? `${C.warning}12` : C.white, color: flagged.has(question.id) ? C.warning : C.textSecondary, fontFamily: sans, cursor: 'pointer' }}>
          <Flag size={14} /> {flagged.has(question.id) ? 'Flagged' : 'Flag'}
        </button>
        {currentIndex < TOTAL_QUESTIONS - 1 ? (
          <button onClick={goNext} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, cursor: 'pointer' }}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={() => setShowSubmitModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: C.green, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, cursor: 'pointer' }}>
            <Send size={14} /> Submit Exam
          </button>
        )}
      </div>

      {/* Submit modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.white, borderRadius: 16, padding: 32, maxWidth: 440, width: '90%' }}>
            <h3 style={{ fontFamily: serif, fontSize: 20, color: C.textPrimary, marginBottom: 12 }}>Submit Exam?</h3>
            <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
              You have answered {Object.keys(answers).length} of {TOTAL_QUESTIONS} questions.
            </p>
            {Object.keys(answers).length < TOTAL_QUESTIONS && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: `${C.warning}10`, borderRadius: 8, marginBottom: 16 }}>
                <AlertTriangle size={16} style={{ color: C.warning }} />
                <span style={{ fontFamily: sans, fontSize: 13, color: C.warning }}>
                  {TOTAL_QUESTIONS - Object.keys(answers).length} question{TOTAL_QUESTIONS - Object.keys(answers).length !== 1 ? 's' : ''} unanswered
                </span>
              </div>
            )}
            {flagged.size > 0 && (
              <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
                {flagged.size} flagged question{flagged.size !== 1 ? 's' : ''} for review.
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSubmitModal(false)} disabled={submitting} style={{ padding: '10px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.textSecondary, fontFamily: sans, cursor: 'pointer' }}>Continue Exam</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: C.green, color: C.white, fontFamily: sans, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {submitting && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: C.white, borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}
