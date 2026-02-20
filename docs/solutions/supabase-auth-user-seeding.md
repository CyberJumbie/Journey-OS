---
name: supabase-auth-user-seeding
tags: [supabase, auth, seeding, test-accounts, gotrue]
story: dev-environment-setup
date: 2026-02-20
---
# Supabase Auth User Seeding via Raw SQL

## Problem
Creating test users directly in `auth.users` via SQL requires careful handling of nullable varchar columns. GoTrue's Go scanner cannot convert SQL NULL to Go `string`, causing 500 errors on login: `"converting NULL to string is unsupported"`.

## Solution
When inserting into `auth.users`, set all varchar token columns to empty strings, not NULL. Also create matching `auth.identities` records with `email_verified: true` in `identity_data`.

```sql
-- 1. Create institution first (if FK required)
INSERT INTO public.institutions (id, name, domain, status, approved_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Morehouse School of Medicine',
  'msm.edu',
  'approved',
  now()
) ON CONFLICT (domain) DO NOTHING;

-- 2. Create auth user with ALL token columns set to empty string
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  -- These MUST be empty strings, not NULL
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  email_change_token_current, phone_change,
  phone_change_token, reauthentication_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'user@example.edu',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Dr. Example", "role": "superadmin"}',
  false,
  '', '', '', '', '', '', '', ''
);

-- 3. Create matching identity (required for email/password login)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '<user-uuid>',
  'user@example.edu',
  'email',
  jsonb_build_object(
    'sub', '<user-uuid>',
    'email', 'user@example.edu',
    'email_verified', true
  ),
  now(), now(), now()
);

-- 4. Link profile to institution (trigger auto-creates profile)
UPDATE public.profiles
SET institution_id = '<institution-uuid>'
WHERE id = '<user-uuid>';
```

## Key Columns
These `auth.users` varchar columns default to NULL but GoTrue requires `string`:
- `confirmation_token`
- `recovery_token`
- `email_change_token_new`
- `email_change`
- `email_change_token_current`
- `phone_change`
- `phone_change_token`
- `reauthentication_token`

## When to Use
- Seeding demo/test accounts for E2E testing
- Setting up dev environments
- Creating initial superadmin accounts

## When NOT to Use
- Production user creation (use Supabase Admin API instead)
- Programmatic user creation in application code (use `supabase.auth.admin.createUser()`)
