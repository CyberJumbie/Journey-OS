import { randomUUID } from 'crypto';
import InngestClientSingleton from '../lib/InngestClient';
import SupabaseClientSingleton from '../lib/SupabaseClient';
import Neo4jClient from '../lib/Neo4jClient';
import SocketServer from '../lib/SocketServer';
import type { LintAlertPayload } from '../lib/SocketServer';

/**
 * Shape of a single lint rule result row inserted into kaizen_lint_runs.
 */
interface LintResult {
  run_id: string;
  rule_id: string;
  result: 'pass' | 'fail';
  count: number;
  threshold: number;
  passed: boolean;
  details: Record<string, unknown> | null;
  remediation_applied: boolean;
}

/**
 * Inngest cron function: data-lint
 *
 * Runs nightly at 02:00 UTC. Executes 5 data quality lint rules:
 *   1. sync_status_drift — Supabase items with sync_status='failed'
 *   2. orphan_sub_concepts — Neo4j SubConcepts with no TEACHES edges
 *   3. null_embeddings — content_chunk_embeddings with both embeddings NULL
 *   4. items_without_tags — assessment_items with null bloom_level older than 24h
 *   5. stale_running_logs — generation_logs stuck in 'running' > 2h (auto-remediate)
 *
 * Key rules:
 * - Rule 14: Every lint rule in its own step.run()
 * - INNGEST_NO_THROW: Catch errors inside step.run(), never rethrow
 * - SOCKET_ROOM_PATTERN: Emit lint:alert to admin user rooms
 */
export const dataLintFunction = InngestClientSingleton.getInstance().createFunction(
  {
    id: 'data-lint',
    retries: 1,
  },
  { cron: '0 2 * * *' },
  async ({ step }) => {
    const runId = randomUUID();
    const results: LintResult[] = [];

    // ─── Rule 1: sync_status_drift ──────────────────────────────────────
    const rule1 = await step.run('lint-sync-status-drift', async () => {
      try {
        const supabase = SupabaseClientSingleton.getInstance();
        const { count, error } = await supabase
          .from('assessment_items')
          .select('*', { count: 'exact', head: true })
          .eq('sync_status', 'failed');

        if (error) {
          console.error('[data-lint] sync_status_drift query error:', error.message);
          return {
            run_id: runId,
            rule_id: 'sync_status_drift',
            result: 'fail' as const,
            count: -1,
            threshold: 5,
            passed: false,
            details: { error: error.message },
            remediation_applied: false,
          };
        }

        const itemCount = count ?? 0;
        const passed = itemCount <= 5;
        return {
          run_id: runId,
          rule_id: 'sync_status_drift',
          result: passed ? 'pass' as const : 'fail' as const,
          count: itemCount,
          threshold: 5,
          passed,
          details: null,
          remediation_applied: false,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[data-lint] sync_status_drift error:', msg);
        return {
          run_id: runId,
          rule_id: 'sync_status_drift',
          result: 'fail' as const,
          count: -1,
          threshold: 5,
          passed: false,
          details: { error: msg },
          remediation_applied: false,
        };
      }
    });
    results.push(rule1);

    // ─── Rule 2: orphan_sub_concepts ────────────────────────────────────
    const rule2 = await step.run('lint-orphan-sub-concepts', async () => {
      try {
        const driver = Neo4jClient.getInstance();
        const session = driver.session({ database: 'neo4j' });
        try {
          const totalResult = await session.run(
            'MATCH (sc:SubConcept) RETURN count(sc) AS total',
          );
          const total = (totalResult.records[0]?.get('total') as { toNumber: () => number })?.toNumber() ?? 0;

          const orphanResult = await session.run(
            'MATCH (sc:SubConcept) WHERE NOT ()-[:TEACHES]->(sc) RETURN count(sc) AS orphanCount',
          );
          const orphanCount = (orphanResult.records[0]?.get('orphanCount') as { toNumber: () => number })?.toNumber() ?? 0;

          const threshold = Math.ceil(total * 0.10);
          const passed = orphanCount <= threshold;

          return {
            run_id: runId,
            rule_id: 'orphan_sub_concepts',
            result: passed ? 'pass' as const : 'fail' as const,
            count: orphanCount,
            threshold,
            passed,
            details: { totalSubConcepts: total, orphanPercentage: total > 0 ? Math.round((orphanCount / total) * 100) : 0 },
            remediation_applied: false,
          };
        } finally {
          await session.close();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[data-lint] orphan_sub_concepts error:', msg);
        return {
          run_id: runId,
          rule_id: 'orphan_sub_concepts',
          result: 'fail' as const,
          count: -1,
          threshold: 0,
          passed: false,
          details: { error: msg },
          remediation_applied: false,
        };
      }
    });
    results.push(rule2);

    // ─── Rule 3: null_embeddings ────────────────────────────────────────
    const rule3 = await step.run('lint-null-embeddings', async () => {
      try {
        const supabase = SupabaseClientSingleton.getInstance();
        const { count, error } = await supabase
          .from('content_chunk_embeddings')
          .select('*', { count: 'exact', head: true })
          .is('voyage_embedding', null)
          .is('openai_embedding', null);

        if (error) {
          console.error('[data-lint] null_embeddings query error:', error.message);
          return {
            run_id: runId,
            rule_id: 'null_embeddings',
            result: 'fail' as const,
            count: -1,
            threshold: 0,
            passed: false,
            details: { error: error.message },
            remediation_applied: false,
          };
        }

        const itemCount = count ?? 0;
        const passed = itemCount === 0;
        return {
          run_id: runId,
          rule_id: 'null_embeddings',
          result: passed ? 'pass' as const : 'fail' as const,
          count: itemCount,
          threshold: 0,
          passed,
          details: null,
          remediation_applied: false,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[data-lint] null_embeddings error:', msg);
        return {
          run_id: runId,
          rule_id: 'null_embeddings',
          result: 'fail' as const,
          count: -1,
          threshold: 0,
          passed: false,
          details: { error: msg },
          remediation_applied: false,
        };
      }
    });
    results.push(rule3);

    // ─── Rule 4: items_without_tags ─────────────────────────────────────
    const rule4 = await step.run('lint-items-without-tags', async () => {
      try {
        const supabase = SupabaseClientSingleton.getInstance();
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error } = await supabase
          .from('assessment_items')
          .select('*', { count: 'exact', head: true })
          .is('bloom_level', null)
          .lt('created_at', cutoff);

        if (error) {
          console.error('[data-lint] items_without_tags query error:', error.message);
          return {
            run_id: runId,
            rule_id: 'items_without_tags',
            result: 'fail' as const,
            count: -1,
            threshold: 0,
            passed: false,
            details: { error: error.message },
            remediation_applied: false,
          };
        }

        const itemCount = count ?? 0;
        const passed = itemCount === 0;
        return {
          run_id: runId,
          rule_id: 'items_without_tags',
          result: passed ? 'pass' as const : 'fail' as const,
          count: itemCount,
          threshold: 0,
          passed,
          details: null,
          remediation_applied: false,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[data-lint] items_without_tags error:', msg);
        return {
          run_id: runId,
          rule_id: 'items_without_tags',
          result: 'fail' as const,
          count: -1,
          threshold: 0,
          passed: false,
          details: { error: msg },
          remediation_applied: false,
        };
      }
    });
    results.push(rule4);

    // ─── Rule 5: stale_running_logs (AUTO-REMEDIATE) ────────────────────
    const rule5 = await step.run('lint-stale-running-logs', async () => {
      try {
        const supabase = SupabaseClientSingleton.getInstance();
        const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        // Count stuck rows first
        const { count, error: countError } = await supabase
          .from('generation_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'running')
          .lt('created_at', cutoff);

        if (countError) {
          console.error('[data-lint] stale_running_logs count error:', countError.message);
          return {
            run_id: runId,
            rule_id: 'stale_running_logs',
            result: 'fail' as const,
            count: -1,
            threshold: 0,
            passed: false,
            details: { error: countError.message },
            remediation_applied: false,
          };
        }

        const staleCount = count ?? 0;
        let remediationApplied = false;

        // Auto-remediate: mark stuck rows as failed
        if (staleCount > 0) {
          const { error: updateError } = await supabase
            .from('generation_logs')
            .update({ status: 'failed', error: 'Auto-remediated: stuck in running > 2h' })
            .eq('status', 'running')
            .lt('created_at', cutoff);

          if (updateError) {
            console.error('[data-lint] stale_running_logs remediation error:', updateError.message);
          } else {
            remediationApplied = true;
          }
        }

        const passed = staleCount === 0;
        return {
          run_id: runId,
          rule_id: 'stale_running_logs',
          result: passed ? 'pass' as const : 'fail' as const,
          count: staleCount,
          threshold: 0,
          passed,
          details: remediationApplied ? { remediated: staleCount } : null,
          remediation_applied: remediationApplied,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[data-lint] stale_running_logs error:', msg);
        return {
          run_id: runId,
          rule_id: 'stale_running_logs',
          result: 'fail' as const,
          count: -1,
          threshold: 0,
          passed: false,
          details: { error: msg },
          remediation_applied: false,
        };
      }
    });
    results.push(rule5);

    // ─── Persist results ────────────────────────────────────────────────
    await step.run('persist-lint-results', async () => {
      try {
        const supabase = SupabaseClientSingleton.getInstance();
        const { error } = await supabase
          .from('kaizen_lint_runs')
          .insert(results);

        if (error) {
          console.error('[data-lint] Failed to persist lint results:', error.message);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[data-lint] persist error:', msg);
      }
    });

    // ─── Alert admins if any rule failed ────────────────────────────────
    await step.run('notify-admin-failures', async () => {
      const failedRules = results.filter((r) => !r.passed);
      if (failedRules.length === 0) return;

      try {
        // Query admin users to emit Socket.io alerts
        const supabase = SupabaseClientSingleton.getInstance();
        const { data: admins, error } = await supabase
          .from('user_profiles')
          .select('id')
          .in('role', ['superadmin', 'institutional_admin']);

        if (error || !admins) {
          console.error('[data-lint] Failed to query admin users:', error?.message);
          return;
        }

        const payload: LintAlertPayload = {
          runId,
          failedRules: failedRules.map((r) => ({
            ruleId: r.rule_id,
            count: r.count,
            threshold: r.threshold,
          })),
          runAt: new Date().toISOString(),
        };

        for (const admin of admins) {
          SocketServer.emitToUser(admin.id as string, 'lint:alert', payload);
        }

        console.log(`[data-lint] Alerted ${admins.length} admins about ${failedRules.length} failed rules`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[data-lint] notify error:', msg);
      }
    });

    return { runId, ruleCount: results.length, failedCount: results.filter((r) => !r.passed).length };
  },
);
