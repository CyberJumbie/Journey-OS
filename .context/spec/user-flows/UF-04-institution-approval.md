# UF-04: Institution Approval

**Feature:** F-02 (Institution Management)
**Persona:** SuperAdmin (Journey OS Team)
**Goal:** Review a pending institution application from the waitlist, approve it, and send an invitation to the designated admin

## Preconditions
- SuperAdmin is logged in at `/super/dashboard`
- At least one pending waitlist application exists

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/super/dashboard` | See waitlist badge count (e.g., "3 pending") | Waitlist section visible |
| 2 | `/super/dashboard` | Click "View Waitlist" or waitlist count | Navigate to waitlist view |
| 3 | `/super/waitlist` | See list of pending applications (name, email, institution, submitted date) | Applications sorted by date |
| 4 | `/super/waitlist` | Click on an application row | Expand application details (institution name, admin email, domain, tier) |
| 5 | `/super/waitlist` | Click "Approve" button | Confirmation dialog: "Approve [Institution Name]? An invitation will be sent to [email]." |
| 6 | `/super/waitlist` | Confirm approval | Institution created with `status: approved`, invitation email sent to admin, application removed from pending list |
| 7 | `/super/waitlist` | See success toast: "Institution approved. Invitation sent." | Waitlist count decremented |

## Error Paths
- **Reject application**: Step 5 — Click "Reject" instead → confirmation dialog → application marked `status: rejected`, optional rejection reason email sent
- **Duplicate institution domain**: Step 6 — "An institution with this domain already exists." Offer to link or reject.
- **Email send failure**: Step 6 — Institution approved but "Invitation email failed to send. Retry?" with retry button
- **No pending applications**: Step 2 — "No pending applications" empty state with illustration

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/waitlist?status=pending` | Step 2 — fetch pending applications |
| PATCH | `/api/v1/waitlist/:id` | Step 6 — approve (body: `{ status: "approved" }`) |
| POST | `/api/v1/institutions` | Step 6 — create institution record (triggered by approval) |

## Test Scenario (Playwright outline)
Login as: SuperAdmin
Steps:
1. Create a waitlist application via API in beforeAll
2. Navigate to `/super/dashboard`
3. Click through to waitlist
4. Approve the test application
5. Verify institution created
Assertions:
- Waitlist application status changed to `approved`
- Institution record created in `institutions` table
- Application no longer appears in pending list

## Source References
- API_CONTRACT_v1.md § Institutions & Waitlist endpoints
- ARCHITECTURE_v10.md § 2 (Institution as Layer 1 root)
- ROADMAP_v2_3.md § Sprint 3 (SuperAdmin waitlist flow)
- PERSONA-SUPERADMIN.md § Key Workflows
