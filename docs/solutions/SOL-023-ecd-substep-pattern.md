# SOL-023: ECD Sub-Step Pattern (Node-Internal Expansion)

## Trigger
When to apply: Adding ECD (Evidence-Centered Design) logic to the pipeline — or any case where 2-3 related sub-steps belong in an existing node rather than creating new pipeline nodes.
Story it emerged from: P2-016

## Pattern

### What it solves
Avoids node sprawl when adding logically-related sub-steps. Three ECD sub-steps (evidence design, task family selection, instance specification) run sequentially WITHIN ContextCompilerNode rather than as 3 separate LangGraph nodes.

### Implementation
```typescript
// Layer: pipeline node
// File convention: add private methods to existing node, not new files

class ContextCompilerNode implements IPipelineNode {
  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    // ... existing steps 1-3 ...

    // Step 4a: Evidence Design — identify claim (Haiku, cheap)
    const evidenceClaim = await this.identifyEvidenceClaim(state);

    // Step 4b: Task Family Selection — Neo4j query, no AI
    const taskShell = await this.selectTaskShell(state);

    // Step 4c: Instance Specification — pure TypeScript, no AI
    const genParams = this.buildGenerationParams(taskShell);

    return {
      ...builder.build(),
      taskShellId: taskShell?.shellId ?? 'TS-001',
      generationParams: genParams,
    };
  }

  // Each sub-step is a private method with its own error handling
  private async selectTaskShell(state: WorkbenchState): Promise<TaskShell | null> {
    try {
      return await this.graphRepo.findTaskShellBySubConcept(conceptName);
    } catch {
      return null; // Fallback to TS-001 in caller
    }
  }
}
```

### Fallback chain
1. No ProficiencyVariable → default to TS-001 (Clinical Vignette MCQ)
2. No bloom_level_guess → default to Bloom 3
3. Evidence design Haiku fails → skip claim, continue with TaskShell selection

### Gotchas
- Sub-steps are private methods, NOT separate pipeline nodes — avoids LangGraph overhead
- TaskShell selection uses ProficiencyVariable → ASSESSED_BY → TaskShell graph path (not direct SubConcept → TaskShell)
- generationParams must be added to WorkbenchAnnotation channels in graph.ts
- VignetteBuilderNode must be updated to consume generationParams from state

## Provenance
First created: P2-016 (context_compiler ECD Sub-Steps)
Also applies to: Any future pipeline enrichment that adds 2-3 related sub-steps to an existing node
