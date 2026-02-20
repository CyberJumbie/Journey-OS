/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CourseCardData, CourseCardSort } from "@journey-os/types";

// ─── Mock data ─────────────────────────────────────────────────────────

const ACTIVE_COURSE: CourseCardData = {
  id: "course-uuid-1",
  name: "Medical Sciences I",
  code: "MS-101",
  term: "Fall 2026",
  status: "active",
  question_count: 142,
  coverage_percent: 67.5,
  last_activity_at: "2026-02-18T16:30:00Z",
  program_id: "prog-uuid-1",
  program_name: "Doctor of Medicine",
};

const DRAFT_COURSE: CourseCardData = {
  id: "course-uuid-2",
  name: "Pharmacology Fundamentals",
  code: "PHARM-201",
  term: "Spring 2026",
  status: "draft",
  question_count: 0,
  coverage_percent: 0,
  last_activity_at: null,
  program_id: "prog-uuid-1",
  program_name: "Doctor of Medicine",
};

const ARCHIVED_COURSE: CourseCardData = {
  id: "course-uuid-3",
  name: "Anatomy Review",
  code: "ANAT-100",
  term: "Spring 2025",
  status: "archived",
  question_count: 89,
  coverage_percent: 92.3,
  last_activity_at: "2025-12-15T10:00:00Z",
  program_id: "prog-uuid-1",
  program_name: "Doctor of Medicine",
};

const MOCK_COURSES = [ACTIVE_COURSE, DRAFT_COURSE, ARCHIVED_COURSE];

// ─── Mocks ─────────────────────────────────────────────────────────────

vi.mock("@journey-os/ui", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  ),
  MiniProgressBar: ({ percent }: { percent: number }) => (
    <div data-testid="mini-progress-bar" data-percent={percent} />
  ),
}));

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseFacultyCourses = vi.hoisted(() => {
  return vi.fn<
    () => {
      courses: CourseCardData[];
      loading: boolean;
      error: string;
      sortBy: CourseCardSort;
      setSortBy: (s: CourseCardSort) => void;
      refetch: () => void;
    }
  >();
});

vi.mock("@web/hooks/use-faculty-courses", () => ({
  useFacultyCourses: mockUseFacultyCourses,
}));

// ─── Import after mocks ───────────────────────────────────────────────

import { CourseCardsGrid } from "@web/components/dashboard/course-cards-grid";

// ─── Tests ─────────────────────────────────────────────────────────────

describe("CourseCardsGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFacultyCourses.mockReturnValue({
      courses: MOCK_COURSES,
      loading: false,
      error: "",
      sortBy: "recent_activity",
      setSortBy: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("renders course cards with correct title, code, term", () => {
    render(<CourseCardsGrid facultyId="test-id" />);

    expect(screen.getByText("Medical Sciences I")).toBeDefined();
    expect(screen.getByText("MS-101")).toBeDefined();
    expect(screen.getByText("Fall 2026")).toBeDefined();

    expect(screen.getByText("Pharmacology Fundamentals")).toBeDefined();
    expect(screen.getByText("PHARM-201")).toBeDefined();
  });

  it("displays correct status badge text for active/draft/archived", () => {
    render(<CourseCardsGrid facultyId="test-id" />);

    const badges = screen.getAllByTestId("status-badge");
    const badgeTexts = badges.map((b) => b.textContent);
    expect(badgeTexts).toContain("Active");
    expect(badgeTexts).toContain("Draft");
    expect(badgeTexts).toContain("Archived");
  });

  it("displays question count for each course", () => {
    render(<CourseCardsGrid facultyId="test-id" />);

    expect(screen.getAllByText("142").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("89").length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty state when no courses", () => {
    mockUseFacultyCourses.mockReturnValue({
      courses: [],
      loading: false,
      error: "",
      sortBy: "recent_activity",
      setSortBy: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CourseCardsGrid facultyId="test-id" />);

    expect(screen.getByText("No courses assigned")).toBeDefined();
    expect(
      screen.getByText("Contact your institutional admin to get started."),
    ).toBeDefined();
  });

  it("quick action buttons navigate to correct routes", async () => {
    render(<CourseCardsGrid facultyId="test-id" />);
    const user = userEvent.setup();

    const generateButtons = screen.getAllByText("Generate");
    await user.click(generateButtons[0]!);

    expect(mockPush).toHaveBeenCalledWith(
      "/workbench?course=course-uuid-1&mode=generate",
    );
  });

  it("sort dropdown changes card order", async () => {
    const mockSetSortBy = vi.fn();
    mockUseFacultyCourses.mockReturnValue({
      courses: MOCK_COURSES,
      loading: false,
      error: "",
      sortBy: "recent_activity",
      setSortBy: mockSetSortBy,
      refetch: vi.fn(),
    });

    render(<CourseCardsGrid facultyId="test-id" />);

    const selects = document.querySelectorAll("select");
    const select = selects[selects.length - 1]!;
    fireEvent.change(select, { target: { value: "alphabetical" } });

    expect(mockSetSortBy).toHaveBeenCalledWith("alphabetical");
  });
});
