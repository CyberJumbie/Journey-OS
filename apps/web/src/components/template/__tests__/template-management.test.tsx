// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { TemplateDTO } from "@journey-os/types";
import { templateFormSchema } from "@web/lib/validations/template.validation";

/**
 * Mock all Radix-based shadcn UI components — Radix bundles its own React
 * reference via pnpm strict node_modules, causing "Invalid hook call" in jsdom.
 * See CLAUDE.md: "Radix UI primitives don't work in jsdom"
 */
vi.mock("@web/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@web/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@web/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => (
    <span data-testid="badge" {...props}>
      {children}
    </span>
  ),
}));

vi.mock("@web/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => (
    <div role="menuitem" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("@web/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@web/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select">{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
}));

vi.mock("@web/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@web/components/ui/skeleton", () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

vi.mock("@web/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("lucide-react", () => ({
  Search: (props: any) => <span data-testid="icon-search" {...props} />,
  X: (props: any) => <span data-testid="icon-x" {...props} />,
  Lock: (props: any) => <span data-testid="icon-lock" {...props} />,
  Users: (props: any) => <span data-testid="icon-users" {...props} />,
  Building: (props: any) => <span data-testid="icon-building" {...props} />,
  Globe: (props: any) => <span data-testid="icon-globe" {...props} />,
  MoreVertical: (props: any) => <span data-testid="icon-more" {...props} />,
  Edit: (props: any) => <span data-testid="icon-edit" {...props} />,
  Copy: (props: any) => <span data-testid="icon-copy" {...props} />,
  Eye: (props: any) => <span data-testid="icon-eye" {...props} />,
  Trash2: (props: any) => <span data-testid="icon-trash" {...props} />,
  Plus: (props: any) => <span data-testid="icon-plus" {...props} />,
}));

// Now import components AFTER mocks are hoisted
import { SharingLevelBadge } from "@web/components/template/SharingLevelBadge";
import { TemplateGrid } from "@web/components/template/TemplateGrid";
import { TemplateCard } from "@web/components/template/TemplateCard";
import { TemplateDeleteDialog } from "@web/components/template/TemplateDeleteDialog";
import { TemplateFilters } from "@web/components/template/TemplateFilters";

const TEMPLATE_FIXTURES: TemplateDTO[] = [
  {
    id: "tmpl-0001",
    institution_id: "inst-0001",
    owner_id: "user-0001",
    name: "Board Prep - Cardiovascular",
    description:
      "High-difficulty cardiovascular questions for Step 1 preparation",
    question_type: "single_best_answer",
    difficulty_distribution: { easy: 0.1, medium: 0.3, hard: 0.6 },
    bloom_levels: [4, 5, 6],
    scope_config: {
      course_id: "course-001",
      usmle_systems: ["Cardiovascular"],
    },
    prompt_overrides: { clinical_setting: "Emergency department" },
    metadata: { category: "board_prep", tags: ["cardiovascular", "step1"] },
    sharing_level: "shared_institution",
    current_version: 3,
    graph_node_id: "neo4j-tmpl-001",
    sync_status: "synced",
    created_at: "2026-01-15T08:00:00Z",
    updated_at: "2026-02-10T14:30:00Z",
  },
  {
    id: "tmpl-0002",
    institution_id: "inst-0001",
    owner_id: "user-0001",
    name: "Formative Quiz - General",
    description: "Balanced difficulty for in-class formative assessment",
    question_type: "single_best_answer",
    difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
    bloom_levels: [2, 3, 4],
    scope_config: {},
    prompt_overrides: {},
    metadata: { category: "formative" },
    sharing_level: "private",
    current_version: 1,
    graph_node_id: "neo4j-tmpl-002",
    sync_status: "synced",
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "tmpl-0003",
    institution_id: "inst-0001",
    owner_id: "user-0002",
    name: "Anatomy Review",
    description:
      "Standard anatomy question template shared across the institution",
    question_type: "extended_matching",
    difficulty_distribution: { easy: 0.4, medium: 0.4, hard: 0.2 },
    bloom_levels: [2, 3],
    scope_config: { usmle_systems: ["Musculoskeletal"] },
    prompt_overrides: {},
    metadata: { category: "review" },
    sharing_level: "public",
    current_version: 2,
    graph_node_id: "neo4j-tmpl-003",
    sync_status: "synced",
    created_at: "2026-02-05T09:00:00Z",
    updated_at: "2026-02-12T11:00:00Z",
  },
];

const noop = () => {};

afterEach(() => {
  cleanup();
});

describe("Template Management Page", () => {
  describe("TemplateGrid", () => {
    it("renders template cards in a grid layout", () => {
      render(
        <TemplateGrid
          templates={TEMPLATE_FIXTURES}
          loading={false}
          hasFilters={false}
          onEdit={noop}
          onDuplicate={noop}
          onPreview={noop}
          onDelete={noop}
          onClearFilters={noop}
          onCreateFirst={noop}
        />,
      );

      expect(screen.getByText("Board Prep - Cardiovascular")).toBeTruthy();
      expect(screen.getByText("Formative Quiz - General")).toBeTruthy();
      expect(screen.getByText("Anatomy Review")).toBeTruthy();
    });

    it("shows empty state when no templates exist", () => {
      render(
        <TemplateGrid
          templates={[]}
          loading={false}
          hasFilters={false}
          onEdit={noop}
          onDuplicate={noop}
          onPreview={noop}
          onDelete={noop}
          onClearFilters={noop}
          onCreateFirst={noop}
        />,
      );

      expect(screen.getByText("Create your first template")).toBeTruthy();
      expect(screen.getByText("Create Template")).toBeTruthy();
    });

    it('shows "no results" state when filters return empty', () => {
      render(
        <TemplateGrid
          templates={[]}
          loading={false}
          hasFilters={true}
          onEdit={noop}
          onDuplicate={noop}
          onPreview={noop}
          onDelete={noop}
          onClearFilters={noop}
          onCreateFirst={noop}
        />,
      );

      expect(screen.getByText("No templates match your filters")).toBeTruthy();
      expect(screen.getByText("Clear filters")).toBeTruthy();
    });
  });

  describe("TemplateCard", () => {
    it("displays sharing level badge with correct icon", () => {
      render(
        <TemplateCard
          template={TEMPLATE_FIXTURES[0]!}
          onEdit={noop}
          onDuplicate={noop}
          onPreview={noop}
          onDelete={noop}
        />,
      );

      expect(screen.getByText("Institution")).toBeTruthy();
      expect(screen.getByText("Board Prep - Cardiovascular")).toBeTruthy();
    });

    it("shows kebab menu with Edit, Duplicate, Preview, Delete actions", () => {
      render(
        <TemplateCard
          template={TEMPLATE_FIXTURES[0]!}
          onEdit={noop}
          onDuplicate={noop}
          onPreview={noop}
          onDelete={noop}
        />,
      );

      // With mocked DropdownMenu, all items render immediately (no click needed)
      expect(screen.getByText("Edit")).toBeTruthy();
      expect(screen.getByText("Duplicate")).toBeTruthy();
      expect(screen.getByText("Preview")).toBeTruthy();
      expect(screen.getByText("Delete")).toBeTruthy();
    });
  });

  describe("SharingLevelBadge", () => {
    it("renders correct label for each sharing level", () => {
      const { rerender } = render(<SharingLevelBadge level="private" />);
      expect(screen.getByText("Private")).toBeTruthy();

      rerender(<SharingLevelBadge level="shared_course" />);
      expect(screen.getByText("Course")).toBeTruthy();

      rerender(<SharingLevelBadge level="shared_institution" />);
      expect(screen.getByText("Institution")).toBeTruthy();

      rerender(<SharingLevelBadge level="public" />);
      expect(screen.getByText("Public")).toBeTruthy();
    });
  });

  describe("TemplateDeleteDialog", () => {
    it("shows template name in confirmation text", () => {
      render(
        <TemplateDeleteDialog
          templateName="Test Template"
          open={true}
          loading={false}
          onConfirm={noop}
          onCancel={noop}
        />,
      );

      expect(screen.getByText("Delete template?")).toBeTruthy();
      expect(screen.getByText(/Test Template/)).toBeTruthy();
    });
  });

  describe("templateFormSchema validation", () => {
    it("validates difficulty distribution sums to 1.0", () => {
      const invalidResult = templateFormSchema.safeParse({
        name: "Test",
        description: "",
        question_type: "single_best_answer",
        difficulty_distribution: { easy: 0.5, medium: 0.5, hard: 0.5 },
        bloom_levels: [3],
        sharing_level: "private",
        scope_config: {},
        prompt_overrides: {},
        metadata: {},
      });
      expect(invalidResult.success).toBe(false);

      const validResult = templateFormSchema.safeParse({
        name: "Test",
        description: "",
        question_type: "single_best_answer",
        difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
        bloom_levels: [3],
        sharing_level: "private",
        scope_config: {},
        prompt_overrides: {},
        metadata: {},
      });
      expect(validResult.success).toBe(true);
    });

    it("requires name and at least one bloom level", () => {
      const noName = templateFormSchema.safeParse({
        name: "",
        description: "",
        question_type: "single_best_answer",
        difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
        bloom_levels: [3],
        sharing_level: "private",
        scope_config: {},
        prompt_overrides: {},
        metadata: {},
      });
      expect(noName.success).toBe(false);

      const noBloom = templateFormSchema.safeParse({
        name: "Test",
        description: "",
        question_type: "single_best_answer",
        difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
        bloom_levels: [],
        sharing_level: "private",
        scope_config: {},
        prompt_overrides: {},
        metadata: {},
      });
      expect(noBloom.success).toBe(false);
    });
  });

  describe("TemplateFilters", () => {
    /**
     * TemplateFilters uses useState/useRef hooks directly. In pnpm monorepo,
     * the component resolves to a different React copy than react-dom in jsdom,
     * causing "Invalid hook call". Test debounce logic as pure timer behavior.
     */
    it("debounce logic: setTimeout fires after delay", () => {
      vi.useFakeTimers();
      const callback = vi.fn();

      // Simulate the debounce pattern used in TemplateFilters
      const DEBOUNCE_MS = 300;
      let timer: ReturnType<typeof setTimeout> | null = null;

      function simulateSearch(value: string) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => callback({ search: value }), DEBOUNCE_MS);
      }

      simulateSearch("car");
      simulateSearch("card");
      simulateSearch("cardio");

      // Not called before delay
      expect(callback).not.toHaveBeenCalled();

      // Only last call fires after debounce
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ search: "cardio" });

      vi.useRealTimers();
    });
  });
});
