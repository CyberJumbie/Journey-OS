'use client';

import { C, sans, mono } from '@/lib/design-tokens';
import { MODES, CONTEXT_VIEWS, Tag, StatusDot, mockSyllabus, mockBulkQueue, ValidationView } from './workbench-shared';
import { QuestionPreview } from './question-preview';
import type { QuestionData } from './question-preview';
import type { ValidationResult } from '@journey-os/shared-types';

function SyllabusView() {
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, fontWeight: 700, color: C.navyDeep, marginBottom: 6 }}>
        {mockSyllabus.course}
      </div>
      <div style={{
        fontFamily: mono, fontSize: 10, fontWeight: 500, color: C.textMuted,
        marginBottom: 20, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        Learning Objectives — {mockSyllabus.objectives.filter(o => !o.covered).length} Uncovered
      </div>
      {mockSyllabus.objectives.map((obj) => (
        <div key={obj.id} style={{
          padding: "14px 16px", marginBottom: 8, borderRadius: 8,
          background: obj.covered ? C.parchment : "rgba(251,191,36,0.08)",
          border: `1px solid ${obj.covered ? C.border : "rgba(251,191,36,0.25)"}`,
          cursor: "pointer", transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = obj.covered ? C.blueMid : "#fa9d33"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = obj.covered ? C.border : "rgba(251,191,36,0.25)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{
              fontFamily: mono, fontSize: 11, fontWeight: 600,
              color: obj.covered ? C.green : "#d97706", textTransform: "uppercase",
            }}>
              {obj.id}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Tag color="#a78bfa" bg="rgba(167,139,250,0.12)">B{obj.bloom}</Tag>
              <span style={{
                fontSize: 11, fontFamily: mono, fontWeight: 600,
                color: obj.covered ? C.green : "#d97706", textTransform: "uppercase",
              }}>
                {obj.covered ? "Covered" : "Gap"}
              </span>
            </div>
          </div>
          <div style={{ fontFamily: sans, fontSize: 13, color: C.textPrimary, lineHeight: 1.6 }}>
            {obj.text}
          </div>
        </div>
      ))}
    </div>
  );
}

function BulkQueueView() {
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, fontWeight: 700, color: C.navyDeep }}>
            Batch Generation
          </div>
          <div style={{
            fontFamily: mono, fontSize: 10, fontWeight: 500, color: C.textMuted,
            marginTop: 4, textTransform: "uppercase",
          }}>
            {mockBulkQueue.filter(q => q.status === "complete").length}/{mockBulkQueue.length} Complete
          </div>
        </div>
        <div style={{
          width: 140, height: 8, background: C.parchment, borderRadius: 4,
          overflow: "hidden", border: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: `${(mockBulkQueue.filter(q => q.status === "complete").length / mockBulkQueue.length) * 100}%`,
            height: "100%", background: C.navyDeep, borderRadius: 3, transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {mockBulkQueue.map((q) => (
        <div key={q.id} style={{
          padding: "14px 16px", marginBottom: 8, borderRadius: 8,
          background: q.status === "generating" ? `${C.blueMid}10` : C.parchment,
          border: `1px solid ${q.status === "generating" ? C.blueMid : C.border}`,
          cursor: "pointer", transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => { if (q.status !== "generating") e.currentTarget.style.borderColor = C.blueMid; }}
        onMouseLeave={(e) => { if (q.status !== "generating") e.currentTarget.style.borderColor = C.border; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusDot status={q.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: C.textPrimary }}>
                {q.target}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Tag color="#a78bfa" bg="rgba(167,139,250,0.12)">B{q.bloom}</Tag>
                {q.score && <Tag color={C.green} bg={`${C.green}15`}>Quality: {q.score}</Tag>}
              </div>
            </div>
            <span style={{
              fontFamily: mono, fontSize: 10, fontWeight: 500, color: C.textMuted,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {q.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContextPanel({ mode, contextView, setContextView, question, validationResults }: {
  mode: string;
  contextView: string;
  setContextView: (view: string) => void;
  question: QuestionData | null;
  validationResults: ValidationResult[];
}) {
  const viewTabs = mode === MODES.BULK
    ? [
        { key: CONTEXT_VIEWS.QUEUE, label: "Queue" },
        { key: CONTEXT_VIEWS.QUESTION, label: "Current" },
        { key: CONTEXT_VIEWS.SYLLABUS, label: "Syllabus" }
      ]
    : mode === MODES.REVIEW
    ? [{ key: CONTEXT_VIEWS.QUESTION, label: "Question" }]
    : [
        { key: CONTEXT_VIEWS.SYLLABUS, label: "Syllabus" },
        { key: CONTEXT_VIEWS.QUESTION, label: "Preview" },
        { key: CONTEXT_VIEWS.VALIDATION, label: `Validation${validationResults.length > 0 ? ` (${validationResults.filter(r => r.passed).length}/${validationResults.length})` : ''}` },
        { key: CONTEXT_VIEWS.COVERAGE, label: "Coverage" },
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.white }}>
      {/* Header with tabs */}
      <div style={{ borderBottom: `1px solid ${C.borderLight}`, flexShrink: 0, background: C.parchment }}>
        <div style={{
          display: "flex", padding: "0 16px", gap: 0,
          justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex" }}>
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setContextView(tab.key)}
                style={{
                  background: "none", border: "none",
                  borderBottom: contextView === tab.key ? `3px solid ${C.navyDeep}` : "3px solid transparent",
                  padding: "14px 16px", cursor: "pointer",
                  fontFamily: mono, fontSize: 10, fontWeight: 500,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: contextView === tab.key ? C.navyDeep : C.textMuted,
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Review Actions */}
          {mode === MODES.REVIEW && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 4 }}>
              <button style={{
                background: `${C.green}15`, border: `1px solid ${C.green}40`, borderRadius: 6,
                padding: "6px 12px", color: C.green, fontFamily: mono, fontSize: 10,
                fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                Approve
              </button>
              <button style={{
                background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: 6, padding: "6px 12px", color: "#d97706", fontFamily: mono,
                fontSize: 10, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                Edit
              </button>
              <button style={{
                background: `${C.error}15`, border: `1px solid ${C.error}40`, borderRadius: 6,
                padding: "6px 12px", color: C.error, fontFamily: mono, fontSize: 10,
                fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {contextView === CONTEXT_VIEWS.SYLLABUS && <SyllabusView />}
        {contextView === CONTEXT_VIEWS.QUESTION && question && (
          <QuestionPreview question={question} showRationale={mode === MODES.REVIEW} />
        )}
        {contextView === CONTEXT_VIEWS.QUESTION && !question && (
          <div style={{
            fontFamily: sans, fontSize: 14, color: C.textMuted,
            textAlign: "center", paddingTop: 60, lineHeight: 1.6,
          }}>
            No question generated yet. Start a conversation in the chat panel to generate one.
          </div>
        )}
        {contextView === CONTEXT_VIEWS.VALIDATION && (
          <ValidationView results={validationResults} />
        )}
        {contextView === CONTEXT_VIEWS.QUEUE && <BulkQueueView />}
        {contextView === CONTEXT_VIEWS.COVERAGE && (
          <div style={{
            fontFamily: sans, fontSize: 14, color: C.textMuted,
            textAlign: "center", paddingTop: 60, lineHeight: 1.6,
          }}>
            Coverage map visualization would render here — showing SubConcept nodes
            colored by assessment coverage, with gap highlighting.
          </div>
        )}
      </div>
    </div>
  );
}
