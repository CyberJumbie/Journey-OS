import { useState, useRef, useEffect } from "react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — QUEST WORKBENCH
// AI-Powered Question Generation Interface
// Surface: cream (desk) → white (main panels) → parchment (cards)
// ═══════════════════════════════════════════════════════════════

const MODES = { GENERATE: "generate", REVIEW: "review", BULK: "bulk" };
const CONTEXT_VIEWS = { SYLLABUS: "syllabus", QUESTION: "question", COVERAGE: "coverage", QUEUE: "queue" };

// --- Mock Data ---
const mockSyllabus = {
  course: "MEDI-531 Cardiovascular System",
  objectives: [
    { id: "LO-1", text: "Describe the pathophysiology of acute coronary syndromes including plaque rupture mechanisms", bloom: 2, covered: true },
    { id: "LO-2", text: "Differentiate between STEMI, NSTEMI, and unstable angina using biomarker and ECG criteria", bloom: 4, covered: true },
    { id: "LO-3", text: "Analyze the role of the RAAS system in heart failure compensation", bloom: 4, covered: false },
    { id: "LO-4", text: "Evaluate pharmacological interventions for acute MI management", bloom: 5, covered: false },
    { id: "LO-5", text: "Explain cardiac biomarker kinetics and their diagnostic windows", bloom: 3, covered: true },
  ],
};

const mockQuestion = {
  id: "Q-2024-0847",
  status: "draft",
  vignette: "A 62-year-old African American man presents to the emergency department with substernal chest pain radiating to the left arm for 2 hours. He has a history of hypertension, type 2 diabetes mellitus, and hyperlipidemia. His medications include lisinopril, metformin, and atorvastatin. On examination, he is diaphoretic with blood pressure 158/94 mmHg. ECG shows ST-segment elevation in leads V1-V4.",
  stem: "Which of the following is the most likely underlying mechanism of this patient's acute presentation?",
  options: [
    { letter: "A", text: "Fibrous cap rupture with subsequent thrombus formation", correct: true, misconception: null },
    { letter: "B", text: "Progressive luminal narrowing from smooth muscle proliferation", correct: false, misconception: "Confuses chronic stable angina pathogenesis with acute plaque event" },
    { letter: "C", text: "Coronary vasospasm triggered by endothelial dysfunction", correct: false, misconception: "Prinzmetal variant — wrong mechanism for STEMI with risk factors" },
    { letter: "D", text: "Demand ischemia from uncontrolled hypertension", correct: false, misconception: "Type 2 MI mechanism — doesn't explain ST elevation pattern" },
    { letter: "E", text: "Cholesterol crystal embolization from aortic atheroma", correct: false, misconception: "Rare mechanism — tests obscure knowledge over clinical reasoning" },
  ],
  tags: { bloom: 4, system: "Cardiovascular", discipline: "Pathology", difficulty: 0.72 },
  proficiencyVariable: "PV-ACS-plaque-pathogenesis",
  taskShell: "TS-mechanism-identification",
  toulmin: {
    claim: "Student can analyze the pathophysiological mechanism underlying ACS at Bloom level 4",
    warrant: "Correct identification of plaque rupture requires distinguishing acute from chronic and primary from secondary ischemic mechanisms",
    backing: "LO-1 (MEDI-531), USMLE Step 1 Cardiovascular Blueprint",
    rebuttal: "Risk factor profile in vignette may cue answer without mechanistic reasoning",
  },
  sources: [
    { type: "lecture", ref: "MEDI-531 Lecture 12, Slide 34", confidence: 0.94 },
    { type: "objective", ref: "LO-1: Pathophysiology of ACS", confidence: 1.0 },
  ],
};

const mockBulkQueue = [
  { id: 1, target: "ACS plaque pathogenesis", bloom: 4, status: "complete", score: 0.91 },
  { id: 2, target: "Troponin vs CK-MB kinetics", bloom: 3, status: "complete", score: 0.87 },
  { id: 3, target: "RAAS compensation in HF", bloom: 4, status: "generating", score: null },
  { id: 4, target: "Beta-blocker contraindications", bloom: 5, status: "pending", score: null },
  { id: 5, target: "ECG lead localization", bloom: 3, status: "pending", score: null },
  { id: 6, target: "Statin mechanism of action", bloom: 2, status: "pending", score: null },
  { id: 7, target: "Antiplatelet dual therapy", bloom: 4, status: "pending", score: null },
];

const generateConvo = [
  { role: "system", text: "Session started for MEDI-531 Cardiovascular System. I've loaded the syllabus and identified 2 uncovered learning objectives." },
  { role: "user", text: "Let's start with ACS pathogenesis. I want a clinical vignette, not basic science recall." },
  { role: "system", text: "Compiling context from your knowledge graph...\n\n→ Target: SubConcept \"Plaque Rupture in ACS\"\n→ ProficiencyVariable: PV-ACS-plaque-pathogenesis\n→ TaskShell: TS-mechanism-identification (Bloom 3-5)\n→ Related concepts via RELATED_TO: stable angina (differential), vasospasm (commonly confused), demand ischemia (same system)\n\nGenerating vignette with clinical presentation..." },
  { role: "system", text: "Question generated. Check the preview panel. →\n\nThe vignette presents a classic STEMI with risk factors. Distractors target specific misconceptions:\n• B tests chronic vs. acute confusion\n• C tests Prinzmetal variant conflation\n• D tests Type 1 vs Type 2 MI distinction\n• E tests obscure knowledge bias" },
  { role: "user", text: "Option E feels too obscure. Replace it with something about coronary artery dissection — it's a better near-miss for this demographic." },
];

const reviewConvo = [
  { role: "system", text: "Loaded Q-2024-0847 for review. This item targets PV-ACS-plaque-pathogenesis at Bloom level 4.\n\nValidation summary:\n✅ 22/22 NBME item-writing rules passed\n✅ No duplicate detected (nearest similarity: 0.34)\n⚠️ Rebuttal flag: Risk factor profile may cue the answer" },
  { role: "user", text: "The rebuttal flag concerns me. Can you reduce the cueing from the demographic details?" },
  { role: "system", text: "Good catch. The combination of 62/M/African American/HTN/DM/HLD is a classic ACS profile that could cue 'plaque rupture' without mechanistic reasoning.\n\nProposed changes:\n• Age → 54 (still realistic, less stereotypical)\n• Remove explicit hyperlipidemia from history\n• Add a mild distractor element (recent dental procedure → could suggest endocarditis to unwary students)\n\nUpdating the vignette now..." },
  { role: "user", text: "I like the dental procedure addition. Approve those changes." },
];

// --- Components ---

function Tag({ children, color = C.blueMid, bg }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      fontSize: 10,
      fontFamily: mono,
      fontWeight: 500,
      color,
      background: bg || `${color}15`,
      padding: "3px 8px",
      borderRadius: 4,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      display: "inline-block",
    }}>
      {children}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "complete" ? C.green : status === "generating" ? "#fa9d33" : C.textMuted;
  return (
    <span style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: color,
      boxShadow: status === "generating" ? `0 0 8px ${color}` : "none",
      animation: status === "generating" ? "pulse 1.5s infinite" : "none",
    }} />
  );
}

function ChatMessage({ role, text }: { role: string; text: string }) {
  const isUser = role === "user";
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      marginBottom: 20,
    }}>
      <div style={{
        fontSize: 9,
        fontFamily: mono,
        fontWeight: 500,
        color: C.textMuted,
        marginBottom: 6,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>
        {isUser ? "You" : "Quest AI"}
      </div>
      <div style={{
        maxWidth: "85%",
        padding: "12px 16px",
        borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
        background: isUser ? C.navyDeep : C.parchment,
        color: isUser ? C.white : C.textPrimary,
        border: isUser ? "none" : `1px solid ${C.border}`,
        fontFamily: sans,
        fontSize: 14,
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}>
        {text}
      </div>
    </div>
  );
}

function ChatPanel({ messages, mode }: { messages: any[]; mode: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: C.white,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${C.borderLight}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        background: C.parchment,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: C.green,
          boxShadow: `0 0 8px ${C.green}`,
        }} />
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 500,
          color: C.textSecondary,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          {mode === MODES.REVIEW ? "Review Session" : mode === MODES.BULK ? "Bulk Generation" : "Generation Session"}
        </span>
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          color: C.textMuted,
          marginLeft: "auto",
          textTransform: "uppercase",
        }}>
          MEDI-531
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px",
      }}>
        {messages.map((m, i) => <ChatMessage key={i} role={m.role} text={m.text} />)}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 20px",
        borderTop: `1px solid ${C.borderLight}`,
        flexShrink: 0,
        background: C.parchment,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: C.white,
          borderRadius: 8,
          padding: "10px 14px",
          border: `1px solid ${C.border}`,
        }}>
          <input
            type="text"
            placeholder={mode === MODES.REVIEW ? "Suggest changes to this question..." : "Guide the generation..."}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.ink,
              fontFamily: sans,
              fontSize: 14,
            }}
          />
          <button style={{
            background: C.green,
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            color: C.white,
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}>
            Send
          </button>
        </div>

        {/* Extracted Params */}
        {mode !== MODES.REVIEW && (
          <div style={{
            display: "flex",
            gap: 6,
            marginTop: 12,
            flexWrap: "wrap",
          }}>
            <Tag color="#a78bfa" bg="rgba(167,139,250,0.12)">Bloom 4</Tag>
            <Tag color={C.green} bg={`${C.green}15`}>ACS Pathogenesis</Tag>
            <Tag color={C.blueMid}>Clinical Vignette</Tag>
            <Tag color="#fa9d33" bg="rgba(251,191,36,0.12)">Diverse Demographics</Tag>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionRow({ opt, showMisconception }: { opt: any; showMisconception: boolean }) {
  return (
    <div style={{
      padding: "12px 16px",
      marginBottom: 8,
      borderRadius: 8,
      background: opt.correct ? `${C.green}10` : C.parchment,
      border: `1px solid ${opt.correct ? `${C.green}40` : C.border}`,
    }}>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}>
        <span style={{
          fontFamily: mono,
          fontSize: 12,
          fontWeight: 700,
          color: opt.correct ? C.green : C.textSecondary,
          minWidth: 24,
        }}>
          {opt.letter}.
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: sans,
            fontSize: 14,
            color: C.textPrimary,
            lineHeight: 1.6,
          }}>
            {opt.text}
          </div>
          {showMisconception && opt.misconception && (
            <div style={{
              marginTop: 8,
              fontFamily: sans,
              fontSize: 12,
              color: "#d97706",
              background: "rgba(251,191,36,0.08)",
              padding: "6px 10px",
              borderRadius: 6,
              lineHeight: 1.5,
              border: "1px solid rgba(251,191,36,0.2)",
            }}>
              ⚡ {opt.misconception}
            </div>
          )}
        </div>
        {opt.correct && (
          <span style={{
            fontSize: 11,
            fontFamily: mono,
            fontWeight: 600,
            color: C.green,
            textTransform: "uppercase",
          }}>
            ✓ Key
          </span>
        )}
      </div>
    </div>
  );
}

function QuestionPreview({ question, showRationale }: { question: any; showRationale: boolean }) {
  return (
    <div style={{ padding: "0 4px" }}>
      {/* Question Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: mono,
            fontSize: 12,
            fontWeight: 600,
            color: C.navyDeep,
          }}>
            {question.id}
          </span>
          <Tag
            color={question.status === "draft" ? "#d97706" : C.green}
            bg={question.status === "draft" ? "rgba(251,191,36,0.12)" : `${C.green}15`}
          >
            {question.status}
          </Tag>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag color="#a78bfa" bg="rgba(167,139,250,0.12)">Bloom {question.tags.bloom}</Tag>
          <Tag color={C.blueMid}>{question.tags.system}</Tag>
          <Tag color={C.textMuted}>d={question.tags.difficulty}</Tag>
        </div>
      </div>

      {/* Vignette */}
      <div style={{
        background: C.parchment,
        borderRadius: 8,
        padding: "16px 18px",
        marginBottom: 16,
        border: `1px solid ${C.border}`,
        fontFamily: sans,
        fontSize: 14,
        color: C.textPrimary,
        lineHeight: 1.7,
      }}>
        {question.vignette}
      </div>

      {/* Stem */}
      <div style={{
        fontFamily: serif,
        fontSize: 16,
        fontWeight: 600,
        color: C.navyDeep,
        marginBottom: 16,
        lineHeight: 1.5,
      }}>
        {question.stem}
      </div>

      {/* Options */}
      <div style={{ marginBottom: 24 }}>
        {question.options.map((o: any, i: number) => (
          <OptionRow key={i} opt={o} showMisconception={showRationale} />
        ))}
      </div>

      {/* ECD Metadata */}
      {showRationale && (
        <>
          {/* Toulmin Argument */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              color: C.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}>
              Toulmin Argument Chain
            </div>
            <div style={{
              background: C.parchment,
              borderRadius: 8,
              padding: "16px 18px",
              border: `1px solid ${C.border}`,
            }}>
              {Object.entries(question.toulmin).map(([k, v]) => (
                <div key={k} style={{
                  marginBottom: 10,
                  display: "flex",
                  gap: 12,
                }}>
                  <span style={{
                    fontFamily: mono,
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.navyDeep,
                    minWidth: 80,
                    textTransform: "capitalize",
                  }}>
                    {k}
                  </span>
                  <span style={{
                    fontFamily: sans,
                    fontSize: 13,
                    color: C.textSecondary,
                    lineHeight: 1.6,
                    flex: 1,
                  }}>
                    {v as string}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Source Provenance */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              color: C.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}>
              Source Provenance
            </div>
            {question.sources.map((s: any, i: number) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: C.parchment,
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                marginBottom: 6,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <span style={{ fontSize: 16 }}>
                    {s.type === "lecture" ? "📑" : "🎯"}
                  </span>
                  <span style={{
                    fontFamily: sans,
                    fontSize: 13,
                    color: C.textPrimary,
                  }}>
                    {s.ref}
                  </span>
                </div>
                <span style={{
                  fontFamily: mono,
                  fontSize: 11,
                  fontWeight: 600,
                  color: s.confidence > 0.9 ? C.green : "#fa9d33",
                }}>
                  {(s.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* ECD Mapping */}
          <div>
            <div style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              color: C.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}>
              ECD Mapping
            </div>
            <div style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}>
              <Tag color="#a78bfa" bg="rgba(167,139,250,0.12)">
                {question.proficiencyVariable}
              </Tag>
              <Tag color={C.green} bg={`${C.green}15`}>
                {question.taskShell}
              </Tag>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SyllabusView() {
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{
        fontFamily: serif,
        fontSize: 18,
        fontWeight: 700,
        color: C.navyDeep,
        marginBottom: 6,
      }}>
        {mockSyllabus.course}
      </div>
      <div style={{
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 500,
        color: C.textMuted,
        marginBottom: 20,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>
        Learning Objectives — {mockSyllabus.objectives.filter(o => !o.covered).length} Uncovered
      </div>
      {mockSyllabus.objectives.map((obj) => (
        <div key={obj.id} style={{
          padding: "14px 16px",
          marginBottom: 8,
          borderRadius: 8,
          background: obj.covered ? C.parchment : "rgba(251,191,36,0.08)",
          border: `1px solid ${obj.covered ? C.border : "rgba(251,191,36,0.25)"}`,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = obj.covered ? C.blueMid : "#fa9d33";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = obj.covered ? C.border : "rgba(251,191,36,0.25)";
        }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}>
            <span style={{
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 600,
              color: obj.covered ? C.green : "#d97706",
              textTransform: "uppercase",
            }}>
              {obj.id}
            </span>
            <div style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}>
              <Tag color="#a78bfa" bg="rgba(167,139,250,0.12)">
                B{obj.bloom}
              </Tag>
              {obj.covered ? (
                <span style={{
                  fontSize: 11,
                  fontFamily: mono,
                  fontWeight: 600,
                  color: C.green,
                  textTransform: "uppercase",
                }}>
                  ✓ Covered
                </span>
              ) : (
                <span style={{
                  fontSize: 11,
                  fontFamily: mono,
                  fontWeight: 600,
                  color: "#d97706",
                  textTransform: "uppercase",
                }}>
                  ○ Gap
                </span>
              )}
            </div>
          </div>
          <div style={{
            fontFamily: sans,
            fontSize: 13,
            color: C.textPrimary,
            lineHeight: 1.6,
          }}>
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
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <div>
          <div style={{
            fontFamily: serif,
            fontSize: 18,
            fontWeight: 700,
            color: C.navyDeep,
          }}>
            Batch Generation
          </div>
          <div style={{
            fontFamily: mono,
            fontSize: 10,
            fontWeight: 500,
            color: C.textMuted,
            marginTop: 4,
            textTransform: "uppercase",
          }}>
            {mockBulkQueue.filter(q => q.status === "complete").length}/{mockBulkQueue.length} Complete
          </div>
        </div>
        <div style={{
          width: 140,
          height: 8,
          background: C.parchment,
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: `${(mockBulkQueue.filter(q => q.status === "complete").length / mockBulkQueue.length) * 100}%`,
            height: "100%",
            background: C.navyDeep,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {mockBulkQueue.map((q) => (
        <div key={q.id} style={{
          padding: "14px 16px",
          marginBottom: 8,
          borderRadius: 8,
          background: q.status === "generating" ? `${C.blueMid}10` : C.parchment,
          border: `1px solid ${q.status === "generating" ? C.blueMid : C.border}`,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (q.status !== "generating") {
            e.currentTarget.style.borderColor = C.blueMid;
          }
        }}
        onMouseLeave={(e) => {
          if (q.status !== "generating") {
            e.currentTarget.style.borderColor = C.border;
          }
        }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <StatusDot status={q.status} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 500,
                color: C.textPrimary,
              }}>
                {q.target}
              </div>
              <div style={{
                display: "flex",
                gap: 8,
                marginTop: 6,
              }}>
                <Tag color="#a78bfa" bg="rgba(167,139,250,0.12)">
                  B{q.bloom}
                </Tag>
                {q.score && (
                  <Tag color={C.green} bg={`${C.green}15`}>
                    Quality: {q.score}
                  </Tag>
                )}
              </div>
            </div>
            <span style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              color: C.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              {q.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContextPanel({ mode, contextView, setContextView }: {
  mode: string;
  contextView: string;
  setContextView: (view: string) => void;
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
        { key: CONTEXT_VIEWS.COVERAGE, label: "Coverage" }
      ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: C.white,
    }}>
      {/* Header with tabs */}
      <div style={{
        borderBottom: `1px solid ${C.borderLight}`,
        flexShrink: 0,
        background: C.parchment,
      }}>
        <div style={{
          display: "flex",
          padding: "0 16px",
          gap: 0,
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex" }}>
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setContextView(tab.key)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: contextView === tab.key
                    ? `3px solid ${C.navyDeep}`
                    : "3px solid transparent",
                  padding: "14px 16px",
                  cursor: "pointer",
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
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
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingRight: 4,
            }}>
              <button style={{
                background: `${C.green}15`,
                border: `1px solid ${C.green}40`,
                borderRadius: 6,
                padding: "6px 12px",
                color: C.green,
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                ✓ Approve
              </button>
              <button style={{
                background: "rgba(251,191,36,0.12)",
                border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: 6,
                padding: "6px 12px",
                color: "#d97706",
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                ✏ Edit
              </button>
              <button style={{
                background: `${C.red}15`,
                border: `1px solid ${C.red}40`,
                borderRadius: 6,
                padding: "6px 12px",
                color: C.red,
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                ✕ Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: 20,
      }}>
        {contextView === CONTEXT_VIEWS.SYLLABUS && <SyllabusView />}
        {contextView === CONTEXT_VIEWS.QUESTION && (
          <QuestionPreview
            question={mockQuestion}
            showRationale={mode === MODES.REVIEW}
          />
        )}
        {contextView === CONTEXT_VIEWS.QUEUE && <BulkQueueView />}
        {contextView === CONTEXT_VIEWS.COVERAGE && (
          <div style={{
            fontFamily: sans,
            fontSize: 14,
            color: C.textMuted,
            textAlign: "center",
            paddingTop: 60,
            lineHeight: 1.6,
          }}>
            Coverage map visualization would render here — showing SubConcept nodes
            colored by assessment coverage, with gap highlighting.
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestWorkbench() {
  const [mode, setMode] = useState(MODES.GENERATE);
  const [contextView, setContextView] = useState(CONTEXT_VIEWS.SYLLABUS);

  const messages = mode === MODES.REVIEW ? reviewConvo : generateConvo;

  // Auto-switch context when mode changes
  useEffect(() => {
    if (mode === MODES.REVIEW) setContextView(CONTEXT_VIEWS.QUESTION);
    else if (mode === MODES.BULK) setContextView(CONTEXT_VIEWS.QUEUE);
    else setContextView(CONTEXT_VIEWS.SYLLABUS);
  }, [mode]);

  return (
    <div style={{
      width: "100%",
      height: "100vh",
      background: C.cream,
      display: "flex",
      flexDirection: "column",
      fontFamily: sans,
    }}>
      {/* Top Bar */}
      <div style={{
        height: 56,
        borderBottom: `1px solid ${C.borderLight}`,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        justifyContent: "space-between",
        flexShrink: 0,
        background: C.white,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <span style={{
            fontFamily: serif,
            fontSize: 20,
            fontWeight: 700,
            color: C.navyDeep,
            letterSpacing: "-0.01em",
          }}>
            Quest
          </span>
          <span style={{
            width: 1,
            height: 24,
            background: C.border,
          }} />
          <span style={{
            fontFamily: mono,
            fontSize: 10,
            fontWeight: 500,
            color: C.textMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            Workbench
          </span>
        </div>

        {/* Mode Switcher */}
        <div style={{
          display: "flex",
          gap: 4,
          background: C.parchment,
          borderRadius: 8,
          padding: 4,
          border: `1px solid ${C.border}`,
        }}>
          {[
            { key: MODES.GENERATE, label: "Generate" },
            { key: MODES.BULK, label: "Bulk" },
            { key: MODES.REVIEW, label: "Review" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                background: mode === m.key ? C.navyDeep : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 600,
                color: mode === m.key ? C.white : C.textSecondary,
                transition: "all 0.2s ease",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{
          fontFamily: sans,
          fontSize: 13,
          color: C.textSecondary,
        }}>
          Dr. Williams • MSM
        </div>
      </div>

      {/* Split Pane */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
      }}>
        {/* Left: Chat */}
        <div style={{
          width: "45%",
          borderRight: `1px solid ${C.borderLight}`,
          display: "flex",
          flexDirection: "column",
        }}>
          <ChatPanel messages={messages} mode={mode} />
        </div>

        {/* Right: Context */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}>
          <ContextPanel
            mode={mode}
            contextView={contextView}
            setContextView={setContextView}
          />
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        input::placeholder {
          color: ${C.textMuted};
        }
      `}</style>
    </div>
  );
}
