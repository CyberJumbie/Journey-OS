import type { AssessmentItemRow, ItemStatus } from '@journey-os/shared-types';
import type { AuthUser } from '../middleware/auth.middleware';
import { ItemRepository, type ItemWithOptions, type ItemVersionRow } from '../repositories/item.repository';
import { GraphRepository } from '../repositories/graph.repository';
import { DualWriteService } from './dual-write.service';

/**
 * Custom error for authorization failures.
 */
export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Custom error for resource not found.
 */
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * ItemService — business logic for assessment item operations.
 * Calls ItemRepository + GraphRepository via DualWriteService.
 * No direct DB queries. No HTTP concepts.
 */
export class ItemService {
  private readonly itemRepo: ItemRepository;
  private readonly graphRepo: GraphRepository;
  private readonly dualWriteService: DualWriteService;

  constructor() {
    this.itemRepo = new ItemRepository();
    this.graphRepo = new GraphRepository();
    this.dualWriteService = new DualWriteService();
  }

  /**
   * List assessment items with filters, scoped to user's institution.
   * Returns items with options + pagination metadata.
   */
  async list(
    params: { courseId?: string; status?: ItemStatus; page: number; limit: number },
    user: AuthUser,
  ): Promise<{ items: ItemWithOptions[]; total: number; page: number; limit: number }> {
    const filters = {
      courseId: params.courseId,
      status: params.status,
      institutionId: user.institutionId,
      page: params.page,
      limit: params.limit,
    };

    const [items, total] = await Promise.all([
      this.itemRepo.findByFilters(filters),
      this.itemRepo.countByFilters(filters),
    ]);

    return { items, total, page: params.page, limit: params.limit };
  }

  /**
   * Update the status of an assessment item (approve/reject).
   * Enforces institution ownership check.
   * Uses DualWriteService: Supabase first, then Neo4j.
   */
  async updateStatus(
    id: string,
    status: ItemStatus,
    user: AuthUser,
  ): Promise<AssessmentItemRow> {
    // 1. Fetch item and verify it exists
    const item = await this.itemRepo.findById(id);
    if (!item) {
      throw new NotFoundError(`Assessment item ${id} not found`);
    }

    // 2. Check institution ownership
    if (item.institution_id && item.institution_id !== user.institutionId) {
      throw new ForbiddenError('You do not have access to this item');
    }

    // 3. Dual-write: Supabase first, then Neo4j
    return this.dualWriteService.dualWrite(
      () => this.itemRepo.updateStatus(id, status),
      (updated) => this.setItemStatusInGraph(updated.neo4j_node_id, status),
      'assessment_items',
    );
  }

  /**
   * Get a single item by ID with options, enforcing institution ownership.
   */
  async getById(id: string, user: AuthUser): Promise<ItemWithOptions> {
    const item = await this.itemRepo.findByIdWithOptions(id);
    if (!item) {
      throw new NotFoundError(`Assessment item ${id} not found`);
    }
    if (item.institution_id && item.institution_id !== user.institutionId) {
      throw new ForbiddenError('You do not have access to this item');
    }
    return item;
  }

  /**
   * Get version history for an assessment item.
   * Enforces institution ownership check.
   */
  async getVersions(itemId: string, user: AuthUser): Promise<ItemVersionRow[]> {
    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new NotFoundError(`Assessment item ${itemId} not found`);
    }
    if (item.institution_id && item.institution_id !== user.institutionId) {
      throw new ForbiddenError('You do not have access to this item');
    }
    return this.itemRepo.findVersionsByItemId(itemId);
  }

  /**
   * Update content (vignette, stem, options) of an assessment item.
   * Creates a version snapshot first (Rule 27), then updates.
   */
  async updateContent(
    id: string,
    data: { vignette: string; stem: string; options: { label: string; text: string; is_correct: boolean; rationale: string; misconception_targeted?: string }[] },
    user: AuthUser,
  ): Promise<AssessmentItemRow> {
    const item = await this.itemRepo.findByIdWithOptions(id);
    if (!item) {
      throw new NotFoundError(`Assessment item ${id} not found`);
    }
    if (item.institution_id && item.institution_id !== user.institutionId) {
      throw new ForbiddenError('You do not have access to this item');
    }

    // Rule 27: version before edit
    await this.itemRepo.createVersion({
      item_id: id,
      vignette: item.vignette,
      stem: item.stem,
      options: item.options.map((o) => ({
        label: o.label,
        text: o.option_text ?? '',
        is_correct: o.is_correct,
        rationale: o.distractor_rationale ?? '',
        misconception_targeted: o.misconception_targeted ?? undefined,
      })),
      edit_instruction: null,
      edited_by: user.userId,
    });

    // Update content in Supabase
    await this.itemRepo.updateContent(id, {
      vignette: data.vignette,
      stem: data.stem,
    });
    await this.itemRepo.replaceOptions(id, data.options);

    const updated = await this.itemRepo.findById(id);
    if (!updated) {
      throw new NotFoundError(`Assessment item ${id} not found after update`);
    }
    return updated;
  }

  /**
   * Update item status in Neo4j graph (skinny node property).
   * Returns the neo4j_node_id for DualWriteService.
   */
  private async setItemStatusInGraph(
    neo4jNodeId: string | null,
    status: ItemStatus,
  ): Promise<string> {
    if (!neo4jNodeId) {
      throw new Error('Item has no neo4j_node_id — cannot update graph');
    }

    await this.graphRepo.setItemStatus(neo4jNodeId, status);
    return neo4jNodeId;
  }
}
