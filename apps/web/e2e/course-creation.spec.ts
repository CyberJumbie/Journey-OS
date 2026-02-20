import { test, expect } from "@playwright/test";

test.describe("Course Creation Wizard", () => {
  test("faculty completes full wizard and creates a course", async ({
    page,
  }) => {
    // 1. Login as faculty user
    await page.goto("/login");
    await page.fill("[name=email]", "dr.faculty@msm.edu");
    await page.fill("[name=password]", "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/faculty/**");

    // 2. Navigate to course creation
    await page.goto("/faculty/courses/new");
    await expect(page.getByText("Create New Course")).toBeVisible();

    // 3. Step 1: Basic Info
    await page.fill("[name=name]", "Test Course E2E");
    await page.fill("[name=code]", "TEST-E2E-001");
    await page.fill("[name=academic_year]", "2026");

    // Select semester
    const semesterSelect = page.locator("[name=semester]");
    if (await semesterSelect.isVisible()) {
      await semesterSelect.selectOption("fall");
    }

    // Wait for code availability check
    await expect(page.getByText("Available")).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Next")');

    // 4. Step 2: Configuration
    await page.fill("[name=credit_hours]", "3");
    await page.fill("[name=max_enrollment]", "60");
    await page.click('button:has-text("Add Learning Objective")');
    const objectiveInput = page.locator(
      'input[placeholder*="objective"], input[name*="learning"]',
    );
    if (await objectiveInput.first().isVisible()) {
      await objectiveInput.first().fill("Understand E2E testing");
    }
    await page.click('button:has-text("Next")');

    // 5. Step 3: Sections & Sessions
    await page.click('button:has-text("Add Section")');
    const sectionInput = page.locator(
      'input[placeholder*="Section title"], input[placeholder*="section"]',
    );
    if (await sectionInput.first().isVisible()) {
      await sectionInput.first().fill("Introduction");
    }
    await page.click('button:has-text("Add Session")');
    const sessionInput = page.locator(
      'input[placeholder*="Session title"], input[placeholder*="session"]',
    );
    if (await sessionInput.first().isVisible()) {
      await sessionInput.first().fill("Welcome Lecture");
    }
    await page.click('button:has-text("Next")');

    // 6. Step 4: Course Director (skip)
    await page.click('button:has-text("Next")');

    // 7. Step 5: Review & Create
    await expect(page.getByText("Test Course E2E")).toBeVisible();
    await expect(page.getByText("TEST-E2E-001")).toBeVisible();
    await page.click('button:has-text("Create Course")');

    // 8. Assert redirect to course detail or success state
    await page.waitForURL("/faculty/courses/**", { timeout: 10000 });
  });
});
