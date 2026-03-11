'use client';

import { C, sans, serif, mono } from '@/lib/design-tokens';
import { Tag } from './workbench-shared';
import type { QuestionOption, QuestionData } from './workbench-shared';

export type { QuestionData };

function OptionRow({ opt, showMisconception }: { opt: QuestionOption; showMisconception: boolean }) {
  return (
    <div style={{
      padding: "12px 16px", marginBottom: 8, borderRadius: 8,
      background: opt.correct ? `${C.green}10` : C.parchment,
      border: `1px solid ${opt.correct ? `${C.green}40` : C.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{
          fontFamily: mono, fontSize: 12, fontWeight: 700,
          color: opt.correct ? C.green : C.textSecondary, minWidth: 24,
        }}>
          {opt.letter}.
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary, lineHeight: 1.6 }}>
            {opt.text}
          </div>
          {showMisconception && opt.misconception && (
            <div style={{
              marginTop: 8, fontFamily: sans, fontSize: 12, color: "#d97706",
              background: "rgba(251,191,36,0.08)", padding: "6px 10px", borderRadius: 6,
              lineHeight: 1.5, border: "1px solid rgba(251,191,36,0.2)",
            }}>
              Misconception: {opt.misconception}
            </div>
          )}
        </div>
        {opt.correct && (
          <span style={{ fontSize: 11, fontFamily: mono, fontWeight: 600, color: C.green, textTransform: "uppercase" }}>
            Key
          </span>
        )}
      </div>
    </div>
  );
}

export function QuestionPreview({ question, showRationale }: { question: QuestionData; showRationale: boolean }) {
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: C.navyDeep }}>
            {question.id}
          </span>
          <Tag
            color={question.status === "draft" ? "#d97706" : question.status === "completed" ? C.green : C.textMuted}
            bg={question.status === "draft" ? "rgba(251,191,36,0.12)" : question.status === "completed" ? `${C.green}15` : undefined}
          >
            {question.status}
          </Tag>
        </div>
        {question.tags.bloom > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag color="#a78bfa" bg="rgba(167,139,250,0.12)">Bloom {question.tags.bloom}</Tag>
            {question.tags.system && <Tag color={C.blueMid}>{question.tags.system}</Tag>}
            {question.tags.difficulty > 0 && <Tag color={C.textMuted}>d={question.tags.difficulty}</Tag>}
          </div>
        )}
      </div>

      {question.vignette && (
        <div style={{
          background: C.parchment, borderRadius: 8, padding: "16px 18px", marginBottom: 16,
          border: `1px solid ${C.border}`, fontFamily: sans, fontSize: 14,
          color: C.textPrimary, lineHeight: 1.7,
        }}>
          {question.vignette}
        </div>
      )}

      {question.stem && (
        <div style={{
          fontFamily: serif, fontSize: 16, fontWeight: 600,
          color: C.navyDeep, marginBottom: 16, lineHeight: 1.5,
        }}>
          {question.stem}
        </div>
      )}

      {question.options.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {question.options.map((o, i: number) => (
            <OptionRow key={i} opt={o} showMisconception={showRationale} />
          ))}
        </div>
      )}

      {!question.vignette && !question.stem && question.status === 'running' && (
        <div style={{
          fontFamily: sans, fontSize: 14, color: C.textMuted,
          textAlign: "center", paddingTop: 40, lineHeight: 1.6,
        }}>
          Generating question... content will stream here as it&apos;s created.
        </div>
      )}
    </div>
  );
}
