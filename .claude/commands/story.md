# /story — Load a story with its full context packet

Load story $ARGUMENTS and the relevant context packet. You will have everything needed
to implement this story without chasing external references.

## Step 1: Load story file
```bash
cat docs/stories/$ARGUMENTS.md
```

## Step 2: Identify and load context packet
```bash
# Determine epic from story number
story_num=$(echo "$ARGUMENTS" | grep -oP '\d+')
if [ "$story_num" -le 8 ]; then
  cat docs/context-packets/CP-EPIC-1.1.md
elif [ "$story_num" -le 15 ]; then
  cat docs/context-packets/CP-EPIC-1.2.md
elif [ "$story_num" -le 23 ]; then
  cat docs/context-packets/CP-EPIC-1.3.md
else
  cat docs/context-packets/CP-EPIC-1.4.md
fi
```

## Step 3: Load current state
```bash
cat SESSION_STATE.md
cat .context/stack.yaml
```

## Step 4: Identify specialist agents for this story
Check the story file for `**Specialist:**` annotation.
If found, these agents are pre-loaded for delegation:
- @frontend-specialist — atomic design, React components
- @backend-specialist — Express MVC, OOP patterns
- @pipeline-specialist — LangGraph nodes, streaming
- @ingestion-specialist — PDF parsing, chunking, embedding

## Step 5: Confirm scope
State clearly:
- Story ID and title
- Epic it belongs to
- Files to create (from context packet FILE MAP)
- Dependencies that must exist
- Smoke test that proves it's done

## Step 6: Proceed to /plan
Once story and context are loaded, run /plan to generate the implementation plan.

---

**Context is now loaded. You have:**
- Story ACs from docs/stories/$ARGUMENTS.md
- Full schema, patterns, and file map from context packet
- No need to read GRAPH_SCHEMA.md, DATA_LAYER.md, or TECHNICAL_CONTEXT.md separately
- Everything relevant is inlined in the context packet
