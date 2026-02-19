Answer a question about the source documents without loading full docs.

Usage: /design-query "question"

1. Read doc-manifest.yaml to identify which docs likely contain the answer
2. Spawn RLM subagent to search relevant source documents
3. Extract the grounded answer with [DOC § Section] citation
4. Return only the answer — the full doc does NOT enter context

Use this instead of reading .context/source/ files directly.
If you need /design-query during implementation, the brief may be incomplete.
Consider fixing the brief first.
