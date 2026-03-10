# Figma Exports

## Workflow
1. Designer exports a screen from Figma: File → Export → select frame → Export PNG + CSS
2. Create folder: `design/figma-exports/screens/<screen-name>/`
3. Drop exported files into that folder
4. Developer adapts the export into Atomic Design components in `frontend/src/components/`

## Mapping Figma → Atomic Design
| Figma | Atomic Design |
|-------|---------------|
| Component | Atom or Molecule |
| Section | Organism |
| Frame | Template |
| Page | Next.js page (app/) |

## Rules
- NEVER commit this folder's content to main — large binary files
- NEVER copy Figma exports directly into frontend/src/ — always adapt them
- design/ is excluded from deployment — it's a dev workflow artifact only

## Current screens
(Add here as screens are exported from Figma)
- [ ] login
- [ ] courses (grid)
- [ ] workbench (split-pane)
- [ ] items (question bank)
