Show completion status of the full upfront spec pipeline.

Usage: /spec-status

The entire product must be specced before development starts.
This command shows where you are in that process.

## Display

```
═══════════════════════════════════════════════════════════════
SPEC PIPELINE STATUS
═══════════════════════════════════════════════════════════════

✅ /classify          12 docs classified, manifest approved
✅ /personas          5 personas extracted, matrix approved
✅ /feature           15 features defined, all approved
✅ /user-flow         38 flows mapped, all approved
✅ /epic              28 epics generated, all approved
✅ /decompose-all     66 stories decomposed, 0 XL remaining
✅ /prioritize        6 lanes configured, ordering approved
🟡 /brief             42/66 briefs complete (64%)
   Missing: STORY-F-12 through F-18, STORY-S-8 through S-14

READY FOR DEVELOPMENT: NO — complete all briefs first.

Estimated remaining spec work:
  24 briefs × ~15 min each = ~6 hours
═══════════════════════════════════════════════════════════════
```

## Checks

1. doc-manifest.yaml exists and is non-empty
2. Persona files exist for all detected personas
3. All features have at least one user flow
4. All features have at least one epic
5. All epics have stories
6. /prioritize has run (lane config + backlog files exist)
7. Every story has a brief (STORY-*-BRIEF.md)

If all checks pass: "READY FOR DEVELOPMENT"
If any fail: show what's missing with estimates
