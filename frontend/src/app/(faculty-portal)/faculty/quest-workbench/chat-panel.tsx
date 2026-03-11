'use client';

import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { C, mono } from '@/lib/design-tokens';
import { MODES } from './workbench-shared';
import { PipelineStatusDot, PipelineStepper, TargetConceptsBar } from './pipeline-stepper';

export function ChatPanel({ mode, selectedCourse, pipelineStatus, activeNode, targetConcepts }: {
  mode: string;
  selectedCourse: string | null;
  pipelineStatus: string;
  activeNode: number;
  targetConcepts: string[];
}) {
  const modeInstructions: Record<string, string> = {
    [MODES.GENERATE]: "You are the Journey OS assessment item generation assistant. When the user asks to generate a question, run the pipeline with their message. Keep responses concise. Guide the faculty through generating NBME-style clinical vignette questions.",
    [MODES.REVIEW]: "You are reviewing an existing assessment item. Help the faculty refine the question, improve distractors, and ensure NBME compliance.",
    [MODES.BULK]: "You are helping the faculty generate multiple assessment items in batch. Guide them through selecting concepts and configuring bulk generation parameters.",
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", background: C.white,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${C.borderLight}`,
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0, background: C.parchment,
      }}>
        <PipelineStatusDot status={pipelineStatus} />
        <span style={{
          fontFamily: mono, fontSize: 10, fontWeight: 500, color: C.textSecondary,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {mode === MODES.REVIEW ? "Review Session" : mode === MODES.BULK ? "Bulk Generation" : "Generation Session"}
        </span>
        <span style={{
          fontFamily: mono, fontSize: 10, color: C.textMuted,
          marginLeft: "auto", textTransform: "uppercase",
        }}>
          {selectedCourse || "No course selected"}
        </span>
      </div>

      <PipelineStepper activeNode={activeNode} />
      <TargetConceptsBar concepts={targetConcepts} />

      {/* CopilotChat — labels.title='' suppresses header content */}
      <div className="quest-copilot-chat-wrapper" style={{ flex: 1, overflow: "hidden" }}>
        <CopilotChat
          className="quest-copilot-chat"
          instructions={modeInstructions[mode] || modeInstructions[MODES.GENERATE]}
          labels={{
            title: '',
            initial: selectedCourse
              ? 'Start a conversation to generate questions. Try:\n"Generate a clinical vignette on ACS pathogenesis"'
              : 'Select a course first to begin generating questions.',
          }}
          suggestions={[
            { title: "Generate a clinical vignette on ACS pathogenesis", message: "Generate a clinical vignette question about ACS pathogenesis for MEDI 531" },
            { title: "Create items for cardiovascular pharmacology", message: "Create 5 items covering cardiovascular pharmacology" },
            { title: "Fill coverage gaps in my syllabus", message: "Help me fill coverage gaps in my syllabus" },
          ]}
        />
      </div>
    </div>
  );
}
