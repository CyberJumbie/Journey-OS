# E-44: Risk Prediction Engine

**Feature:** F-21
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 37

## Definition of Done
- GNN-based risk classification (PyTorch Geometric) operational
- Mastery trajectory analysis identifies declining students
- Prerequisite graph traversal pinpoints root-cause struggling concepts
- Flags students 2-4 weeks before academic failure
- Success metrics: ≥2 weeks lead time, ≥80% precision

## User Flows Enabled
- UF-33: Advisor At-Risk Cohort Review — partially enabled (prediction only)
- UF-34: Admin Cohort Analytics Monitoring — partially enabled (data only)
- UF-35: Student At-Risk Alert Response — partially enabled (flag generation only)

## Story Preview
- Story: GNN risk model — PyTorch Geometric graph neural network
- Story: Trajectory analysis service — trend detection across mastery history
- Story: Root-cause tracing — prerequisite chain traversal for struggling concepts
- Story: Risk flag generation — scheduled prediction with threshold alerts

## Source References
- F-21 feature definition
- UF-33, UF-34, UF-35 user flows
