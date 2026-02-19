# E-01: Auth Infrastructure

**Feature:** F-01
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 3

## Definition of Done
- Supabase Auth configured with email/password provider
- JWT verification middleware on Express validates tokens and extracts role
- Role-based routing redirects each persona to correct dashboard
- RBAC middleware blocks unauthorized API access
- Session persistence across page refresh

## User Flows Enabled
- UF-03: SuperAdmin Login — fully enabled

## Story Preview
- Story: Supabase Auth setup — configure auth provider, JWT secret, email templates
- Story: Express auth middleware — JWT verification, role extraction, req.user population
- Story: RBAC middleware — role-based route guards for API endpoints
- Story: Role-based dashboard routing — redirect by persona after login

## Source References
- F-01 feature definition
- UF-03 user flow
