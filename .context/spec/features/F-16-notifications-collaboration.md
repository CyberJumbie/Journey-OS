# F-16: Notifications & Collaboration

## Description
Real-time push notifications delivered via Socket.io for generation completion, review requests, batch finish, gap alerts, and at-risk student flags. Bell icon with dropdown in the header. Collaboration features enable multiple faculty to observe generation sessions in real-time via Socket.io rooms. Notifications are persisted in Supabase for offline users.

## Personas
- **Faculty**: Receives generation complete, review needed notifications.
- **Faculty (Course Director)**: Same + review queue alerts, gap alerts.
- **Institutional Admin**: System-level alerts, data integrity warnings.
- **Advisor**: At-risk student alerts (Tier 2).
- **Student**: Assessment results, practice reminders (Tier 2).

## Screens
- `Notifications.tsx` — Template A, notification list with read/unread, filter by type
- `Collaborators.tsx` — Template A, manage who can observe generation sessions

## Data Domains
- **Socket.io**: Room-based presence (`gen:session_abc`), WebSocket push
- **Supabase**: `notifications` (id, user_id, type, title, body, read, created_at)
- **Inngest**: Triggers Socket.io push on `journey/batch.complete`, `journey/gap.scan` alerts
- **API**: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/read-all`

## Dependencies
- **F-01**: Authentication (user context for delivery)
- **F-09**: Generation Workbench (generation events trigger notifications)

## Source References
- ARCHITECTURE_v10.md § 3.5 (dual real-time: SSE for AG-UI, Socket.io for presence/notifications)
- ROADMAP_v2_3.md § Sprint 19 (notifications + profile)
- SUPABASE_DDL_v1.md § notifications table
- DESIGN_SPEC.md § 5.1 Group M (Notifications, Collaborators)
