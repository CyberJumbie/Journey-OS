# SOL-005: Express MVC Layer Skeleton

## Trigger
Any time adding a new Express resource endpoint. Copy this skeleton for the 4-layer structure.

Story it emerged from: P1-001 / bootstrap

## Pattern

### What it solves
Enforces the Routes → Controllers → Services → Repositories constraint mechanically. Each file has one job.

### Implementation

**Route file** (`apps/server/src/routes/items.routes.ts`)
```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { ItemsController } from '../controllers/items.controller'
import { container } from '../container'  // dependency injection

const router = Router()
const controller = container.resolve(ItemsController)

// Routes: path mapping + middleware ONLY. Zero logic.
router.get('/', requireAuth(['faculty', 'institutional_admin']), controller.list)
router.get('/:id', requireAuth(['faculty', 'institutional_admin']), controller.getById)
router.post('/', requireAuth(['faculty']), controller.create)
router.patch('/:id', requireAuth(['faculty']), controller.updateStatus)

export { router as itemsRouter }
```

**Controller file** (`apps/server/src/controllers/items.controller.ts`)
```typescript
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { ItemsService } from '../services/items.service'

const UpdateStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'retired']),
})

export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  // Controllers: parse + validate + call service + format response. NO DB. NO business logic.
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, status } = req.query
      const items = await this.itemsService.listItems({
        courseId: courseId as string,
        status: status as string,
        institutionId: req.user.institution_id,  // from auth middleware
      })
      res.json(items)
    } catch (err) {
      next(err)
    }
  }

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = UpdateStatusSchema.parse(req.body)  // Zod validation here
      const item = await this.itemsService.updateItemStatus(req.params.id, body.status)
      res.json(item)
    } catch (err) {
      next(err)
    }
  }
}
```

**Service file** (`apps/server/src/services/items.service.ts`)
```typescript
import { ItemsRepository } from '../repositories/items.repository'
import { DualWriteService } from './dual-write.service'

export class ItemsService {
  constructor(
    private itemsRepo: ItemsRepository,
    private dualWrite: DualWriteService
  ) {}

  // Services: business logic + orchestration. Call repos/DualWrite. NO direct DB. NO HTTP.
  async updateItemStatus(itemId: string, status: ItemStatus): Promise<AssessmentItem> {
    // Business logic: validate transition
    const current = await this.itemsRepo.findById(itemId)
    if (current.status === 'retired') throw new Error('Cannot update a retired item')
    
    // Dual-write (cross-DB) via service
    return this.dualWrite.updateAssessmentItemStatus(itemId, status)
  }

  async listItems(filters: ItemFilters): Promise<AssessmentItem[]> {
    // Pure repo call — no dual-write needed for reads
    return this.itemsRepo.findByFilters(filters)
  }
}
```

**Repository file** (`apps/server/src/repositories/items.repository.ts`)
```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { AssessmentItem, ItemFilters } from '@msm/shared-types'

export class ItemsRepository {
  constructor(private supabase: SupabaseClient) {}

  // Repositories: DB queries ONLY. Return typed data. NO business logic.
  async findById(id: string): Promise<AssessmentItem> {
    const { data, error } = await this.supabase
      .from('assessment_items')
      .select('*, options(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  async findByFilters(filters: ItemFilters): Promise<AssessmentItem[]> {
    let query = this.supabase
      .from('assessment_items')
      .select('*, options(*)')
      .eq('institution_id', filters.institutionId)
    
    if (filters.courseId) query = query.eq('course_id', filters.courseId)
    if (filters.status) query = query.eq('status', filters.status)
    
    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }
}
```

### File naming convention
```
apps/server/src/routes/{resource}.routes.ts
apps/server/src/controllers/{resource}.controller.ts
apps/server/src/services/{resource}.service.ts
apps/server/src/repositories/{resource}.repository.ts
```

### Gotchas
- Controllers must have try/catch on every method — Express error middleware needs `next(err)`.
- Services NEVER import from `express` — no Request/Response. That's a controller concern.
- Repositories NEVER contain `if` statements for business rules — that's a service concern.
- Controllers do Zod validation. Repositories trust the data they receive.
- Auth middleware attaches `req.user` — controllers read it, services receive it as parameter.

## Provenance
Pattern established: bootstrap
Applies to: every Express resource in P1-009 through P1-029
