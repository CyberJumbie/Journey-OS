'use client';

import { ChevronDown } from 'lucide-react';
import { C, sans, mono } from '@/lib/design-tokens';
import { useCourses } from '@/hooks/useCourses';
import type { GeneratedOption, ValidationResult } from '@journey-os/shared-types';

// ── Constants ───────────────────────────────────────────────────────────────────

export const MODES = { GENERATE: "generate", REVIEW: "review", BULK: "bulk" };

export const CONTEXT_VIEWS = {
  SYLLABUS: "syllabus",
  QUESTION: "question",
  COVERAGE: "coverage",
  QUEUE: "queue",
  VALIDATION: "validation",
};

export const PIPELINE_NODES = [
  { key: 'init', label: 'Init' },
  { key: 'context_compiler', label: 'Context' },
  { key: 'vignette_builder', label: 'Vignette' },
  { key: 'stem_writer', label: 'Stem' },
  { key: 'distractor_generator', label: 'Options' },
  { key: 'validator', label: 'Validate' },
  { key: 'graph_writer', label: 'Save' },
] as const;

// ── Types ───────────────────────────────────────────────────────────────────────

export interface QuestionOption {
  letter: string;
  text: string;
  correct: boolean;
  misconception: string | null;
}

export interface QuestionData {
  id: string;
  status: string;
  vignette: string;
  stem: string;
  options: QuestionOption[];
  tags: { bloom: number; system: string; discipline: string; difficulty: number };
}

export function mapAgentOptionsToUI(options: GeneratedOption[]): QuestionOption[] {
  return options.map(o => ({
    letter: o.label,
    text: o.text,
    correct: o.is_correct,
    misconception: o.misconception_targeted || null,
  }));
}

// ── Mock Data (not yet wired to real data) ──────────────────────────────────────

export const mockSyllabus = {
  course: "MEDI-531 Cardiovascular System",
  objectives: [
    { id: "LO-1", text: "Describe the pathophysiology of acute coronary syndromes including plaque rupture mechanisms", bloom: 2, covered: true },
    { id: "LO-2", text: "Differentiate between STEMI, NSTEMI, and unstable angina using biomarker and ECG criteria", bloom: 4, covered: true },
    { id: "LO-3", text: "Analyze the role of the RAAS system in heart failure compensation", bloom: 4, covered: false },
    { id: "LO-4", text: "Evaluate pharmacological interventions for acute MI management", bloom: 5, covered: false },
    { id: "LO-5", text: "Explain cardiac biomarker kinetics and their diagnostic windows", bloom: 3, covered: true },
  ],
};

export const mockBulkQueue = [
  { id: 1, target: "ACS plaque pathogenesis", bloom: 4, status: "complete", score: 0.91 },
  { id: 2, target: "Troponin vs CK-MB kinetics", bloom: 3, status: "complete", score: 0.87 },
  { id: 3, target: "RAAS compensation in HF", bloom: 4, status: "generating", score: null },
  { id: 4, target: "Beta-blocker contraindications", bloom: 5, status: "pending", score: null },
  { id: 5, target: "ECG lead localization", bloom: 3, status: "pending", score: null },
  { id: 6, target: "Statin mechanism of action", bloom: 2, status: "pending", score: null },
  { id: 7, target: "Antiplatelet dual therapy", bloom: 4, status: "pending", score: null },
];

// ── Shared UI Components ────────────────────────────────────────────────────────

export function Tag({ children, color = C.blueMid, bg }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: mono, fontWeight: 500, color,
      background: bg || `${color}15`, padding: "3px 8px", borderRadius: 4,
      letterSpacing: "0.05em", textTransform: "uppercase", display: "inline-block",
    }}>
      {children}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const color = status === "complete" ? C.green : status === "generating" ? "#fa9d33" : C.textMuted;
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: color,
      boxShadow: status === "generating" ? `0 0 8px ${color}` : "none",
      animation: status === "generating" ? "pulse 1.5s infinite" : "none",
    }} />
  );
}

// ── Course Selector ─────────────────────────────────────────────────────────────

export function CourseSelector({ selectedCourseId, onSelect }: {
  selectedCourseId: string;
  onSelect: (courseId: string, courseLabel: string) => void;
}) {
  const { data: courses, isLoading } = useCourses();

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={selectedCourseId}
        onChange={(e) => {
          const course = courses?.find(c => c.id === e.target.value);
          if (course) onSelect(course.id, `${course.code} ${course.title}`);
        }}
        style={{
          appearance: "none", background: C.parchment,
          border: `1px solid ${C.border}`, borderRadius: 6,
          padding: "6px 28px 6px 10px", fontFamily: sans, fontSize: 13,
          color: C.textPrimary, cursor: "pointer", outline: "none", minWidth: 180,
        }}
      >
        <option value="">{isLoading ? 'Loading courses...' : 'Select a course'}</option>
        {courses?.map(c => (
          <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
        ))}
      </select>
      <ChevronDown size={14} style={{ position: "absolute", right: 8, pointerEvents: "none", color: C.textMuted }} />
    </div>
  );
}

// ── Validation View ─────────────────────────────────────────────────────────────

export function ValidationView({ results }: { results: ValidationResult[] }) {
  if (results.length === 0) {
    return (
      <div style={{
        fontFamily: sans, fontSize: 14, color: C.textMuted,
        textAlign: "center", paddingTop: 60, lineHeight: 1.6,
      }}>
        No validation results yet. Generate a question to see NBME compliance checks.
      </div>
    );
  }

  const passCount = results.filter(r => r.passed).length;
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, fontWeight: 700, color: C.navyDeep }}>
            NBME Validation
          </div>
          <div style={{
            fontFamily: mono, fontSize: 10, fontWeight: 500, color: C.textMuted,
            marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {passCount}/{results.length} Rules Passed
          </div>
        </div>
        <Tag
          color={passCount === results.length ? C.green : "#d97706"}
          bg={passCount === results.length ? `${C.green}15` : "rgba(251,191,36,0.12)"}
        >
          {passCount === results.length ? "All Passed" : `${results.length - passCount} Warning${results.length - passCount > 1 ? 's' : ''}`}
        </Tag>
      </div>

      {results.map((r, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "12px 16px", marginBottom: 6, borderRadius: 8,
          background: r.passed ? `${C.green}08` : "rgba(251,191,36,0.08)",
          border: `1px solid ${r.passed ? `${C.green}25` : "rgba(251,191,36,0.25)"}`,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
            {r.passed ? '\u2713' : '\u26A0'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: mono, fontSize: 11, fontWeight: 600,
              color: r.passed ? C.green : "#d97706",
              textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2,
            }}>
              {r.rule.replace(/_/g, ' ')}
            </div>
            <div style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
              {r.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
