Extract and validate personas from source documents.

Prerequisite: .context/doc-manifest.yaml must exist (run /classify first).

## Steps

1. Read .context/doc-manifest.yaml (small file, read directly)
2. Identify documents flagged as defines_personas: true
3. For each such document, use RLM:
   a. Load the document
   b. Extract all persona/user/role definitions:
      - Name (or role title if no name given)
      - Role in the system
      - Pain points / problems
      - Goals / what they accomplish
      - Key workflows
      - Data they need to see
      - Actions they take
      - Access level / permissions

4. Cross-reference personas across documents:
   - If product doc says "faculty" and architecture says "5-role auth,"
     reconcile into unified personas
   - Flag any persona in one doc but absent from others
   - Flag any role in the auth model without a persona

5. For each persona, generate .context/spec/personas/PERSONA-ROLE.md:

   ```markdown
   ---
   name: "[Name or generic title]"
   role: [role_key]
   sources:
     - "DOC_NAME § Section"
     - "DOC_NAME § Section"
   ---

   ## Pain Points
   [Extracted from source docs with citations]

   ## Key Workflows
   1. [Workflow with citation]
   2. ...

   ## Data Needs
   [What they see on screen]

   ## Permissions
   [What they can do, what they can't]

   ## Test Account (if defined in source docs)
   Email: ...
   Role: ...
   ```

6. Generate .context/spec/personas/PERSONA-MATRIX.md:
   Table: persona × capability × primary screen × data access level

7. Report to human:
   - Personas found: N
   - Cross-doc consistency: [pass/issues]
   - Roles without personas: [list or "none"]

WAIT for human review. Personas drive feature definition, user flows,
and demo account creation.
