'use client';

import { C, mono } from '@/lib/design-tokens';
import { Tag } from './workbench-shared';
import { PIPELINE_NODES } from './workbench-shared';
import type { WorkbenchState } from '@journey-os/shared-types';

export function PipelineStatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    idle: C.textMuted, running: "#fa9d33", completed: C.green, failed: C.red,
  };
  const color = colorMap[status] || C.textMuted;
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%", background: color,
      boxShadow: status === "running" ? `0 0 8px ${color}` : "none",
      animation: status === "running" ? "pulse 1.5s infinite" : "none",
      display: "inline-block",
    }} />
  );
}

export function inferActiveNode(state: WorkbenchState): number {
  if (state.pipelineStatus === 'idle') return -1;
  if (state.pipelineStatus === 'completed') return PIPELINE_NODES.length;
  if (state.pipelineStatus === 'failed') return -1;
  if (state.validationResults?.length > 0) return 6;
  if (state.options?.length > 0) return 5;
  if (state.stem) return 4;
  if (state.vignette) return 3;
  if (state.context) return 2;
  if (state.targetConcepts?.length > 0) return 1;
  return 0;
}

export function PipelineStepper({ activeNode }: { activeNode: number }) {
  if (activeNode < 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2,
      padding: "10px 20px", background: C.white,
      borderBottom: `1px solid ${C.borderLight}`, flexShrink: 0,
    }}>
      {PIPELINE_NODES.map((node, i) => {
        const isDone = i < activeNode;
        const isActive = i === activeNode;
        return (
          <div key={node.key} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 4,
              background: isDone ? `${C.green}15` : isActive ? `${C.navyDeep}12` : 'transparent',
              transition: "all 0.3s ease",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isDone ? C.green : isActive ? C.navyDeep : C.border,
                boxShadow: isActive ? `0 0 6px ${C.navyDeep}40` : "none",
                animation: isActive ? "pulse 1.5s infinite" : "none",
                display: "inline-block", flexShrink: 0,
              }} />
              <span style={{
                fontFamily: mono, fontSize: 9,
                fontWeight: isDone || isActive ? 600 : 400,
                color: isDone ? C.green : isActive ? C.navyDeep : C.textMuted,
                textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
              }}>
                {node.label}
              </span>
            </div>
            {i < PIPELINE_NODES.length - 1 && (
              <div style={{ width: 12, height: 1, background: isDone ? C.green : C.border, flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TargetConceptsBar({ concepts }: { concepts: string[] }) {
  if (concepts.length === 0) return null;
  return (
    <div style={{
      display: "flex", gap: 6, padding: "8px 20px",
      background: C.parchment, borderBottom: `1px solid ${C.borderLight}`,
      flexWrap: "wrap", flexShrink: 0,
    }}>
      <span style={{
        fontFamily: mono, fontSize: 9, fontWeight: 500, color: C.textMuted,
        textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center",
      }}>
        Targets:
      </span>
      {concepts.map((concept, i) => (
        <Tag key={i} color={C.green} bg={`${C.green}15`}>{concept}</Tag>
      ))}
    </div>
  );
}
