import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TemplateDTO, TemplateVersionDTO } from "@journey-os/types";
import { TemplateService } from "../template.service";
import type { TemplateRepository } from "../../../repositories/template.repository";
import {
  TemplateNotFoundError,
  TemplatePermissionError,
  ValidationError,
} from "../../../errors";

const OWNER_ID = "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa";
const SAME_INST_USER_ID = "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb";
const OTHER_INST_USER_ID = "cccccccc-3333-3333-3333-cccccccccccc";
const INSTITUTION_ID = "inst-0001-0001-0001-000000000001";
const OTHER_INSTITUTION_ID = "inst-0002-0002-0002-000000000002";

const MOCK_PRIVATE_TEMPLATE: TemplateDTO = {
  id: "tmpl-0001",
  institution_id: INSTITUTION_ID,
  owner_id: OWNER_ID,
  name: "My Private Template",
  description: "Personal question generation settings",
  question_type: "single_best_answer",
  difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
  bloom_levels: [3, 4, 5],
  scope_config: {},
  prompt_overrides: {},
  metadata: { category: "formative" },
  sharing_level: "private",
  current_version: 1,
  graph_node_id: null,
  sync_status: "pending",
  created_at: "2026-02-01T10:00:00Z",
  updated_at: "2026-02-01T10:00:00Z",
};

const MOCK_SHARED_TEMPLATE: TemplateDTO = {
  ...MOCK_PRIVATE_TEMPLATE,
  id: "tmpl-0002",
  name: "Board Prep - Cardiovascular",
  sharing_level: "shared_institution",
  current_version: 3,
};

const MOCK_PUBLIC_TEMPLATE: TemplateDTO = {
  ...MOCK_PRIVATE_TEMPLATE,
  id: "tmpl-0003",
  institution_id: OTHER_INSTITUTION_ID,
  owner_id: OTHER_INST_USER_ID,
  name: "General Anatomy Review",
  sharing_level: "public",
};

function createMockRepository(): TemplateRepository {
  return {
    create: vi.fn().mockResolvedValue(MOCK_PRIVATE_TEMPLATE),
    findById: vi.fn().mockResolvedValue(MOCK_PRIVATE_TEMPLATE),
    list: vi.fn().mockResolvedValue({
      templates: [MOCK_PRIVATE_TEMPLATE],
      meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
    }),
    update: vi.fn().mockImplementation(async (id: string) => ({
      ...MOCK_PRIVATE_TEMPLATE,
      id,
      current_version: MOCK_PRIVATE_TEMPLATE.current_version + 1,
      updated_at: new Date().toISOString(),
    })),
    delete: vi.fn().mockResolvedValue(undefined),
    createVersion: vi.fn().mockResolvedValue(undefined),
    findVersions: vi.fn().mockResolvedValue([]),
    updateSyncStatus: vi.fn().mockResolvedValue(undefined),
  } as unknown as TemplateRepository;
}

describe("TemplateService", () => {
  let repo: TemplateRepository;
  let service: TemplateService;

  beforeEach(() => {
    repo = createMockRepository();
    service = new TemplateService(repo, null);
  });

  describe("create()", () => {
    it("creates template with defaults", async () => {
      const result = await service.create(
        {
          name: "My Template",
          question_type: "single_best_answer",
          difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
          bloom_levels: [3, 4, 5],
        },
        OWNER_ID,
        INSTITUTION_ID,
      );

      expect(result).toEqual(MOCK_PRIVATE_TEMPLATE);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: OWNER_ID,
          institution_id: INSTITUTION_ID,
          sharing_level: "private",
        }),
      );
    });

    it("validates difficulty_distribution sums to 1.0", async () => {
      await expect(
        service.create(
          {
            name: "Bad Template",
            question_type: "single_best_answer",
            difficulty_distribution: { easy: 0.5, medium: 0.5, hard: 0.5 },
            bloom_levels: [3],
          },
          OWNER_ID,
          INSTITUTION_ID,
        ),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getById()", () => {
    it("owner can access private template", async () => {
      const result = await service.getById(
        "tmpl-0001",
        OWNER_ID,
        INSTITUTION_ID,
      );

      expect(result).toEqual(MOCK_PRIVATE_TEMPLATE);
    });

    it("non-owner cannot access private template", async () => {
      await expect(
        service.getById("tmpl-0001", SAME_INST_USER_ID, INSTITUTION_ID),
      ).rejects.toThrow(TemplatePermissionError);
    });

    it("same-institution user can access shared_institution template", async () => {
      vi.mocked(repo.findById).mockResolvedValueOnce(MOCK_SHARED_TEMPLATE);

      const result = await service.getById(
        "tmpl-0002",
        SAME_INST_USER_ID,
        INSTITUTION_ID,
      );

      expect(result).toEqual(MOCK_SHARED_TEMPLATE);
    });
  });

  describe("update()", () => {
    it("creates version snapshot before applying changes", async () => {
      const result = await service.update(
        "tmpl-0001",
        { name: "Updated Name" },
        OWNER_ID,
      );

      expect(repo.createVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          template_id: "tmpl-0001",
          version_number: 1,
          name: "My Private Template",
        }),
      );
      expect(repo.update).toHaveBeenCalledWith(
        "tmpl-0001",
        expect.objectContaining({
          name: "Updated Name",
          current_version: 2,
        }),
      );
      expect(result.current_version).toBe(2);
    });

    it("non-owner gets TemplatePermissionError", async () => {
      await expect(
        service.update("tmpl-0001", { name: "Hijacked" }, SAME_INST_USER_ID),
      ).rejects.toThrow(TemplatePermissionError);
    });
  });

  describe("delete()", () => {
    it("non-owner gets TemplatePermissionError", async () => {
      await expect(
        service.delete("tmpl-0001", SAME_INST_USER_ID),
      ).rejects.toThrow(TemplatePermissionError);
    });
  });

  describe("duplicate()", () => {
    it("creates new template with requesting user as owner", async () => {
      vi.mocked(repo.findById).mockResolvedValueOnce(MOCK_PUBLIC_TEMPLATE);
      const duplicated: TemplateDTO = {
        ...MOCK_PUBLIC_TEMPLATE,
        id: "tmpl-dup-001",
        owner_id: SAME_INST_USER_ID,
        institution_id: INSTITUTION_ID,
        name: "My Copy",
        sharing_level: "private",
        current_version: 1,
      };
      vi.mocked(repo.create).mockResolvedValueOnce(duplicated);

      const result = await service.duplicate(
        "tmpl-0003",
        "My Copy",
        SAME_INST_USER_ID,
        INSTITUTION_ID,
      );

      expect(result.owner_id).toBe(SAME_INST_USER_ID);
      expect(result.sharing_level).toBe("private");
      expect(result.current_version).toBe(1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: SAME_INST_USER_ID,
          sharing_level: "private",
          name: "My Copy",
        }),
      );
    });
  });

  describe("list()", () => {
    it("returns accessible templates based on sharing level", async () => {
      const result = await service.list({}, OWNER_ID, INSTITUTION_ID);

      expect(repo.list).toHaveBeenCalledWith({}, OWNER_ID, INSTITUTION_ID);
      expect(result.templates).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
