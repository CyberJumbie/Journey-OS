/**
 * Notification Triggers — API tests.
 * [STORY-F-22] Tests for all 6 Inngest trigger functions + TriggerResolverService.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  BatchCompletePayload,
  ReviewRequestPayload,
  ReviewDecisionPayload,
  GapScanCompletePayload,
  KaizenDriftPayload,
  KaizenLintPayload,
  ResolvedRecipients,
  Notification,
  NotificationType,
} from "@journey-os/types";
import { TriggerResolverService } from "../../services/notification/trigger-resolver.service";

// ── Fixtures ────────────────────────────────────────────────────────

const MOCK_BATCH_COMPLETE: BatchCompletePayload = {
  event_id: "evt-batch-001",
  timestamp: "2026-02-19T12:00:00Z",
  batch_id: "a0000001-0001-4001-a001-000000000001",
  owner_id: "a0000001-0001-4001-a001-000000000010",
  total_items: 25,
  succeeded: 23,
  failed: 2,
  batch_name: "Cardiology Question Set",
};

const MOCK_REVIEW_REQUEST: ReviewRequestPayload = {
  event_id: "evt-review-001",
  timestamp: "2026-02-19T12:00:00Z",
  review_id: "a0000001-0001-4001-a001-000000000002",
  question_id: "a0000001-0001-4001-a001-000000000003",
  requester_id: "a0000001-0001-4001-a001-000000000010",
  assigned_reviewer_ids: [
    "a0000001-0001-4001-a001-000000000020",
    "a0000001-0001-4001-a001-000000000021",
  ],
  question_title: "Cardiac Physiology MCQ #12",
};

const MOCK_REVIEW_DECISION: ReviewDecisionPayload = {
  event_id: "evt-decision-001",
  timestamp: "2026-02-19T12:00:00Z",
  review_id: "a0000001-0001-4001-a001-000000000002",
  question_id: "a0000001-0001-4001-a001-000000000003",
  reviewer_id: "a0000001-0001-4001-a001-000000000020",
  generator_id: "a0000001-0001-4001-a001-000000000010",
  decision: "approved",
  comment: "Excellent question, meets quality standards.",
  question_title: "Cardiac Physiology MCQ #12",
};

const MOCK_REVIEW_REJECTION: ReviewDecisionPayload = {
  event_id: "evt-decision-002",
  timestamp: "2026-02-19T12:00:00Z",
  review_id: "a0000001-0001-4001-a001-000000000002",
  question_id: "a0000001-0001-4001-a001-000000000003",
  reviewer_id: "a0000001-0001-4001-a001-000000000020",
  generator_id: "a0000001-0001-4001-a001-000000000010",
  decision: "rejected",
  comment: "Stem is ambiguous, distractor B overlaps with C.",
  question_title: "Cardiac Physiology MCQ #12",
};

const MOCK_GAP_SCAN: GapScanCompletePayload = {
  event_id: "evt-gap-001",
  timestamp: "2026-02-19T12:00:00Z",
  scan_id: "a0000001-0001-4001-a001-000000000004",
  course_id: "a0000001-0001-4001-a001-000000000005",
  course_owner_id: "a0000001-0001-4001-a001-000000000010",
  gaps_found: 5,
  critical_gaps: 2,
  course_name: "Medical Sciences I",
};

const MOCK_KAIZEN_DRIFT: KaizenDriftPayload = {
  event_id: "evt-drift-001",
  timestamp: "2026-02-19T12:00:00Z",
  drift_id: "a0000001-0001-4001-a001-000000000006",
  institution_id: "a0000001-0001-4001-a001-000000000100",
  metric_name: "average_question_quality",
  current_value: 0.62,
  threshold: 0.75,
  severity: "critical",
};

const MOCK_KAIZEN_LINT: KaizenLintPayload = {
  event_id: "evt-lint-001",
  timestamp: "2026-02-19T12:00:00Z",
  lint_run_id: "a0000001-0001-4001-a001-000000000007",
  institution_id: "a0000001-0001-4001-a001-000000000100",
  total_findings: 12,
  critical_findings: 3,
  warning_findings: 9,
};

const MOCK_KAIZEN_LINT_CLEAN: KaizenLintPayload = {
  event_id: "evt-lint-002",
  timestamp: "2026-02-19T12:00:00Z",
  lint_run_id: "a0000001-0001-4001-a001-000000000008",
  institution_id: "a0000001-0001-4001-a001-000000000100",
  total_findings: 4,
  critical_findings: 0,
  warning_findings: 4,
};

const ADMIN_IDS = [
  "a0000001-0001-4001-a001-000000000050",
  "a0000001-0001-4001-a001-000000000051",
];

// ── Mocks ───────────────────────────────────────────────────────────

const { mockCreate, mockCreateBatch, mockExistsByEventId, mockSupabaseFrom } =
  vi.hoisted(() => ({
    mockCreate: vi.fn<() => Promise<Notification>>(),
    mockCreateBatch: vi.fn<() => Promise<Notification[]>>(),
    mockExistsByEventId: vi.fn<() => Promise<boolean>>(),
    mockSupabaseFrom: vi.fn(),
  }));

/** Mock NotificationService */
const mockNotificationService = {
  create: mockCreate,
  createBatch: mockCreateBatch,
} as unknown as Parameters<
  typeof import("../../inngest/functions/notify-batch-complete.fn").createNotifyBatchComplete
>[0]["notificationService"];

/** Mock NotificationRepository */
const mockNotificationRepository = {
  existsByEventId: mockExistsByEventId,
} as unknown as Parameters<
  typeof import("../../inngest/functions/notify-batch-complete.fn").createNotifyBatchComplete
>[0]["notificationRepository"];

/** Fake Inngest step runner — executes callbacks immediately */
function createMockStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "a0000001-0001-4001-a001-000000000099",
    user_id: "a0000001-0001-4001-a001-000000000010",
    type: "alert" as NotificationType,
    title: "Test",
    body: "Test body",
    action_url: null,
    action_label: null,
    is_read: false,
    read_at: null,
    created_at: "2026-02-19T12:00:00Z",
    institution_id: null,
    metadata: null,
    ...overrides,
  };
}

// ── Helper: invoke trigger function handler directly ────────────────

async function invokeTrigger(
  createFn: (deps: {
    notificationService: typeof mockNotificationService;
    notificationRepository: typeof mockNotificationRepository;
    triggerResolver: TriggerResolverService;
  }) => { fn: (...args: unknown[]) => Promise<unknown> } | unknown,
  eventData: unknown,
  triggerResolver: TriggerResolverService,
) {
  const fn = createFn({
    notificationService: mockNotificationService,
    notificationRepository: mockNotificationRepository,
    triggerResolver,
  });

  // Inngest createFunction returns an object; we need to extract the handler
  // For testing, we call the handler directly with mock event + step
  const step = createMockStep();
  const event = { data: eventData };

  // Access the internal handler — Inngest stores it as .fn or the 3rd arg
  const handler =
    (fn as { fn: (ctx: { event: unknown; step: unknown }) => Promise<unknown> })
      .fn ?? (fn as (...args: unknown[]) => Promise<unknown>);

  if (typeof handler === "function") {
    return handler({ event, step });
  }

  throw new Error("Could not extract handler from Inngest function");
}

// ── Tests ───────────────────────────────────────────────────────────

describe("Notification Triggers", () => {
  let triggerResolver: TriggerResolverService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsByEventId.mockResolvedValue(false);
    mockCreate.mockResolvedValue(makeNotification());
    mockCreateBatch.mockResolvedValue([makeNotification()]);

    // Mock supabase client for TriggerResolverService
    const mockSupabaseClient = {
      from: mockSupabaseFrom,
    };
    triggerResolver = new TriggerResolverService(
      mockSupabaseClient as unknown as Parameters<
        typeof TriggerResolverService.prototype.resolve
      > extends never
        ? never
        : ConstructorParameters<typeof TriggerResolverService>[0],
    );
  });

  describe("TriggerResolverService", () => {
    it("resolves correct recipient user IDs for each event type", async () => {
      // batch.complete → owner_id
      const batchResult = await triggerResolver.resolve(
        "batch.complete",
        MOCK_BATCH_COMPLETE,
      );
      expect(batchResult.user_ids).toEqual([MOCK_BATCH_COMPLETE.owner_id]);

      // review.request → assigned_reviewer_ids
      const reviewResult = await triggerResolver.resolve(
        "review.request",
        MOCK_REVIEW_REQUEST,
      );
      expect(reviewResult.user_ids).toEqual([
        ...MOCK_REVIEW_REQUEST.assigned_reviewer_ids,
      ]);

      // review.decision → generator_id
      const decisionResult = await triggerResolver.resolve(
        "review.decision",
        MOCK_REVIEW_DECISION,
      );
      expect(decisionResult.user_ids).toEqual([
        MOCK_REVIEW_DECISION.generator_id,
      ]);

      // gap.scan.complete → course_owner_id
      const gapResult = await triggerResolver.resolve(
        "gap.scan.complete",
        MOCK_GAP_SCAN,
      );
      expect(gapResult.user_ids).toEqual([MOCK_GAP_SCAN.course_owner_id]);

      // kaizen.drift.detected → institutional admins (needs DB mock)
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: ADMIN_IDS.map((id) => ({ id })),
              error: null,
            }),
          }),
        }),
      });

      const driftResult = await triggerResolver.resolve(
        "kaizen.drift.detected",
        MOCK_KAIZEN_DRIFT,
      );
      expect(driftResult.user_ids).toEqual(ADMIN_IDS);
    });
  });

  describe("notify-batch-complete", () => {
    let createNotifyBatchComplete: typeof import("../../inngest/functions/notify-batch-complete.fn").createNotifyBatchComplete;

    beforeEach(async () => {
      const mod =
        await import("../../inngest/functions/notify-batch-complete.fn");
      createNotifyBatchComplete = mod.createNotifyBatchComplete;
    });

    it("creates notification for batch owner with success/failure summary", async () => {
      const result = await invokeTrigger(
        createNotifyBatchComplete,
        MOCK_BATCH_COMPLETE,
        triggerResolver,
      );

      expect(mockExistsByEventId).toHaveBeenCalledWith(
        "evt-batch-001",
        "batch.complete",
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: MOCK_BATCH_COMPLETE.owner_id,
          type: "alert",
          title: "Batch generation complete",
          metadata: {
            event_id: "evt-batch-001",
            trigger_type: "batch.complete",
          },
        }),
      );
      expect(result).toEqual({ notified: 1 });
    });

    it("skips duplicate notification when event_id already processed (idempotency)", async () => {
      mockExistsByEventId.mockResolvedValue(true);

      const result = await invokeTrigger(
        createNotifyBatchComplete,
        MOCK_BATCH_COMPLETE,
        triggerResolver,
      );

      expect(result).toEqual({ skipped: true, reason: "duplicate" });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("notify-review-request", () => {
    let createNotifyReviewRequest: typeof import("../../inngest/functions/notify-review-request.fn").createNotifyReviewRequest;

    beforeEach(async () => {
      const mod =
        await import("../../inngest/functions/notify-review-request.fn");
      createNotifyReviewRequest = mod.createNotifyReviewRequest;
    });

    it("creates notifications for all assigned reviewers (bulk)", async () => {
      const result = await invokeTrigger(
        createNotifyReviewRequest,
        MOCK_REVIEW_REQUEST,
        triggerResolver,
      );

      expect(mockCreateBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ids: [...MOCK_REVIEW_REQUEST.assigned_reviewer_ids],
          type: "alert",
        }),
      );
      expect(result).toEqual({ notified: 2 });
    });

    it("includes question title in notification body", async () => {
      await invokeTrigger(
        createNotifyReviewRequest,
        MOCK_REVIEW_REQUEST,
        triggerResolver,
      );

      const callArg = (
        mockCreateBatch.mock.calls as unknown as Array<Array<{ body: string }>>
      )[0]![0]!;
      expect(callArg.body).toContain("Cardiac Physiology MCQ #12");
    });
  });

  describe("notify-review-decision", () => {
    let createNotifyReviewDecision: typeof import("../../inngest/functions/notify-review-decision.fn").createNotifyReviewDecision;

    beforeEach(async () => {
      const mod =
        await import("../../inngest/functions/notify-review-decision.fn");
      createNotifyReviewDecision = mod.createNotifyReviewDecision;
    });

    it("notifies question generator of approval decision", async () => {
      await invokeTrigger(
        createNotifyReviewDecision,
        MOCK_REVIEW_DECISION,
        triggerResolver,
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: MOCK_REVIEW_DECISION.generator_id,
          title: "Review approved",
        }),
      );
    });

    it("notifies question generator of rejection with comment", async () => {
      await invokeTrigger(
        createNotifyReviewDecision,
        MOCK_REVIEW_REJECTION,
        triggerResolver,
      );

      const callArg = (
        mockCreate.mock.calls as unknown as Array<
          Array<{ body: string; title: string }>
        >
      )[0]![0]!;
      expect(callArg.title).toBe("Review rejected");
      expect(callArg.body).toContain(
        "Stem is ambiguous, distractor B overlaps with C.",
      );
    });
  });

  describe("notify-gap-scan", () => {
    let createNotifyGapScan: typeof import("../../inngest/functions/notify-gap-scan.fn").createNotifyGapScan;

    beforeEach(async () => {
      const mod = await import("../../inngest/functions/notify-gap-scan.fn");
      createNotifyGapScan = mod.createNotifyGapScan;
    });

    it("notifies course owner when gaps detected", async () => {
      await invokeTrigger(createNotifyGapScan, MOCK_GAP_SCAN, triggerResolver);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: MOCK_GAP_SCAN.course_owner_id,
          type: "course",
          title: "Gap scan complete",
        }),
      );
    });

    it("includes gap count and critical gap count in body", async () => {
      await invokeTrigger(createNotifyGapScan, MOCK_GAP_SCAN, triggerResolver);

      const callArg = (
        mockCreate.mock.calls as unknown as Array<Array<{ body: string }>>
      )[0]![0]!;
      expect(callArg.body).toContain("5 gaps");
      expect(callArg.body).toContain("2 critical");
    });
  });

  describe("notify-kaizen", () => {
    let createNotifyKaizenDrift: typeof import("../../inngest/functions/notify-kaizen.fn").createNotifyKaizenDrift;
    let createNotifyKaizenLint: typeof import("../../inngest/functions/notify-kaizen.fn").createNotifyKaizenLint;

    beforeEach(async () => {
      const mod = await import("../../inngest/functions/notify-kaizen.fn");
      createNotifyKaizenDrift = mod.createNotifyKaizenDrift;
      createNotifyKaizenLint = mod.createNotifyKaizenLint;

      // Mock institutional admin resolution for kaizen triggers
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: ADMIN_IDS.map((id) => ({ id })),
              error: null,
            }),
          }),
        }),
      });
    });

    it("notifies institutional admins of drift detection", async () => {
      const result = await invokeTrigger(
        createNotifyKaizenDrift,
        MOCK_KAIZEN_DRIFT,
        triggerResolver,
      );

      expect(mockCreateBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ids: ADMIN_IDS,
          type: "alert",
          title: "Kaizen drift detected (critical)",
        }),
      );
      expect(result).toEqual({ notified: 2 });
    });

    it("notifies institutional admins when critical lint findings > 0", async () => {
      const result = await invokeTrigger(
        createNotifyKaizenLint,
        MOCK_KAIZEN_LINT,
        triggerResolver,
      );

      expect(mockCreateBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ids: ADMIN_IDS,
          type: "alert",
          title: "Kaizen lint complete",
        }),
      );
      expect(result).toEqual({ notified: 2 });
    });

    it("does NOT notify when kaizen lint has 0 critical findings", async () => {
      const result = await invokeTrigger(
        createNotifyKaizenLint,
        MOCK_KAIZEN_LINT_CLEAN,
        triggerResolver,
      );

      expect(result).toEqual({
        skipped: true,
        reason: "no_critical_findings",
      });
      expect(mockCreateBatch).not.toHaveBeenCalled();
    });
  });
});
