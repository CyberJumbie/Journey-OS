Run a critical user journey end-to-end using Playwright.

Usage: /test-flow FLOW-ID (e.g., /test-flow UF-01)

1. Read .context/spec/user-flows/UF-$ARGUMENTS.md for flow definition
2. Read demo account credentials (from persona files or test fixtures)
3. Execute via Playwright:
   a. Navigate to login page
   b. Login as the flow's persona (accessibility-tree selectors)
   c. For each step in the flow:
      - Use getByRole, getByLabel, getByText (NOT CSS selectors)
      - Playwright auto-waits (no manual sleeps)
      - For async operations: use appropriate timeout (30-60s)
      - Capture trace at each step
   d. Test error paths if defined in flow
4. Report:
   - PASS/FAIL per step
   - Trace files saved to tests/traces/UF-$ARGUMENTS/
   - Screenshots saved to tests/screenshots/UF-$ARGUMENTS/
5. If first run: save screenshots as baselines
6. If baseline exists: use toHaveScreenshot() for visual regression
