# Sprint 31 — Stories

**Stories:** 4
**Epics:** E-40

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-ST-40-1 | FastAPI Service Scaffold | student | M |
| 2 | S-ST-40-2 | IRT 3PL Calibration | student | L |
| 3 | S-ST-40-3 | BKT Mastery Estimation | student | L |
| 4 | S-ST-40-4 | Adaptive Item Selection | student | M |

## Sprint Goals
- Scaffold the Python FastAPI service (packages/python-api) for psychometric computation
- Implement IRT 3PL item calibration and BKT mastery estimation models
- Build adaptive item selection algorithm using IRT/BKT outputs for personalized practice

## Entry Criteria
- Sprint 30 exit criteria complete (exam assignment, export, lifecycle management operational)
- Item response data available for IRT calibration; Python environment configured

## Exit Criteria
- FastAPI service runs with health check and connects to Supabase/Neo4j
- IRT 3PL calibration estimates item parameters (difficulty, discrimination, guessing)
- BKT mastery estimation tracks per-concept knowledge state; adaptive selector picks optimal next items
