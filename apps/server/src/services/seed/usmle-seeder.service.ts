import type {
  SeedResult,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { USMLE_SYSTEMS } from "./data/usmle-systems.data";
import { USMLE_DISCIPLINES } from "./data/usmle-disciplines.data";
import { USMLE_TASKS } from "./data/usmle-tasks.data";
import { USMLE_TOPICS } from "./data/usmle-topics.data";

const EXPECTED_COUNTS = {
  USMLE_System: 16,
  USMLE_Discipline: 7,
  USMLE_Task: 4,
  USMLE_Topic: 200,
  total: 227,
} as const;

const SYSTEM_MERGE_QUERY = `
MERGE (n:USMLE_System {code: $code})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.level = $level, n.sort_order = $sort_order
`;

const DISCIPLINE_MERGE_QUERY = `
MERGE (n:USMLE_Discipline {code: $code})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.level = $level, n.sort_order = $sort_order
`;

const TASK_MERGE_QUERY = `
MERGE (n:USMLE_Task {code: $code})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.level = $level, n.sort_order = $sort_order
`;

const TOPIC_MERGE_QUERY = `
MERGE (t:USMLE_Topic {code: $code})
SET t.id = $id, t.name = $name, t.description = $description,
    t.framework = $framework, t.level = $level, t.sort_order = $sort_order,
    t.parent_system = $parent_system
WITH t
MATCH (s:USMLE_System {code: $parent_system})
MERGE (s)-[:HAS_TOPIC]->(t)
`;

const ORPHAN_QUERY = `
MATCH (t:USMLE_Topic) WHERE NOT (:USMLE_System)-[:HAS_TOPIC]->(t)
RETURN count(t) AS orphan_count
`;

/**
 * Seeds USMLE framework data into Neo4j.
 * Creates 227 nodes: 16 systems, 7 disciplines, 4 tasks, 200 topics.
 * Systems must be seeded before topics (HAS_TOPIC relationship depends on system nodes).
 */
export class USMLESeeder extends BaseSeeder {
  readonly name = "usmle";
  readonly label: Neo4jFrameworkLabel = "USMLE_System";

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalRelationships = 0;
    const allErrors: SeedNodeError[] = [];

    const systemResult = await this.executeBatch({
      label: "USMLE_System",
      items: USMLE_SYSTEMS,
      mergeQuery: SYSTEM_MERGE_QUERY,
    });
    totalCreated += systemResult.nodesCreated;
    totalUpdated += systemResult.nodesUpdated;
    allErrors.push(...systemResult.errors);

    const disciplineResult = await this.executeBatch({
      label: "USMLE_Discipline",
      items: USMLE_DISCIPLINES,
      mergeQuery: DISCIPLINE_MERGE_QUERY,
    });
    totalCreated += disciplineResult.nodesCreated;
    totalUpdated += disciplineResult.nodesUpdated;
    allErrors.push(...disciplineResult.errors);

    const taskResult = await this.executeBatch({
      label: "USMLE_Task",
      items: USMLE_TASKS,
      mergeQuery: TASK_MERGE_QUERY,
    });
    totalCreated += taskResult.nodesCreated;
    totalUpdated += taskResult.nodesUpdated;
    allErrors.push(...taskResult.errors);

    const topicResult = await this.executeBatch({
      label: "USMLE_Topic",
      items: USMLE_TOPICS,
      mergeQuery: TOPIC_MERGE_QUERY,
    });
    totalCreated += topicResult.nodesCreated;
    totalUpdated += topicResult.nodesUpdated;
    totalRelationships += topicResult.nodesCreated;
    allErrors.push(...topicResult.errors);

    return {
      framework: "usmle",
      label: this.label,
      nodesCreated: totalCreated,
      nodesUpdated: totalUpdated,
      relationshipsCreated: totalRelationships,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const systemCount = await this.countNodes("USMLE_System");
    const disciplineCount = await this.countNodes("USMLE_Discipline");
    const taskCount = await this.countNodes("USMLE_Task");
    const topicCount = await this.countNodes("USMLE_Topic");
    const totalCount = systemCount + disciplineCount + taskCount + topicCount;

    const orphanCount = await this.#countOrphans();

    const countsMatch =
      systemCount === EXPECTED_COUNTS.USMLE_System &&
      disciplineCount === EXPECTED_COUNTS.USMLE_Discipline &&
      taskCount === EXPECTED_COUNTS.USMLE_Task &&
      topicCount === EXPECTED_COUNTS.USMLE_Topic;

    const passed = countsMatch && orphanCount === 0;

    return {
      framework: "usmle",
      label: this.label,
      expectedCount: EXPECTED_COUNTS.total,
      actualCount: totalCount,
      passed,
      orphanCount,
      details: [
        `Systems: ${systemCount}/${EXPECTED_COUNTS.USMLE_System}`,
        `Disciplines: ${disciplineCount}/${EXPECTED_COUNTS.USMLE_Discipline}`,
        `Tasks: ${taskCount}/${EXPECTED_COUNTS.USMLE_Task}`,
        `Topics: ${topicCount}/${EXPECTED_COUNTS.USMLE_Topic}`,
        `Orphans: ${orphanCount}`,
        `Total: ${totalCount}/${EXPECTED_COUNTS.total}`,
      ].join(", "),
    };
  }

  async #countOrphans(): Promise<number> {
    const session = this.driver.session();
    try {
      const result = await session.run(ORPHAN_QUERY);
      const record = result.records[0];
      if (!record) {
        return 0;
      }
      return record.get("orphan_count").toNumber();
    } finally {
      await session.close();
    }
  }
}
