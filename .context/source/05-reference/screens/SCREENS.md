# Journey OS — Reference Screens

**Purpose:** These three React components are the visual design authority for their respective screens. The final application must reproduce these designs exactly — same layout, same tokens, same interactions. They are not prototypes to "take inspiration from." They are the spec.

**How to use:** Render any `.jsx` file in this folder by pasting it into a React sandbox (Claude artifact, CodeSandbox, or the app itself). These are self-contained single-file components with inline styles using the design tokens from DESIGN_SPEC.md.

---

## 1. `journey-os-login.jsx` — Login Page

**Route:** `/login`  
**Sprint:** 3 (Auth Flow)  
**Persona:** All users (entry point)

**Design:**
- Split-panel layout: navy brand panel (left) + cream form panel (right)
- Woven thread canvas background motif (MSM brand element)
- `@msm.edu` domain validation on email input
- Role-based redirect after successful auth
- Lora serif for brand panel headings, Source Sans 3 for form, DM Mono for labels

**Must reproduce:**
- Split ratio and responsive collapse (mobile stacks vertically)
- Woven thread animation
- Form validation states (error red `#c9282d`, field highlighting)
- "Forgot password?" link positioning
- Brand panel content hierarchy

---

## 2. `journey-os-dashboard.jsx` — Faculty Dashboard

**Route:** `/dashboard`  
**Sprint:** 8 (Faculty Dashboard)  
**Persona:** Dr. Amara Osei (Course Director)

**Design:**
- Dashboard shell: collapsible sidebar (white, 72px → 240px) + top bar (white) + content area (cream)
- KPI strip at top (stat cards on white surface, contrasting cream page)
- Activity feed, quick actions, course overview cards
- USMLE gap alert cards
- Lucide icons throughout

**Must reproduce:**
- Sidebar collapse/expand with icon-only mode
- 3-layer surface hierarchy (cream page → white cards → parchment nested elements)
- Stat card layout with trend indicators
- Responsive breakpoints (mobile, tablet, desktop)
- Navigation items match role-based sidebar spec from Architecture §4

---

## 3. `journey-os-responsive.jsx` — Landing / Marketing Page

**Route:** `/` (public, pre-auth)  
**Sprint:** 3 or Pre-Sprint 0  
**Persona:** Prospective institutions, visiting faculty

**Design:**
- Full responsive landing page with hero, features, social proof, CTA
- MSM brand alignment: Education Pillar (Evergreens) + True Blues palette
- Woven thread motif (consistent with login)
- Mobile-first: stacks cleanly at all breakpoints (< 640, 640–1024, > 1024)

**Must reproduce:**
- Hero section with navy deep background
- Feature cards on white surface
- Responsive grid behavior at all three breakpoints
- CTA button styling (navy deep primary, blue mid secondary)
- Footer layout

---

## Design Token Cross-Reference

All three screens use identical tokens. These MUST match DESIGN_SPEC.md:

```javascript
navyDeep: "#002c76"    // Primary brand, hero bg, CTA buttons
navy:     "#003265"    // Secondary dark
blue:     "#004ebc"    // Links, accents
blueMid:  "#2b71b9"    // Secondary actions
green:    "#69a338"    // Success states, approved indicators
cream:    "#f5f3ef"    // Page background (Layer 1)
parchment:"#faf9f6"    // Nested containers (Layer 2)
white:    "#ffffff"    // Cards, panels, primary reading (Layer 3)
ink:      "#1b232a"    // Primary text
border:   "#e2dfd8"    // Card borders
error:    "#c9282d"    // Validation errors
```

If any token in the final app doesn't match these values, it's wrong. Fix the app, not the spec.
