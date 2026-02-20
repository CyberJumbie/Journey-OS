/**
 * OrphanConceptsRule — finds SubConcept nodes with no TEACHES edges.
 * [STORY-IA-12] Neo4j-based rule. Severity: warning.
 */

import type { Driver } from "neo4j-driver";
import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

const MAX_AFFECTED_NODES = 100;

export class OrphanConceptsRule implements LintRule {
  readonly id = "orphan-concepts";
  readonly name = "Orphan Concepts";
  readonly description = "SubConcept nodes with no TEACHES edges";
  readonly default_severity = "warning" as const;

  readonly #neo4jDriver: Driver | null;

  constructor(neo4jDriver: Driver | null) {
    this.#neo4jDriver = neo4jDriver;
  }

  async execute(context: LintContext): Promise<readonly LintFinding[]> {
    if (!this.#neo4jDriver) {
      return [];
    }

    const session = this.#neo4jDriver.session({ database: "neo4j" });
    try {
      const query =
        context.mode === "delta" && context.since
          ? `MATCH (sc:SubConcept {institution_id: $institutionId})
             WHERE sc.updated_at >= $since
               AND NOT (sc)-[:TEACHES]->()
             RETURN sc.id AS id`
          : `MATCH (sc:SubConcept {institution_id: $institutionId})
             WHERE NOT (sc)-[:TEACHES]->()
             RETURN sc.id AS id`;

      const result = await session.run(query, {
        institutionId: context.institution_id,
        ...(context.since ? { since: context.since } : {}),
      });

      const orphanIds = result.records.map((r) => r.get("id") as string);

      if (orphanIds.length === 0) {
        return [];
      }

      const displayIds = orphanIds.slice(0, MAX_AFFECTED_NODES);
      const count = orphanIds.length;

      return [
        {
          rule_id: this.id,
          severity: this.default_severity,
          affected_nodes: displayIds,
          message: `${count} SubConcept node${count === 1 ? "" : "s"} have no TEACHES edges`,
          suggested_fix:
            "Link these SubConcepts to a course or delete if unused",
        },
      ];
    } finally {
      await session.close();
    }
  }
}
