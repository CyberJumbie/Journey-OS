# E-34: Notification System

**Feature:** F-16
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 19

## Definition of Done
- Socket.io push notifications for real-time alerts
- Bell icon dropdown in header with unread count badge
- Alert types: generation completion, review requests, batch finish, gap alerts, at-risk flags
- Offline persistence in Supabase (read on reconnect)
- Inngest triggers Socket.io push on journey/batch.complete, journey/gap.scan events
- Mark as read / mark all as read

## User Flows Enabled
- UF-26: Notifications & Collaboration — partially enabled (notifications only)

## Story Preview
- Story: Notification model & repository — Supabase table with read/unread status
- Story: Socket.io notification service — real-time push from server events
- Story: Inngest notification triggers — emit on batch.complete, gap.scan, review.request
- Story: Bell dropdown component — header icon with unread badge, notification list

## Source References
- F-16 feature definition
- UF-26 user flow
