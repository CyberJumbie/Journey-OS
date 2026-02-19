# Universal Delivery Framework for AI-Assisted Development

## Quick Start

```bash
# 1. Copy framework into your project
cp -r .claude/ your-project/.claude/
cp -r .context/ your-project/.context/
cp SESSION_STATE.md CLAUDE.md your-project/
mkdir -p your-project/docs/{plans,solutions}
cp docs/*.yaml your-project/docs/

# 2. Drop your project documents into .context/source/

# 3. Edit CLAUDE.md with your project rules (<300 lines)

# 4. Start Claude Code — SPEC PHASE (complete before any code)
cd your-project && claude
/classify                        # Discover docs
/personas                        # Extract personas
/feature [each]                  # Define all features
/user-flow [each]                # Map all journeys
/epic [each feature]             # All epics
/decompose-all                   # All stories
/prioritize                      # Assign to persona lanes
/brief [every story]             # ALL context packets
/spec-status                     # Must show READY

# 5. BUILD PHASE — pull from persona lanes
/pull institutional_admin        # Choose a lane
/plan STORY-IA-1                 # Plan
# [Claude implements]
/validate STORY-IA-1             # 4-pass review
/compound                        # Capture learnings
/pull institutional_admin        # Next story
```

## Two Phases

**SPEC PHASE:** The entire product is specced before any code. All features, flows, epics, stories, lane assignments, and self-contained briefs are generated and reviewed. This front-loads thinking so implementation is pure execution.

**BUILD PHASE:** Choose a persona lane, pull the next unblocked story, implement from the brief, validate, compound, repeat. Cross-lane dependencies are tracked — if your chosen lane is blocked, the system tells you which lane to work on to unblock it.

## Persona Lanes

| Priority | Lane | Prefix | Stories |
|----------|------|--------|---------|
| 0 | universal | U | Infrastructure, auth, shared services |
| 1 | superadmin | SA | Platform-wide management |
| 2 | institutional_admin | IA | Institution config, analytics |
| 3 | faculty | F | Content creation, generation |
| 4 | student | S | Learning, assessments, progress |
| 5 | advisor | A | Monitoring, interventions |

At dev time: `/pull ia` → get next institutional admin story. `/backlog` → see all lanes. `/blocked faculty` → see what blocks faculty.

## What's Included

```
.claude/
├── agents/rlm-subcall.md            # Haiku sub-LLM
├── skills/ (8 skills)               # RLM, classifier, ideation, briefing,
│                                     # prioritization, testing, adapt, compound
├── commands/ (24 commands)           # Full pipeline + lane management
├── settings.json                    # Permissions + hooks (PostToolUse, PreToolUse)
├── mcp.json                          # MCP config template
└── settings.json                     # Permissions

.context/source/                      # YOUR DOCS GO HERE
docs/                                 # Coverage + error tracking
CLAUDE.md                             # Root prompt template
SESSION_STATE.md                      # Session state template
```

## Key Commands

| Phase | Command | Purpose |
|-------|---------|---------|
| Spec | `/classify` | Discover and classify docs |
| Spec | `/decompose-all` | All stories at once |
| Spec | `/prioritize` | Assign to persona lanes |
| Spec | `/brief STORY-ID` | Self-contained context packet |
| Spec | `/spec-status` | Ready for development? |
| Build | `/pull LANE` | Next unblocked story |
| Build | `/backlog` | All lanes status |
| Build | `/blocked LANE` | What's blocking a lane |
| Build | `/validate STORY-ID` | 4-pass review |
| Build | `/compound` | Error-to-rule pipeline |

## Full Specification
See UNIVERSAL_DELIVERY_FRAMEWORK.md for the complete spec.
See CHANGES-v1.0-to-v1.1.md for what changed from v1.0.
