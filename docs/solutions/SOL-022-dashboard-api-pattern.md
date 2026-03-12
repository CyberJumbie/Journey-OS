# SOL-022: Dashboard API Pattern (Mock-to-Live Migration)

## Trigger
When replacing hard-coded mock data in prototype dashboard pages with live API data.
Story it emerged from: DEMO-001 through DEMO-005

## Pattern

### What it solves
Prototype pages use `useState` + `setTimeout` + inline mock arrays. This pattern replaces them with a full MVC backend + TanStack Query hooks while preserving the exact UI/JSX.

### Implementation

**1. Seed migration (idempotent)**
```sql
-- backend/supabase/migrations/YYYYMMDD_seed_data.sql
INSERT INTO institutions (id, name, slug)
VALUES ('a0000000-...', 'Demo Institution', 'demo')
ON CONFLICT (id) DO NOTHING;
```

**2. Repository (DB queries only)**
```typescript
// backend/src/repositories/dashboard.repository.ts
class DashboardRepository {
  private supabase: SupabaseClient;
  constructor() { this.supabase = SupabaseClientSingleton.getInstance().getClient(); }

  async getAdminKPIs(institutionId: string): Promise<AdminKPIs> {
    const [users, courses, items] = await Promise.all([
      this.supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('institution_id', institutionId),
      this.supabase.from('courses').select('*', { count: 'exact', head: true }).eq('institution_id', institutionId),
      this.supabase.from('assessment_items').select('*', { count: 'exact', head: true }),
    ]);
    return { totalUsers: users.count ?? 0, totalCourses: courses.count ?? 0, totalItems: items.count ?? 0 };
  }
}
```

**3. Service (orchestration, no DB)**
```typescript
// backend/src/services/dashboard.service.ts
class DashboardService {
  private repo = new DashboardRepository();
  async getAdminDashboard(institutionId: string) {
    const [kpis, recentUsers, departmentStats] = await Promise.all([
      this.repo.getAdminKPIs(institutionId),
      this.repo.getRecentUsers(institutionId, 10),
      this.repo.getDepartmentStats(institutionId),
    ]);
    return { kpis, recentUsers, departmentStats, systemAlerts: [] };
  }
}
```

**4. Controller (req/res only)**
```typescript
// backend/src/controllers/dashboard.controller.ts
async getAdminDashboard(req: Request, res: Response) {
  const institutionId = req.user?.institution_id;
  if (!institutionId) return res.status(400).json({ error: { code: 'MISSING_INSTITUTION', message: '...' } });
  const data = await this.service.getAdminDashboard(institutionId);
  res.json(data);
}
```

**5. Frontend hook (TanStack Query)**
```typescript
// frontend/src/hooks/useDashboard.ts
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiClient.get<AdminDashboardResponse>('/api/v1/dashboard/admin'),
  });
}
```

**6. Page migration (preserve JSX, swap data source)**
```typescript
// BEFORE: useState + setTimeout mock
const [kpis, setKpis] = useState<KPI[]>([]);
useEffect(() => { fetchMockData(); }, []);

// AFTER: hook
const { data, isLoading, error, refetch } = useAdminDashboard();
const kpis = data?.kpis ?? [];
```

### Gotchas
- Seed migrations need auth.users rows BEFORE user_profiles (FK constraint)
- Use deterministic UUIDs in seeds for idempotency (ON CONFLICT DO NOTHING)
- Faculty courses need a course_faculty join table eventually (TODO noted)
- Student enrollment table also missing — return all institution courses for now
- `useCurrentUser()` hook reads from Supabase auth JWT metadata (app_metadata.role, app_metadata.institution_id)

## Provenance
First created: DEMO-001 through DEMO-005 (Demo Institution Data Epic)
Also applies to: Any future dashboard or screen needing mock-to-live migration
