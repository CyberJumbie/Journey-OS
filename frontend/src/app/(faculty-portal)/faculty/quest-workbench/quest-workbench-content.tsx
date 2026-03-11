'use client';

import { useState, useEffect } from "react";
import { useCoAgent } from '@copilotkit/react-core';
import { C, sans, serif, mono } from '@/lib/design-tokens';
import CopilotKitAppProvider from '@/providers/CopilotKitProvider';
import { useCurrentUser } from '@/hooks/useAuthMutations';
import { MODES, CONTEXT_VIEWS, CourseSelector, mapAgentOptionsToUI } from './workbench-shared';
import { inferActiveNode } from './pipeline-stepper';
import { ChatPanel } from './chat-panel';
import { ContextPanel } from './context-panel';
import type { QuestionData } from './question-preview';
import type { WorkbenchState } from '@journey-os/shared-types';

const INITIAL_STATE: WorkbenchState = {
  mode: 'single',
  courseId: '',
  userMessage: '',
  targetConcepts: [],
  context: '',
  vignette: '',
  stem: '',
  options: [],
  validationResults: [],
  pipelineStatus: 'idle',
  generationLogId: '',
  itemId: '',
  sourceChunkIds: [],
  // Phase 2 fields
  tags: null,
  criticScores: null,
  criticComposite: null,
  toulmin: null,
  autoRoute: null,
  retryCount: 0,
  isDuplicate: false,
  dupSimilarity: null,
  dupItemId: null,
  taskShellId: null,
  generationParams: null,
  // Review mode fields (P2-007)
  reviewItemId: null,
  editInstruction: null,
  editedSections: [],
  // Refinement routing (P2-009)
  refinementTarget: null,
};

function QuestWorkbenchInner() {
  const [mode, setMode] = useState(MODES.GENERATE);
  const [contextView, setContextView] = useState(CONTEXT_VIEWS.SYLLABUS);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedCourseLabel, setSelectedCourseLabel] = useState<string | null>(null);

  const { data: currentUser } = useCurrentUser();
  const displayName = (currentUser?.display_name as string | undefined)
    || (currentUser?.email?.split('@')[0] ?? 'Faculty');

  const { state: agentState, setState: setAgentState } = useCoAgent<WorkbenchState>({
    name: 'journey_generation',
    initialState: INITIAL_STATE,
  });

  const pipelineStatus = agentState.pipelineStatus || 'idle';
  const activeNode = inferActiveNode(agentState);

  const handleCourseSelect = (courseId: string, courseLabel: string) => {
    setSelectedCourseId(courseId);
    setSelectedCourseLabel(courseLabel);
    setAgentState(prev => ({ ...(prev ?? INITIAL_STATE), courseId }));
  };

  const questionFromAgent: QuestionData | null =
    (agentState.vignette || agentState.stem || (agentState.options?.length ?? 0) > 0 || pipelineStatus === 'running')
      ? {
          id: agentState.itemId || (pipelineStatus === 'completed' ? 'Saved' : 'Generating...'),
          status: pipelineStatus === 'completed' ? 'draft' : pipelineStatus,
          vignette: agentState.vignette || '',
          stem: agentState.stem || '',
          options: mapAgentOptionsToUI(agentState.options || []),
          tags: { bloom: 0, system: '', discipline: '', difficulty: 0 },
        }
      : null;

  // Consolidated tab-switching: validation > preview > mode default
  useEffect(() => {
    if (mode === MODES.GENERATE) {
      if ((agentState.validationResults?.length ?? 0) > 0) {
        setContextView(CONTEXT_VIEWS.VALIDATION);
      } else if (agentState.vignette || agentState.stem) {
        setContextView(CONTEXT_VIEWS.QUESTION);
      } else {
        setContextView(CONTEXT_VIEWS.SYLLABUS);
      }
    } else if (mode === MODES.REVIEW) {
      setContextView(CONTEXT_VIEWS.QUESTION);
    } else if (mode === MODES.BULK) {
      setContextView(CONTEXT_VIEWS.QUEUE);
    }
  }, [mode, agentState.vignette, agentState.stem, agentState.validationResults]);

  return (
    <div style={{
      width: "100%", height: "100vh", background: C.cream,
      display: "flex", flexDirection: "column", fontFamily: sans,
    }}>
      {/* Top Bar */}
      <div style={{
        height: 56, borderBottom: `1px solid ${C.borderLight}`,
        display: "flex", alignItems: "center", padding: "0 24px",
        justifyContent: "space-between", flexShrink: 0, background: C.white,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontFamily: serif, fontSize: 20, fontWeight: 700,
            color: C.navyDeep, letterSpacing: "-0.01em",
          }}>
            Quest
          </span>
          <span style={{ width: 1, height: 24, background: C.border }} />
          <span style={{
            fontFamily: mono, fontSize: 10, fontWeight: 500,
            color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            Workbench
          </span>
          <span style={{ width: 1, height: 24, background: C.border, marginLeft: 4 }} />
          <CourseSelector selectedCourseId={selectedCourseId} onSelect={handleCourseSelect} />
        </div>

        {/* Mode Switcher */}
        <div style={{
          display: "flex", gap: 4, background: C.parchment,
          borderRadius: 8, padding: 4, border: `1px solid ${C.border}`,
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
                border: "none", borderRadius: 6, padding: "8px 16px",
                cursor: "pointer", fontFamily: sans, fontSize: 13, fontWeight: 600,
                color: mode === m.key ? C.white : C.textSecondary,
                transition: "all 0.2s ease",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary }}>
          {displayName}
        </div>
      </div>

      {/* Split Pane */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{
          width: "45%", borderRight: `1px solid ${C.borderLight}`,
          display: "flex", flexDirection: "column",
        }}>
          <ChatPanel
            mode={mode}
            selectedCourse={selectedCourseLabel}
            pipelineStatus={pipelineStatus}
            activeNode={activeNode}
            targetConcepts={agentState.targetConcepts || []}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ContextPanel
            mode={mode}
            contextView={contextView}
            setContextView={setContextView}
            question={questionFromAgent}
            validationResults={agentState.validationResults || []}
          />
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .quest-copilot-chat-wrapper {
          --copilot-kit-primary-color: ${C.navyDeep};
          --copilot-kit-contrast-color: ${C.white};
          --copilot-kit-background-color: ${C.white};
          --copilot-kit-input-background-color: ${C.parchment};
          --copilot-kit-secondary-color: ${C.parchment};
          --copilot-kit-secondary-contrast-color: ${C.textPrimary};
          --copilot-kit-separator-color: ${C.borderLight};
          --copilot-kit-muted-color: ${C.textMuted};
        }
        .quest-copilot-chat {
          height: 100% !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          font-family: ${sans} !important;
        }
      `}</style>
    </div>
  );
}

export default function QuestWorkbenchContent() {
  return (
    <CopilotKitAppProvider>
      <QuestWorkbenchInner />
    </CopilotKitAppProvider>
  );
}
