Discover, classify, and map all source documents in .context/source/.
This is always the FIRST command run on a new project.

## Steps

1. Scan .context/source/ recursively. List every .md, .yaml, .json, .jsx, .tsx file.

2. Check for numbered tier structure (00-/, 01-/, 02-/, etc.):
   - If present: use tier numbers as role hints
   - If absent: classify each document individually

3. For each document:
   a. Use RLM: initialize rlm_repl.py, load the document
   b. RLM: peek first 2000 chars + last 500 chars
   c. Spawn rlm-subcall subagent with classification prompt:

      "Classify this document. Return JSON:
      {
        role: 'orientation' | 'product' | 'architecture' | 'schema' | 'process' | 'reference',
        summary: 'one sentence',
        key_entities: ['entity1', 'entity2'],
        defines_personas: true/false,
        defines_api_endpoints: true/false,
        defines_database_schema: true/false,
        defines_visual_design: true/false
      }"

   d. Record classification

4. From architecture + schema docs, detect tech stack:
   - Frontend framework
   - Backend framework
   - Databases
   - Testing tools
   - Deployment targets
   - AI/ML services (if any)

5. From product docs, extract persona summaries (names, roles, pain points)

6. Build default priority stack:
   Schema > Architecture > Process > Reference > Product > Orientation

7. Check for conflicts: if two docs define the same entity differently, flag it

8. Generate outputs:
   - .context/doc-manifest.yaml (full classification with paths, roles, summaries)
   - .context/priority-stack.md (human-editable conflict resolution order)

9. Report to human:
   - Total documents: N
   - Total size: N KB
   - Documents per role: orientation(N), product(N), architecture(N), schema(N), process(N), reference(N)
   - Tech stack detected: [list]
   - Personas detected: [list]
   - Conflicts found: [list or "none"]

WAIT for human review. The manifest governs all downstream commands.
Do NOT proceed to /personas until the manifest is approved.
