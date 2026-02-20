"use client";

import { GenerationSettingsPanel } from "@web/components/settings/generation-settings-panel";

// Next.js App Router requires default export for pages
export default function GenerationSettingsPage() {
  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-serif, Georgia, serif)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "var(--color-text-primary, #1a1a2e)",
          marginBottom: "var(--space-6, 24px)",
        }}
      >
        Generation Settings
      </h1>
      <div
        style={{
          backgroundColor: "var(--surface-white, #ffffff)",
          borderRadius: "var(--radius-md, 8px)",
          padding: "var(--space-6, 24px)",
        }}
      >
        <GenerationSettingsPanel />
      </div>
    </div>
  );
}
