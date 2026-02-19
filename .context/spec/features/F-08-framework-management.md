# F-08: Framework Management

## Description
Institutional admins import and manage eight educational frameworks that form the Layer 2 alignment backbone of the knowledge graph. Frameworks are seeded via idempotent scripts during institution setup and provide the standards against which all learning objectives, concepts, and assessment items are mapped. Total: ~492 framework nodes.

## Frameworks
| Framework | Nodes | Labels |
|-----------|-------|--------|
| USMLE | ~227 | `USMLE_System` (16), `USMLE_Discipline` (7), `USMLE_Task` (4), `USMLE_Topic` (~200) |
| LCME | 105 | `LCME_Standard` (12), `LCME_Element` (93) |
| ACGME | 27 | `ACGME_Domain` (6), `ACGME_Subdomain` (21) |
| AAMC | 55 | `AAMC_Domain` (6), `AAMC_Competency` (49) |
| UME | 55 | `UME_Competency` (6), `UME_Subcompetency` (49) + 6 ALIGNS_WITH bridge edges |
| EPA | 13 | `EPA` (13) |
| Bloom | 6 | `BloomLevel` (6) |
| Miller | 4 | `MillerLevel` (4) |

## Personas
- **Institutional Admin**: Seeds frameworks during setup, views framework hierarchy, manages custom mappings.

## Screens
- `FrameworkManagement.tsx` — Template B (Admin Shell), framework list with import status, hierarchy browser
- `SetupWizard.tsx` — Template B, step-by-step institution setup including framework seeding

## Data Domains
- **Supabase**: `frameworks` (id, type, name, version, institution_id)
- **Neo4j**: All 492 Layer 2 nodes with SCREAMING_SNAKE labels. Uniqueness constraints per NODE_REGISTRY.
- **Seeder**: `services/kg-seeder/` idempotent scripts, `pnpm kg:seed`
- **API**: `GET /api/v1/frameworks`, `POST /api/v1/frameworks/seed`, `GET /api/v1/frameworks/:type/hierarchy`

## Dependencies
- **F-02**: Institution Management (institution must exist)
- **F-01**: Authentication (admin role required)

## Source References
- ROADMAP_v2_3.md § Sprint 1 (Layer 2 Cypher DDL, all framework counts)
- NODE_REGISTRY_v1.md § Layer 2 (all framework node types and constraints)
- ARCHITECTURE_v10.md § 2 (Layer 2: framework alignment)
- SEED_VALIDATION_SPEC_v1.md § Phase 2 (framework validation queries and counts)
- PERSONA-MATRIX.md § Administration (seed frameworks)
