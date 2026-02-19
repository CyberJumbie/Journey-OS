# E-40: BKT & IRT Engine

**Feature:** F-19
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 31

## Definition of Done
- Python/FastAPI service for IRT 3PL item calibration
- Bayesian Knowledge Tracing per-concept mastery estimation
- Prerequisite graph traversal identifies root-cause gaps
- Item selection algorithm targets weakest concepts first
- Real-time mastery parameter updates after each response
- Item bank requirement: ≥500 calibrated items before activation

## User Flows Enabled
- UF-31: Student Adaptive Practice — partially enabled (engine only, no UI)

## Story Preview
- Story: FastAPI service scaffold — Python service with health check, auth
- Story: IRT 3PL calibration — item parameter estimation from response data
- Story: BKT mastery estimation — per-concept mastery tracking
- Story: Adaptive item selection — prerequisite-aware weakest-concept targeting

## Source References
- F-19 feature definition
- UF-31 user flow
