---
description: Recover from a bad state — bad merge, failed deploy, corrupted context, mid-story crash.
argument-hint: "[bad-merge | failed-deploy | context-crash | branch-audit]"
allowed-tools: Bash, Read
---

You are recovering from a problem. Diagnose first. Then apply the correct fix.

---

## Step 1 — Diagnose

```bash
git status
git log --oneline -10
git branch -a | head -10
cat SESSION_STATE.md 2>/dev/null | head -20
pnpm typecheck 2>&1 | grep "error" | head -5
```

Based on what you see, identify the scenario and jump to the right section.

---

## SCENARIO: Context Crash (session lost mid-story)

Symptoms: Started a new session, unclear where you are, no memory of what was being built.

```bash
# 1. Read session state
cat SESSION_STATE.md

# 2. Read the last checkpoint / compound commit
git log --oneline -5

# 3. Check for HANDOFF or checkpoint notes
git log --oneline | grep "checkpoint\|wip\|compound" | head -3

# 4. Check typecheck state
pnpm typecheck 2>&1 | head -20
```

Recovery:
```
Current story: [ID from SESSION_STATE.md]
Branch: [from SESSION_STATE or git branch]
Last completed plan step: [from SESSION_STATE or git log]

Run: /story [ID]
Then: continue from plan step [N]
```

---

## SCENARIO: Bad Merge (conflicts or wrong files merged)

Symptoms: `git status` shows conflicts, or `main`/`dev` has unexpected content.

```bash
# 1. Check merge state
git status
git log --oneline --graph -10

# 2. See what's conflicted
git diff --name-only --diff-filter=U

# 3. Check if we're mid-merge
ls .git/MERGE_HEAD 2>/dev/null && echo "merge in progress" || echo "no active merge"
```

**If merge in progress and you want to abort:**
```bash
git merge --abort
git status  # should be clean
```

**If already merged with conflicts committed:**
```bash
# Find the bad merge commit
git log --oneline -5

# Revert the merge commit
git revert -m 1 [merge-commit-hash] --no-edit
git push origin [branch]
```

**If dev has commits it shouldn't:**
```bash
# Create a clean branch from the last known good state
git checkout dev
git log --oneline -10  # find last good commit
git checkout -b dev-recovery [last-good-commit-hash]

# Verify the recovery branch is clean
pnpm typecheck && pnpm lint && pnpm build
```

---

## SCENARIO: Failed Deploy (production is broken)

Symptoms: `/deploy` smoke test failed, or post-deploy checks failing.

```bash
# 1. What's currently on production?
vercel ls --prod 2>/dev/null | head -5

# 2. Get last known good deployment URL
vercel ls 2>/dev/null | head -10

# 3. Check health on current prod
curl -s https://journey-os.vercel.app/api/health | jq .
```

**Immediate rollback:**
```bash
# Find the previous working deployment
vercel ls | grep "✓" | head -5
# Copy the deployment URL from the output

# Promote previous deployment to production
vercel promote [previous-deployment-url] --scope [team-slug]

# Confirm health
curl -s https://journey-os.vercel.app/api/health | jq '.version'
```

**After rollback:**
```bash
# Open an issue so the failure is tracked
gh issue create \
  --title "Production rollback: [version] — [one-line reason]" \
  --body "Rolled back at [timestamp].
  
  Failed deployment: [url]
  Restored deployment: [url]
  Issue: [what the smoke test caught]
  
  Do NOT re-deploy until this issue is resolved and /verify passes locally."
```

---

## SCENARIO: Branch Audit (lost track of branches)

```bash
# Show all branches and their last commit
git branch -a --sort=-committerdate | head -20

# Show which branches have PRs open
gh pr list --state open 2>/dev/null

# Show branches not yet merged to dev
git branch --no-merged dev | head -10

# Clean up merged branches
git branch --merged dev | grep "feat/" | xargs git branch -d
```

---

## SCENARIO: Supabase / Neo4j Out of Sync

Symptoms: `check-dual-write.ts` finding sync_status='failed' records.

```bash
# Find all unsynced records
npx ts-node scripts/check-dual-write.ts --table=assessment_items --recent=10
npx ts-node scripts/check-dual-write.ts --table=content_chunks --recent=10
```

For each failed record:
```typescript
// Manually re-sync a specific record
// 1. Get the Supabase record
const { data } = await supabase.from('assessment_items').select().eq('id', failedId).single()

// 2. Retry the Neo4j write (copy from SOL-001 pattern)
// 3. Update sync_status back to 'synced'
await supabase.from('assessment_items')
  .update({ sync_status: 'synced' })
  .eq('id', failedId)
```

---

## Print Recovery Summary

After applying the fix:

```
═══════════════════════════════════════════════
RECOVERY COMPLETE
═══════════════════════════════════════════════
Scenario: [which scenario was applied]
Fix applied: [what was done]
Current state:
  git status: [clean | describe]
  typecheck: [✅ 0 errors | ❌ N errors]
  SESSION_STATE: [current story + status]

Next action: [exactly what to do next]
═══════════════════════════════════════════════
```
