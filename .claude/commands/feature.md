Define a user-facing feature from the source documents.

Usage: /feature FEATURE-NAME

Prerequisite: .context/doc-manifest.yaml and .context/spec/personas/ must exist.

## Steps

1. Read doc-manifest.yaml to identify relevant architecture + product docs
2. Use RLM to search source docs for content related to $ARGUMENTS
3. Extract:
   - What this feature enables (user perspective)
   - Which personas use it (cross-reference persona files)
   - Which screens/pages are involved (from design spec if available)
   - What data domains it touches
   - Dependencies on other features

4. Generate .context/spec/features/F-NN-$ARGUMENTS.md:

   ```markdown
   # F-NN: [Feature Name]

   ## Description
   [2-3 sentences from user perspective]

   ## Personas
   - [Persona 1]: [how they use this feature]
   - [Persona 2]: [how they use this feature]

   ## Screens
   - [Screen/page name] — [what it shows]

   ## Data Domains
   - [Database tables, graph nodes, APIs involved]

   ## Dependencies
   - [Other features this depends on]

   ## Source References
   - [DOC § Section] for each claim
   ```

5. Update .context/spec/maps/FEATURE-EPIC-MAP.md (create if first feature)

6. Report: feature summary, personas involved, dependencies

WAIT for human review before defining user flows for this feature.
