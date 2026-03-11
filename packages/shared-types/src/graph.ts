// packages/shared-types/src/graph.ts
// Types for all Neo4j node labels used in Phase 1.
// Skinny graph nodes: only uuid + minimal identifying fields (< 100 bytes).
// Full text lives in Supabase (Rule 4).

import { z } from 'zod';

// ── Shared Fields ──────────────────────────────────────────────────────────────

const BaseNodeSchema = z.object({
  uuid: z.string().uuid(),
});

// ── Institutional Nodes (PascalCase) ───────────────────────────────────────────

export const InstitutionNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
});
export type InstitutionNode = z.infer<typeof InstitutionNodeSchema>;

export const SchoolNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
});
export type SchoolNode = z.infer<typeof SchoolNodeSchema>;

export const ProgramNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
  degree: z.string(),
});
export type ProgramNode = z.infer<typeof ProgramNodeSchema>;

export const CourseNodeSchema = BaseNodeSchema.extend({
  code: z.string(),
  name: z.string(),
});
export type CourseNode = z.infer<typeof CourseNodeSchema>;

export const BlockNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
});
export type BlockNode = z.infer<typeof BlockNodeSchema>;

export const CurricularPhaseNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
});
export type CurricularPhaseNode = z.infer<typeof CurricularPhaseNodeSchema>;

export const AcademicYearNodeSchema = BaseNodeSchema.extend({
  year: z.number().int(),
});
export type AcademicYearNode = z.infer<typeof AcademicYearNodeSchema>;

// ── Content Nodes (PascalCase) ─────────────────────────────────────────────────

export const SubConceptNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
});
export type SubConceptNode = z.infer<typeof SubConceptNodeSchema>;

export const ContentChunkNodeSchema = BaseNodeSchema.extend({
  source_type: z.enum(['syllabus', 'lecture_slide', 'textbook', 'other']),
});
export type ContentChunkNode = z.infer<typeof ContentChunkNodeSchema>;

export const AssessmentItemNodeSchema = BaseNodeSchema.extend({
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected', 'retired']),
  bloom_level: z.number().int(),
});
export type AssessmentItemNode = z.infer<typeof AssessmentItemNodeSchema>;

// ── Framework Nodes (SCREAMING_SNAKE) ──────────────────────────────────────────

export const USMLESystemNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
  code: z.string(),
});
export type USMLESystemNode = z.infer<typeof USMLESystemNodeSchema>;

export const USMLEDisciplineNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
  code: z.string(),
});
export type USMLEDisciplineNode = z.infer<typeof USMLEDisciplineNodeSchema>;

export const USMLETaskNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
});
export type USMLETaskNode = z.infer<typeof USMLETaskNodeSchema>;

export const USMLETopicNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
});
export type USMLETopicNode = z.infer<typeof USMLETopicNodeSchema>;

export const BloomLevelNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
  level: z.number().int().min(1).max(6),
});
export type BloomLevelNode = z.infer<typeof BloomLevelNodeSchema>;

export const LCMEStandardNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
  number: z.number().int(),
});
export type LCMEStandardNode = z.infer<typeof LCMEStandardNodeSchema>;

export const LCMEElementNodeSchema = BaseNodeSchema.extend({
  name: z.string(),
  code: z.string(),
});
export type LCMEElementNode = z.infer<typeof LCMEElementNodeSchema>;

// ── Relationship Types (documentation — used in Cypher MERGE) ──────────────────

export type Neo4jRelationship =
  | 'HAS_SCHOOL'
  | 'OFFERS_PROGRAM'
  | 'HAS_TRACK'
  | 'IN_YEAR'
  | 'HAS_PHASE'
  | 'CONTAINS_BLOCK'
  | 'OFFERS_COURSE'
  | 'HAS_SECTION'
  | 'IN_TERM'
  | 'HAS_ILO'
  | 'TEACHES'
  | 'TEACHES_VERIFIED'
  | 'MAPS_TO'
  | 'TARGETS'
  | 'AT_BLOOM'
  | 'IN_COURSE'
  | 'GENERATED_FROM'
  | 'HAS_TOPIC';
