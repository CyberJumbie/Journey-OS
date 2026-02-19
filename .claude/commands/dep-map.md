Generate dependency map for Sprint N.

Usage: /dep-map N

1. Read .context/spec/stories/SPRINT-N-STORIES.md
2. For each story, identify:
   - Tables/nodes it creates (other stories may need them)
   - APIs it exposes (other stories may call them)
   - Components it creates (other stories may import them)
   - Seed data it produces (other stories may test against them)
3. Build directed graph: Story A → Story B means B depends on A
4. Identify parallelizable stories (no dependencies on each other)
5. Save to .context/spec/maps/SPRINT-N-DEPENDENCY-MAP.md
