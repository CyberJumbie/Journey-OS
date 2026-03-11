import type {
  GenerationHistoryRow,
  GenerationStats,
  GenerationHistoryResponse,
} from '@journey-os/shared-types';
import {
  GenerationLogRepository,
  type GenerationHistoryParams,
} from '../repositories/generation-log.repository';

/**
 * GenerationLogService — business logic for generation history.
 * Calls GenerationLogRepository for all data access. No direct DB queries.
 */
export class GenerationLogService {
  private readonly repository: GenerationLogRepository;

  constructor() {
    this.repository = new GenerationLogRepository();
  }

  /**
   * Get paginated generation history for a faculty user.
   * Returns flat rows with joined course name, item status, and monthly stats.
   */
  async getHistory(params: GenerationHistoryParams): Promise<GenerationHistoryResponse> {
    const [{ rows, total }, statsDb] = await Promise.all([
      this.repository.findPaginated(params),
      this.repository.getMonthlyStats(params.userId),
    ]);

    // Map DB rows to API response shape (snake_case -> camelCase)
    const data: GenerationHistoryRow[] = rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      courseName: row.course_title,
      userMessage: row.input_message
        ? row.input_message.slice(0, 80)
        : null,
      autoRoute: this.parseAutoRoute(row.auto_route),
      criticComposite: row.critic_composite_score,
      retryCount: row.retry_count,
      durationMs: row.duration_ms,
      costUsd: row.total_cost_usd,
      createdAt: row.created_at,
      itemStatus: this.parseItemStatus(row.item_status),
      itemId: row.item_id,
    }));

    const approvalRate =
      statsDb.total_generated > 0
        ? statsDb.total_approved / statsDb.total_generated
        : 0;

    const stats: GenerationStats = {
      period: 'month',
      totalGenerated: statsDb.total_generated,
      totalApproved: statsDb.total_approved,
      approvalRate: Math.round(approvalRate * 100) / 100,
      avgCriticScore: statsDb.avg_critic_score
        ? Math.round(statsDb.avg_critic_score * 10) / 10
        : null,
      avgCostUsd: statsDb.avg_cost_usd
        ? Math.round(statsDb.avg_cost_usd * 100) / 100
        : null,
    };

    const totalPages = Math.max(1, Math.ceil(total / params.limit));

    return {
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
      },
      stats,
    };
  }

  private parseAutoRoute(
    value: string | null,
  ): 'auto_approve' | 'auto_reject' | 'faculty_review' | null {
    if (value === 'auto_approve' || value === 'auto_reject' || value === 'faculty_review') {
      return value;
    }
    return null;
  }

  private parseItemStatus(
    value: string | null,
  ): 'approved' | 'rejected' | 'draft' | 'pending_review' | 'retired' | null {
    const valid = ['approved', 'rejected', 'draft', 'pending_review', 'retired'];
    if (value && valid.includes(value)) {
      return value as 'approved' | 'rejected' | 'draft' | 'pending_review' | 'retired';
    }
    return null;
  }
}
