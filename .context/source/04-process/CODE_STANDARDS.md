# Journey OS — Code Standards

**Reference:** Architecture v10.0, Roadmap v2.3, NODE_REGISTRY v1.0  
**Governing Patterns:** Object-Oriented Programming, Model-View-Controller, Atomic Design  
**Date:** February 18, 2026  
**Status:** Definitive — all code must conform

---

## 1. Governing Principles

Three design patterns govern all Journey OS code. They are not optional.

**Object-Oriented Programming (OOP)** — classes with encapsulation, inheritance, and clear interfaces. Services, LangGraph nodes, validators, and MCP servers are classes, not loose functions.

**Model-View-Controller (MVC)** — strict separation of data, presentation, and logic. The model layer owns state and business rules. The view layer renders UI. The controller layer handles requests and orchestrates.

**Atomic Design (Brad Frost)** — the component library follows the five-level hierarchy: Atoms → Molecules → Organisms → Templates → Pages. Every React component has exactly one level.

---

## 2. MVC Architecture Mapping

### 2.1 How MVC Maps to Journey OS

```
┌─────────────────────────────────────────────────────────────┐
│                        VIEW LAYER                           │
│  Next.js Pages + React Components (Atomic Design)           │
│  apps/web, apps/student                                     │
│  Renders state. No business logic. No direct DB access.     │
└───────────────────────────┬─────────────────────────────────┘
                            │ AG-UI events (SSE), REST (HTTP)
                            │ useCoAgent, React Query
┌───────────────────────────┴─────────────────────────────────┐
│                     CONTROLLER LAYER                        │
│  Express Routes + LangGraph Nodes + Inngest Functions       │
│  apps/server                                                │
│  Receives requests. Validates input. Orchestrates models.   │
│  Returns responses. Emits AG-UI events. Never renders UI.   │
└───────────────────────────┬─────────────────────────────────┘
                            │ Method calls
┌───────────────────────────┴─────────────────────────────────┐
│                       MODEL LAYER                           │
│  Domain Models + Services + Repositories                    │
│  packages/shared-types (interfaces)                         │
│  apps/server/src/models, services, repositories             │
│  Owns business rules. Owns state shape. Owns validation.    │
│  Never touches HTTP. Never touches UI.                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Rules

| Layer | Allowed Dependencies | Forbidden |
|-------|---------------------|-----------|
| **Model** | Other models, shared-types, database drivers | Express, React, Socket.io, AG-UI, HTTP concepts |
| **Controller** | Models, services, Express, LangGraph, AG-UI, Socket.io | React, direct DB queries (use repositories), UI rendering |
| **View** | React, CopilotKit hooks, shared-types, `packages/ui` | Express, database drivers, Cypher, SQL, direct API calls to external services |

### 2.3 Model Layer

The model layer contains three sub-layers:

**Domain Models** — classes representing core business entities. Pure TypeScript, no framework dependencies.

```typescript
// apps/server/src/models/assessment-item.model.ts

export class AssessmentItem {
  readonly id: string;
  private _status: ItemStatus;
  private _vignette: string;
  private _stem: string;
  private _options: QuestionOption[];
  private _tags: ItemTags;
  private _toulmin: ToulminArgument | null;
  private _criticScores: CriticScores | null;
  private _sources: SourceProvenance[];

  constructor(params: AssessmentItemParams) {
    this.id = params.id ?? generateId();
    this._status = params.status ?? "empty";
    this._vignette = params.vignette ?? "";
    this._stem = params.stem ?? "";
    this._options = params.options ?? [];
    this._tags = params.tags ?? {};
    this._toulmin = params.toulmin ?? null;
    this._criticScores = params.criticScores ?? null;
    this._sources = params.sources ?? [];
  }

  get status(): ItemStatus { return this._status; }
  get isApproved(): boolean { return this._status === "approved"; }
  get hasPassedCritic(): boolean {
    return this._criticScores?.routing === "auto_approve";
  }

  setVignette(vignette: string): void {
    if (this._status !== "empty" && this._status !== "context_compiled") {
      throw new InvalidStateTransitionError(this._status, "vignette_draft");
    }
    this._vignette = vignette;
    this._status = "vignette_draft";
  }

  setStem(stem: string): void {
    if (this._status !== "vignette_draft") {
      throw new InvalidStateTransitionError(this._status, "stem_draft");
    }
    this._stem = stem;
    this._status = "stem_draft";
  }

  addOption(option: QuestionOption): void {
    if (this._options.length >= 5) {
      throw new DomainError("Maximum 5 options allowed");
    }
    this._options.push(option);
    if (this._options.length === 5) {
      this._status = "options_draft";
    }
  }

  approve(): void {
    if (this._status !== "critic_scored" && this._status !== "validated") {
      throw new InvalidStateTransitionError(this._status, "approved");
    }
    this._status = "approved";
  }

  reject(reason: string): void {
    this._status = "rejected";
    // reason stored via repository
  }

  toDTO(): QuestionDraft {
    return {
      id: this.id,
      status: this._status,
      vignette: this._vignette,
      stem: this._stem,
      options: [...this._options],
      tags: { ...this._tags },
      proficiency_variable: null,
      task_shell: null,
      toulmin: this._toulmin ? { ...this._toulmin } : null,
      sources: [...this._sources],
      validation_results: null,
      critic_scores: this._criticScores ? { ...this._criticScores } : null,
      generation_reasoning: null,
    };
  }
}
```

**Services** — classes containing business logic that spans multiple models. Services call repositories, never databases directly.

```typescript
// apps/server/src/services/generation.service.ts

export class GenerationService {
  constructor(
    private readonly itemRepo: AssessmentItemRepository,
    private readonly graphRepo: KnowledgeGraphRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly llmService: LLMService,
  ) {}

  async compileContext(conceptId: string, bloom: number): Promise<GenerationContext> {
    const concept = await this.graphRepo.getSubConceptWithRelations(conceptId);
    const taskShell = await this.graphRepo.findTaskShell(concept, bloom);
    const chunks = await this.embeddingService.retrieveRelevant(concept.name, 10);
    const refined = await this.llmService.refineContext(chunks, concept);
    return new GenerationContext(concept, taskShell, refined);
  }

  async generateVignette(context: GenerationContext): Promise<string> {
    return this.llmService.generateVignette(context);
  }

  async scoreWithCritic(item: AssessmentItem): Promise<CriticScores> {
    return this.llmService.runCriticAgent(item);
  }

  async saveItem(item: AssessmentItem): Promise<void> {
    await this.itemRepo.saveToSupabase(item);
    await this.itemRepo.saveToNeo4j(item);
  }
}
```

**Repositories** — classes that encapsulate all database access. One repository per data store per domain.

```typescript
// apps/server/src/repositories/assessment-item.repository.ts

export class AssessmentItemRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly neo4j: Neo4jDriver,
  ) {}

  async saveToSupabase(item: AssessmentItem): Promise<void> {
    const dto = item.toDTO();
    await this.supabase.from("assessment_items").upsert({
      id: dto.id,
      vignette: dto.vignette,
      stem: dto.stem,
      options: dto.options,
      status: dto.status,
      tags: dto.tags,
      critic_scores: dto.critic_scores,
    });
  }

  async saveToNeo4j(item: AssessmentItem): Promise<void> {
    const dto = item.toDTO();
    const session = this.neo4j.session();
    try {
      await session.run(
        `CREATE (ai:AssessmentItem { id: $id, status: $status, bloom_level: $bloom })
         // ... relationships
        `,
        { id: dto.id, status: dto.status, bloom: dto.tags.bloom }
      );
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<AssessmentItem | null> {
    const { data } = await this.supabase
      .from("assessment_items")
      .select("*")
      .eq("id", id)
      .single();
    return data ? AssessmentItem.fromDTO(data) : null;
  }
}
```

### 2.4 Controller Layer

Controllers handle HTTP/event inputs, validate them, call services, and return responses. They never contain business logic.

**Express Route Controllers:**

```typescript
// apps/server/src/controllers/course.controller.ts

export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  getCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const courses = await this.courseService.getByInstitution(req.user.institution_id);
    res.json({ data: courses.map(c => c.toDTO()) });
  };

  createCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const validated = CreateCourseSchema.parse(req.body);
    const course = await this.courseService.create(validated, req.user);
    res.status(201).json({ data: course.toDTO() });
  };
}

// Registration:
// apps/server/src/api/courses.routes.ts
const controller = new CourseController(courseService);
router.get("/courses", authMiddleware("faculty"), controller.getCourses);
router.post("/courses", authMiddleware("faculty"), controller.createCourse);
```

**LangGraph Node Controllers:**

Each LangGraph node is a class implementing a standard interface. Nodes are controllers — they orchestrate services and emit AG-UI events. They do not contain business logic.

```typescript
// apps/server/src/langgraph/nodes/base-node.ts

export interface IPipelineNode {
  readonly name: string;
  execute(state: WorkbenchState): Promise<Partial<WorkbenchState>>;
}

export abstract class BasePipelineNode implements IPipelineNode {
  abstract readonly name: string;

  abstract execute(state: WorkbenchState): Promise<Partial<WorkbenchState>>;

  protected emitStageStart(state: WorkbenchState): Partial<WorkbenchState> {
    return {
      current_stage: this.name,
      stage_progress: {
        ...state.stage_progress,
        [this.name]: "in_progress",
      },
    };
  }

  protected emitStageComplete(state: WorkbenchState): Partial<WorkbenchState> {
    return {
      stage_progress: {
        ...state.stage_progress,
        [this.name]: "complete",
      },
    };
  }
}
```

```typescript
// apps/server/src/langgraph/nodes/vignette-builder.ts

export class VignetteBuilderNode extends BasePipelineNode {
  readonly name = "vignette_builder";

  constructor(private readonly generationService: GenerationService) {
    super();
  }

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    const stageStart = this.emitStageStart(state);

    const vignette = await this.generationService.generateVignette(
      state.generationContext
    );

    const item = AssessmentItem.fromDTO(state.current_question);
    item.setVignette(vignette);

    return {
      ...stageStart,
      ...this.emitStageComplete(state),
      current_question: item.toDTO(),
    };
  }
}
```

**Inngest Function Controllers:**

```typescript
// apps/server/src/inngest/batch-generate.controller.ts

export class BatchGenerateController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly queueService: QueueService,
  ) {}

  createFunction(inngest: Inngest) {
    return inngest.createFunction(
      { id: "batch-generate", retries: 3 },
      { event: "journey/batch.requested" },
      async ({ event, step }) => {
        for (const item of event.data.queue_items) {
          await step.run(`generate-${item.id}`, async () => {
            await this.queueService.markGenerating(item.id);
            const result = await this.generationService.generateFull(item);
            await this.queueService.markComplete(item.id, result);
          });
        }
      }
    );
  }
}
```

### 2.5 View Layer

Views are React components. They receive data as props or from hooks. They never call services, repositories, or databases. Data fetching happens through React Query / SWR calling API endpoints or through `useCoAgent` for workbench state.

```typescript
// View calls API via React Query — never calls service directly
const { data: courses } = useQuery({
  queryKey: ["courses"],
  queryFn: () => api.get<CourseDTO[]>("/api/courses"),
});

// View reads workbench state via useCoAgent — never calls LangGraph directly
const { state } = useCoAgent<WorkbenchState>({ name: "journey_generation" });
```

---

## 3. OOP Standards

### 3.1 Class Design Rules

| Rule | Example |
|------|---------|
| **Encapsulate state** — private fields with public getters. No public mutation without methods that enforce invariants. | `private _status` with `approve()` method that validates transition |
| **Single Responsibility** — each class has one reason to change. | `AssessmentItemRepository` handles persistence only. `GenerationService` handles generation logic only. |
| **Depend on abstractions** — constructor injection of interfaces, not concrete classes. | `constructor(private readonly llm: ILLMService)` not `new AnthropicClient()` |
| **Composition over inheritance** — prefer injecting behaviors over deep class hierarchies. | `BasePipelineNode` is the only inheritance. Services compose via injection. |
| **Immutable DTOs** — data transfer objects are plain interfaces (`readonly` where practical). Mutation happens on domain models only. | `WorkbenchState` fields are interfaces. `AssessmentItem` class mutates internally. |

### 3.2 Class Categories

| Category | Naming Convention | Location | Responsibility |
|----------|------------------|----------|---------------|
| **Domain Model** | `{Name}.model.ts` — `class AssessmentItem` | `src/models/` | Business entity + invariants |
| **Service** | `{name}.service.ts` — `class GenerationService` | `src/services/` | Business logic spanning models |
| **Repository** | `{name}.repository.ts` — `class AssessmentItemRepository` | `src/repositories/` | Database access encapsulation |
| **Controller** | `{name}.controller.ts` — `class CourseController` | `src/controllers/` | HTTP/event handling |
| **Pipeline Node** | `{name}.ts` — `class VignetteBuilderNode extends BasePipelineNode` | `src/langgraph/nodes/` | LangGraph node (controller role) |
| **Validator** | `{name}.ts` — `class NBMERulesValidator` | `src/validators/` | Validation rule sets |
| **MCP Server** | `{name}-mcp.ts` — `class Neo4jMCPServer` | `src/mcp/` | Standardized tool access |

### 3.3 Dependency Injection

All classes receive dependencies via constructor injection. A composition root wires everything together at startup.

```typescript
// apps/server/src/composition-root.ts

export function createContainer() {
  // Infrastructure
  const supabase = createSupabaseClient();
  const neo4j = createNeo4jDriver();
  const anthropic = new AnthropicClient();
  const voyage = new VoyageClient();

  // Repositories
  const itemRepo = new AssessmentItemRepository(supabase, neo4j);
  const graphRepo = new KnowledgeGraphRepository(neo4j);
  const chunkRepo = new ContentChunkRepository(supabase);

  // Services
  const embeddingService = new EmbeddingService(voyage, chunkRepo);
  const llmService = new LLMService(anthropic);
  const generationService = new GenerationService(itemRepo, graphRepo, embeddingService, llmService);
  const courseService = new CourseService(/* ... */);
  const validationService = new ValidationService(/* ... */);
  const criticService = new CriticService(llmService);

  // Controllers
  const courseController = new CourseController(courseService);

  // Pipeline nodes
  const initNode = new InitNode(courseService, graphRepo);
  const contextCompiler = new ContextCompilerNode(generationService);
  const vignetteBuilder = new VignetteBuilderNode(generationService);
  const stemWriter = new StemWriterNode(generationService);
  const distractorGenerator = new DistractorGeneratorNode(generationService);
  const tagger = new TaggerNode(llmService);
  const dedupDetector = new DedupDetectorNode(embeddingService, itemRepo);
  const validator = new ValidatorNode(validationService);
  const criticAgent = new CriticAgentNode(criticService);
  const graphWriter = new GraphWriterNode(itemRepo);
  const reviewRouter = new ReviewRouterNode();

  return {
    controllers: { courseController },
    nodes: {
      initNode, contextCompiler, vignetteBuilder, stemWriter,
      distractorGenerator, tagger, dedupDetector, validator,
      criticAgent, graphWriter, reviewRouter,
    },
    services: { generationService, courseService },
  };
}
```

### 3.4 Error Handling

Custom error classes with inheritance:

```typescript
// apps/server/src/errors/index.ts

export class JourneyOSError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DomainError extends JourneyOSError {
  constructor(message: string) { super(message, "DOMAIN_ERROR"); }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Cannot transition from '${from}' to '${to}'`);
  }
}

export class ValidationError extends JourneyOSError {
  constructor(public readonly violations: string[]) {
    super(`Validation failed: ${violations.join(", ")}`, "VALIDATION_ERROR");
  }
}

export class ExternalServiceError extends JourneyOSError {
  constructor(service: string, cause: Error) {
    super(`${service} failed: ${cause.message}`, "EXTERNAL_SERVICE_ERROR");
  }
}
```

---

## 4. Atomic Design — Component Hierarchy

### 4.1 The Five Levels

Every React component in `packages/ui` and `apps/web` (or `apps/student`) belongs to exactly one level. No component spans levels.

```
PAGES        →  Complete screens with data fetching and routing
TEMPLATES    →  Layout structures with slots for organisms
ORGANISMS    →  Complex, self-contained UI sections
MOLECULES    →  Small groups of atoms working together
ATOMS        →  Smallest indivisible UI elements
```

### 4.2 Directory Structure

```
packages/ui/src/
├── atoms/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Checkbox.tsx
│   ├── Radio.tsx
│   ├── Switch.tsx
│   ├── Badge.tsx               # DM Mono uppercase label
│   ├── Tag.tsx                 # Removable tag chip
│   ├── Icon.tsx                # Lucide icon wrapper
│   ├── Avatar.tsx
│   ├── Spinner.tsx
│   ├── Tooltip.tsx
│   ├── ProgressBar.tsx
│   ├── Separator.tsx
│   ├── Typography.tsx          # H1-H6 (Lora), Body (Source Sans), Label (DM Mono)
│   └── Surface.tsx             # Cream / Parchment / White / Navy surface wrapper
│
├── molecules/
│   ├── SearchInput.tsx         # Input + Icon + clear button
│   ├── FormField.tsx           # Label + Input + error message
│   ├── StatCard.tsx            # Label + value + trend indicator
│   ├── ParamChip.tsx           # ExtractedParam: color-coded, editable, removable
│   ├── StatusDot.tsx           # Colored dot + label (generating, complete, failed)
│   ├── OptionRow.tsx           # Letter + text + correct/misconception indicators
│   ├── ObjectiveCard.tsx       # ID + Bloom chip + coverage status + text
│   ├── NavItem.tsx             # Icon + label + active state (sidebar)
│   ├── AlertBanner.tsx         # Icon + message + action button
│   ├── UserBadge.tsx           # Avatar + name + role
│   ├── StageIndicator.tsx      # Pipeline stage dot/badge
│   ├── CriticMetric.tsx        # Metric name + score + threshold + pass/fail
│   ├── DiffLine.tsx            # Green addition / red deletion line
│   └── Toast.tsx               # Floating notification
│
├── organisms/
│   ├── Sidebar.tsx             # Collapsible nav with NavItems
│   ├── DataTable.tsx           # Sortable, filterable table with pagination
│   ├── ChatPanel.tsx           # CopilotChat + SessionHeader + ExtractedParams
│   ├── ContextPanel.tsx        # ContextTabBar + ContextContent (view-switched)
│   ├── QuestionPreview.tsx     # Progressive rendering of QuestionDraft
│   ├── SyllabusView.tsx        # ObjectiveCard list with gap highlighting
│   ├── BulkQueueView.tsx       # Progress header + queue item list
│   ├── CoverageMapView.tsx     # D3 force-directed concept graph
│   ├── ToulminChain.tsx        # Claim/warrant/backing/rebuttal display
│   ├── ValidationSummary.tsx   # NBME rules + semantic + ECD results
│   ├── CriticScoreCard.tsx     # All 6 metrics with composite + routing
│   ├── ReviewActions.tsx       # Approve/Edit/Reject buttons
│   ├── SourceProvenanceList.tsx# Source cards with confidence
│   ├── MasteryHeatmap.tsx      # USMLE System × Task heatmap (Recharts)
│   ├── USMLEGapHeatmap.tsx     # 16×7 coverage heatmap (Recharts)
│   ├── NotificationCenter.tsx  # Notification list with filters
│   ├── CourseCard.tsx          # Course summary with stats
│   ├── ItemCard.tsx            # Item summary for bank/search
│   ├── ExamConstraintForm.tsx  # MIP solver constraint configuration
│   ├── Modal.tsx               # Standard dialog with header/body/footer
│   └── FileUploader.tsx        # Drag-and-drop with pipeline status
│
├── templates/
│   ├── WorkbenchLayout.tsx     # SplitPane(45/55) + TopBar + StageOverlay
│   ├── DashboardLayout.tsx     # Sidebar + header + content area
│   ├── AuthLayout.tsx          # Split-panel (branded left, form right)
│   ├── CourseLayout.tsx        # Sidebar + tabs + content
│   ├── AdminLayout.tsx         # Sidebar + content
│   └── StudentLayout.tsx       # Student sidebar + content
│
└── index.ts                    # Barrel exports by level
```

```
apps/web/app/(faculty)/
├── dashboard/page.tsx          # PAGE — imports DashboardLayout + organisms
├── generate/page.tsx           # PAGE — imports WorkbenchLayout + organisms
├── courses/[id]/page.tsx       # PAGE — imports CourseLayout + organisms
├── items/page.tsx              # PAGE — imports DashboardLayout + DataTable
├── exams/new/page.tsx          # PAGE — imports DashboardLayout + ExamConstraintForm
└── ...
```

### 4.3 Level Rules

| Level | Can Import | Cannot Import | Data Fetching | State |
|-------|-----------|---------------|--------------|-------|
| **Atom** | Nothing (leaf) | Molecules, organisms, templates, pages | Never | Props only |
| **Molecule** | Atoms | Organisms, templates, pages | Never | Local state only (e.g., input focus) |
| **Organism** | Atoms, molecules | Templates, pages | Via props (data passed down) or CopilotKit hooks (workbench) | Can use `useState`, `useCoAgent` |
| **Template** | Atoms, molecules, organisms | Pages | Never (receives children/slots) | Layout state only (sidebar open/closed) |
| **Page** | All levels | Nothing imports pages | Yes — React Query, `useCoAgent`, API calls | Connects server state to component tree |

### 4.4 Naming and File Conventions

| Convention | Rule | Example |
|-----------|------|---------|
| **One component per file** | No multi-component files | `Button.tsx` contains only `Button` |
| **PascalCase filenames** | Match component name | `QuestionPreview.tsx` → `export function QuestionPreview` |
| **Props interface** | Named `{Component}Props`, co-located | `interface QuestionPreviewProps { ... }` |
| **Default export forbidden** | Always named exports | `export function Button()` not `export default function` |
| **Barrel exports by level** | `atoms/index.ts`, `molecules/index.ts` | `export { Button } from "./Button"` |
| **Level prefix in imports** | Import from level barrel | `import { Button, Badge } from "@journey-os/ui/atoms"` |

### 4.5 Design System Token Usage

Atoms and molecules consume design tokens directly:

```typescript
// atoms/Surface.tsx
export function Surface({ level, children }: SurfaceProps) {
  const bg = {
    cream: "bg-surface-cream",
    parchment: "bg-surface-parchment",
    white: "bg-white",
    navy: "bg-navy-deep text-white",
  }[level];

  return <div className={bg}>{children}</div>;
}

// atoms/Typography.tsx
export function Heading({ level, children }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className="font-lora font-semibold text-navy-deep">{children}</Tag>;
}

export function Label({ children }: LabelProps) {
  return <span className="font-mono text-xs uppercase tracking-wider">{children}</span>;
}
```

---

## 5. Backend Directory Structure (MVC + OOP)

```
apps/server/src/
├── api/                          # CONTROLLER — route definitions
│   ├── courses.routes.ts
│   ├── items.routes.ts
│   ├── exams.routes.ts
│   ├── uploads.routes.ts
│   ├── auth.routes.ts
│   ├── admin.routes.ts
│   ├── notifications.routes.ts
│   └── index.ts                  # Route registration
│
├── controllers/                  # CONTROLLER — request handlers
│   ├── course.controller.ts
│   ├── item.controller.ts
│   ├── exam.controller.ts
│   ├── upload.controller.ts
│   ├── auth.controller.ts
│   ├── admin.controller.ts
│   └── notification.controller.ts
│
├── models/                       # MODEL — domain entities
│   ├── assessment-item.model.ts
│   ├── course.model.ts
│   ├── learning-objective.model.ts
│   ├── sub-concept.model.ts
│   ├── student.model.ts
│   ├── concept-mastery.model.ts
│   ├── generation-context.model.ts
│   ├── generation-session.model.ts
│   └── institution.model.ts
│
├── services/                     # MODEL — business logic
│   ├── generation.service.ts
│   ├── course.service.ts
│   ├── review.service.ts
│   ├── validation.service.ts
│   ├── critic.service.ts
│   ├── embedding.service.ts
│   ├── llm.service.ts
│   ├── gap-detection.service.ts
│   ├── notification.service.ts
│   ├── auth.service.ts
│   └── dual-write.service.ts
│
├── repositories/                 # MODEL — data access
│   ├── assessment-item.repository.ts
│   ├── course.repository.ts
│   ├── content-chunk.repository.ts
│   ├── knowledge-graph.repository.ts
│   ├── student.repository.ts
│   ├── notification.repository.ts
│   └── generation-log.repository.ts
│
├── langgraph/                    # CONTROLLER — pipeline orchestration
│   ├── graph.ts                  # StateGraph definition
│   ├── state.ts                  # WorkbenchState channels
│   ├── nodes/                    # Pipeline node controllers
│   │   ├── base-node.ts          # Abstract base class
│   │   ├── init.ts
│   │   ├── context-compiler.ts
│   │   ├── vignette-builder.ts
│   │   ├── stem-writer.ts
│   │   ├── distractor-generator.ts
│   │   ├── tagger.ts
│   │   ├── dedup-detector.ts
│   │   ├── validator.ts
│   │   ├── critic-agent.ts
│   │   ├── graph-writer.ts
│   │   ├── review-router.ts
│   │   ├── load-review-question.ts
│   │   ├── apply-edit.ts
│   │   └── revalidate.ts
│   └── prompts/
│       ├── vignette.ts
│       ├── stem.ts
│       ├── distractors.ts
│       ├── reasoning-artifact.ts
│       └── critic.ts
│
├── validators/                   # MODEL — validation rules
│   ├── nbme-rules.ts
│   ├── semantic-check.ts
│   ├── ecd-alignment.ts
│   └── rebuttal-analysis.ts
│
├── mcp/                          # CONTROLLER — MCP server classes
│   ├── neo4j-mcp.ts
│   └── supabase-mcp.ts
│
├── socket/                       # CONTROLLER — Socket.io handlers
│   ├── socket-server.ts
│   ├── rooms.handler.ts
│   ├── presence.handler.ts
│   └── notification.handler.ts
│
├── copilotkit/                   # CONTROLLER — CopilotKit runtime config
│   └── runtime.ts
│
├── inngest/                      # CONTROLLER — background job handlers
│   ├── client.ts
│   ├── batch-generate.controller.ts
│   ├── content-ingest.controller.ts
│   └── scheduled-jobs.controller.ts
│
├── middleware/                    # Cross-cutting
│   ├── auth.middleware.ts
│   ├── role.middleware.ts
│   ├── error.middleware.ts
│   └── logging.middleware.ts
│
├── errors/                       # Error class hierarchy
│   ├── index.ts
│   ├── domain.errors.ts
│   ├── validation.errors.ts
│   └── external.errors.ts
│
├── config/                       # Configuration
│   └── index.ts
│
├── composition-root.ts           # Dependency injection wiring
└── server.ts                     # Express app setup + startup
```

---

## 6. Testing Standards

### 6.1 Testing by MVC Layer

| Layer | Test Type | Framework | What to Test |
|-------|----------|-----------|-------------|
| **Model (domain)** | Unit | Vitest | State transitions, invariant enforcement, business rules |
| **Model (service)** | Unit + Integration | Vitest | Business logic with mocked repositories |
| **Model (repository)** | Integration | Vitest + test DB | Query correctness, dual-write behavior |
| **Controller (routes)** | Integration | Supertest | Request/response contracts, auth, validation |
| **Controller (nodes)** | Unit | Vitest | Node input/output, state mutations, AG-UI event emission |
| **View (atoms/molecules)** | Unit | Vitest + Testing Library | Rendering, props, accessibility |
| **View (organisms)** | Integration | Vitest + Testing Library | State-driven rendering, user interactions |
| **View (pages)** | E2E | Playwright | Full user flows |

### 6.2 Coverage Targets

| Layer | Target |
|-------|--------|
| Domain models | 95% |
| Services | 90% |
| Repositories | 80% |
| Validators (NBME rules) | 100% |
| Pipeline nodes | 90% |
| Atoms + Molecules | 80% |
| Organisms | 70% |
| E2E critical paths | 100% of happy paths |

---

## 7. Code Review Checklist

Every PR must pass:

- [ ] **MVC:** Does the change respect layer boundaries? Does a view import a repository? Does a model import Express?
- [ ] **OOP:** Are new classes following SRP? Are dependencies injected, not instantiated? Are domain models encapsulating state?
- [ ] **Atomic Design:** Is the component at the correct level? Does it only import from levels below it?
- [ ] **Naming:** Files follow `{name}.{category}.ts` (backend) or `PascalCase.tsx` (frontend)?
- [ ] **Types:** All function params and returns typed? No `any` without justification?
- [ ] **Errors:** Custom error classes used? No raw `throw new Error()`?
- [ ] **Tests:** Tests written for the appropriate layer? Coverage targets met?
- [ ] **Design system:** Design tokens used (not hardcoded colors/fonts)? 6 rules followed?

---

*This document governs all Journey OS code. Violations should be caught in code review. When in doubt, the layer rules in Section 2.2 are the tiebreaker.*
