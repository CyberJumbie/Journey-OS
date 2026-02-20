import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import type { FAQListResponse } from "@journey-os/types";
import { GET } from "@web/app/api/help/faq/route";
import { FAQ_ENTRIES, FAQ_CATEGORIES } from "@web/content/help/faq-data";

function createRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/help/faq");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url);
}

async function parseResponse(
  response: ReturnType<typeof GET>,
): Promise<{ status: number; body: FAQListResponse & { error?: string } }> {
  const res = response;
  const body = (await res.json()) as FAQListResponse & { error?: string };
  return { status: res.status, body };
}

describe("GET /api/help/faq", () => {
  it("returns all FAQ entries and categories when no filters applied", async () => {
    const { status, body } = await parseResponse(GET(createRequest()));

    expect(status).toBe(200);
    expect(body.entries).toHaveLength(FAQ_ENTRIES.length);
    expect(body.categories).toHaveLength(FAQ_CATEGORIES.length);
    expect(body.totalCount).toBe(FAQ_ENTRIES.length);
  });

  it("filters entries by category", async () => {
    const { status, body } = await parseResponse(
      GET(createRequest({ category: "generation" })),
    );

    expect(status).toBe(200);
    expect(body.entries.length).toBeGreaterThan(0);
    expect(body.entries.every((e) => e.category === "generation")).toBe(true);
    expect(body.totalCount).toBe(body.entries.length);
  });

  it("searches across question, answer, and tags", async () => {
    const { status, body } = await parseResponse(
      GET(createRequest({ search: "USMLE" })),
    );

    expect(status).toBe(200);
    expect(body.entries.length).toBeGreaterThan(0);

    // Every returned entry should mention USMLE in question, answer, or tags
    for (const entry of body.entries) {
      const matchesQuestion = entry.question.toLowerCase().includes("usmle");
      const matchesAnswer = entry.answer.toLowerCase().includes("usmle");
      const matchesTags = entry.tags.some((t) =>
        t.toLowerCase().includes("usmle"),
      );
      expect(matchesQuestion || matchesAnswer || matchesTags).toBe(true);
    }
  });

  it("returns empty entries array for search with no matches", async () => {
    const { status, body } = await parseResponse(
      GET(createRequest({ search: "xyznonexistentquery123" })),
    );

    expect(status).toBe(200);
    expect(body.entries).toHaveLength(0);
    expect(body.totalCount).toBe(0);
    // Categories should still be returned
    expect(body.categories).toHaveLength(FAQ_CATEGORIES.length);
  });

  it("returns 400 for invalid category parameter", async () => {
    const { status, body } = await parseResponse(
      GET(createRequest({ category: "nonexistent-category" })),
    );

    expect(status).toBe(400);
    expect(body.error).toBeDefined();
    expect(body.error).toContain("Invalid category");
  });
});
