# Journey OS — Complete Design Specification
## The Single Source of Truth

*AI-Powered Competency-Based Medical Education Platform — Morehouse School of Medicine*
*78 screens · 5 templates · 4 personas · 1 reasoning system*

This document replaces all previous design system files. It is organized around the mental models that generate the system, not around component catalogs. If you internalize Part 1, you can make correct decisions for any screen — including screens not yet specified.

---

# PART 1: THE REASONING SYSTEM

Before any hex values, font sizes, or component specs — internalize these models. They are the DNA from which everything else grows.

---

## 1.1 WHAT THIS IS

Journey OS is the substrate — a knowledge graph operating system (Neo4j kernel, Anthropic Claude, Supabase auth, pgvector search) with 75+ node types and 80+ relationship types. It serves four personas — Faculty, Institutional Leaders (Admin), Advisors, and Students — across 78 screens in 14 functional areas.

The UI is a set of persona experiences sitting on top of that graph. Every design decision reflects this depth without exposing technical complexity.

The visual identity comes from the **MSM Brand Identity Style Guide**, specifically the **Education Pillar** palette. The "Woven Tapestry" concept from MSM's 2022 Annual Report — geometric squares representing four pillars (Education, Research, Clinical, Community) in ascending orientation — is the DNA of every visual element.

---

## 1.2 THREE SHEETS OF PAPER

The entire UI is built on three warm surfaces. Think of a desk with sheets of paper on it:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   CREAM (#f5f3ef) — the desk                                │
│   The largest surface. Page backgrounds. Dashboard content  │
│   areas. The warm tone visible between and behind cards.    │
│   Section alternation fill on landing pages.                │
│                                                             │
│     ┌─────────────────────────────────────────────────┐     │
│     │                                                   │     │
│     │   WHITE (#ffffff) — a sheet of paper on the desk  │     │
│     │   Cards on cream backgrounds. Primary reading     │     │
│     │   surfaces. Active tabs. Modal bodies. Question   │     │
│     │   stems. The content you focus on.                │     │
│     │                                                   │     │
│     │     ┌─────────────────────────────────────┐       │     │
│     │     │                                       │       │     │
│     │     │   PARCHMENT (#faf9f6) — a note on      │       │     │
│     │     │   the sheet                              │       │     │
│     │     │   Nested elements inside white cards.    │       │     │
│     │     │   Inputs. Table headers. Form panels.    │       │     │
│     │     │   Sidebar active items. Row hovers.      │       │     │
│     │     │                                       │       │     │
│     │     └─────────────────────────────────────┘       │     │
│     │                                                   │     │
│     └─────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The outermost layer is the largest surface area on screen. The innermost is the smallest. This matches what you see: cream fills the page, white cards sit on top, parchment elements nest inside those cards.

There are no pure grays anywhere. `#f5f5f5`, `#e5e5e5`, `#999` are forbidden. Every neutral has a yellow-warm undertone pulled from MSM's Pantone 7527c (→ warmGray `#d7d3c8`). This keeps the interface human and textured, not sterile.

---

## 1.3 THE ONE RULE

**Cards always contrast their parent surface.**

This single rule governs every surface decision in all 78 screens:

```
Parent Surface    →    Child Surface    →    Grandchild Surface
─────────────────────────────────────────────────────────────────
cream                  white                 parchment
white                  parchment             white
parchment              white                 —
navyDeep (inverted)    text only             —
```

If you know what surface you're on, you know what color every child element should be. No exceptions.

**Applied everywhere:**
- Card on cream → ALWAYS white bg
- Input inside white card → parchment bg (most common case)
- Input inside parchment panel → white bg (The One Rule applies to inputs too)
- Nested panel inside parchment card → ALWAYS white bg
- Table header row inside white card → ALWAYS parchment bg
- Row hover inside white table → ALWAYS parchment bg

**Violations are bugs:**
- Card on cream with parchment bg → BUG
- Input on white card with white bg → BUG
- Input on parchment panel with parchment bg → BUG (should be white)
- Nested card same color as parent → BUG

**Why this matters most:** If this rule breaks, the interface goes flat. Cards don't lift. Content lacks visual grouping. The system feels assembled from parts instead of grown from a shared root. This one rule is responsible for more visual quality than any other decision.

### The One Rule Applied: Login Page

Every surface annotated. This is the source of truth for how Template C (Split Panel) layers:

```
┌─────────────────────────┬──────────────────────────────────────────────┐
│                         │                                              │
│   BRAND PANEL           │  Form panel background: cream (#f5f3ef)      │
│   white bg (#ffffff)    │  Optional: WovenField at 0.015 opacity       │
│   WovenField texture    │                                              │
│   (navyDeep, 0.02)      │    ┌──────────────────────────┐              │
│                         │    │ Login card: white         │  ← card on  │
│   Logo (serif+mono)     │    │ border: 1px borderLight   │    cream =  │
│   Ascending squares     │    │ border-radius: 12px       │    white    │
│   Headline (serif)      │    │ padding: 32px             │             │
│   Subtitle (sans)       │    │ box-shadow: panel         │             │
│                         │    │   (0 8px 32px             │             │
│   Pillar grid (bottom)  │    │    rgba(0,44,118,0.04))   │             │
│   ThreadDivider         │    │                           │             │
│   Institution (mono)    │    │ Input bg: parchment       │  ← input   │
│                         │    │ Input border: border      │    inside   │
│   1px borderLight →     │    │ Input focus: blueMid      │    white =  │
│                         │    │                           │    parchment│
│                         │    │ Button bg: navyDeep       │             │
│                         │    │ Button hover: blue        │             │
│                         │    │                           │             │
│                         │    │ Tab strip: parchment bg   │  ← nested  │
│                         │    │   Active tab: white bg    │    element  │
│                         │    │                           │    on white │
│                         │    └──────────────────────────┘              │
│                         │                                              │
│                         │  Footer text: textMuted on cream             │
└─────────────────────────┴──────────────────────────────────────────────┘
```

The entire login page is the Three Sheets in miniature: cream desk (form panel background) → white top sheet (login card) → parchment elements floating on white (inputs, tab track). Every surface is one step lighter than its parent.

### The One Rule Applied: Dashboard

Every surface annotated. This is the source of truth for how Template A (Dashboard Shell) layers:

```
┌─────────────────────────────────────────────────────┐
│ Sidebar: white (#ffffff)                             │
│  right-border: 1px borderLight                       │
│  Logo: serif "Journey" + mono "OS" badge             │
│  Nav items: textSecondary, active → navyDeep text    │
│  Active item bg: parchment          ← on white =     │
│                                        parchment     │
│  ● navyDeep section marker dots                      │
│  ■ navyDeep square avatar (bottom)                   │
├─────────────────────────────────────────────────────┤
│ Top bar: white, bottom-border: borderLight           │
│  (frosted glass: #ffffffF2 + blur 12px)              │
│  navyDeep serif page title                           │
├─────────────────────────────────────────────────────┤
│ Main content area: cream (#f5f3ef)   ← the desk     │
│                                                      │
│  ┌════════════════════════════════════════┐           │
│  ║ KPI strip: navyDeep (#002c76)          ║ ← THE    │
│  ║ WovenField: white threads, 0.015       ║   BOOK-  │
│  ║ text: white                            ║   MARK   │
│  ║ stat cards: rgba(255,255,255,0.06)     ║   one    │
│  ║ muted text: bluePale (#a3d9ff)         ║   per pg │
│  └════════════════════════════════════════┘           │
│                                                      │
│  ┌────────────────┐  ┌────────────────┐              │
│  │ Card: white     │  │ Card: white    │  ← cards on │
│  │ border:         │  │ border:        │    cream =   │
│  │ 1px borderLight │  │ 1px borderLight│    white     │
│  │                 │  │                │              │
│  │ ● navyDeep dot  │  │ Table:         │              │
│  │ navyDeep title  │  │ header row =   │  ← nested   │
│  │                 │  │   parchment    │    on white  │
│  │ Nested:         │  │ body rows =    │    = parch   │
│  │ parchment bg    │  │   white        │              │
│  │ 4px navyDeep    │  │ row hover =    │  ← navy     │
│  │   accent bar on │  │   parchment    │    accents   │
│  │   priority item │  │ 3px navyDeep   │    inside    │
│  │                 │  │   left bar on  │    cards     │
│  │ ■ navyDeep btn  │  │   selected row │    (unlim)  │
│  └─────────────────┘  └────────────────┘              │
│                                                      │
│  ┌──────────────────────────────────────┐            │
│  │ White card with inner panel:         │            │
│  │                                      │            │
│  │  ┌─────────────────────────────┐     │            │
│  │  │ Inner panel: parchment      │     │ ← panels   │
│  │  │ (settings, filters, detail) │     │   inside    │
│  │  │                             │     │   white     │
│  │  │  Input bg: white            │     │   cards =   │
│  │  │  (One Rule: parchment       │     │   parchment │
│  │  │   parent → white child)     │     │             │
│  │  │  Input border: border       │     │             │
│  │  └─────────────────────────────┘     │            │
│  │                                      │            │
│  └──────────────────────────────────────┘            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Read this diagram top-to-bottom and you see the entire system at work: sidebar (white) → content area (cream) → cards (white on cream) → nested elements (parchment on white) → inputs contrast their parent → one navyDeep bookmark strip at the top → navy accent elements (dots, bars, buttons, badges) woven throughout every card.

### The One Rule Applied: Landing Page Section Rhythm

The landing page proves the system works at scale. Eleven sections alternate surfaces in A-B pattern, broken once by the navyDeep bookmark:

```
Section                    Background              Border             Card/Element Surface
──────────────────────────────────────────────────────────────────────────────────────────
Nav                        white (solid → frosted)  bottom: borderLight  —
Hero                       gradient: white→cream→   —                    parchment persona tabs
                           parchment (170°)                              on white top area
The Problem                white                    top: borderLight     parchment cards on white
What It Does               cream + WovenField       top: borderLight     white cards on cream
Stats Bar                  navyDeep (BOOKMARK)      —                    frosted glass stat cards
How It Works               white                    bottom: borderLight  parchment step cards
Benefits                   cream + WovenField       bottom: borderLight  white cards on cream
Coverage Chain             white                    —                    parchment nodes on white
Research                   cream                    top+bottom: border   white cards on cream
Waitlist                   white + WovenField       —                    parchment form on white
Footer                     parchment                top: borderLight     white links on parchment
```

Notice the "Card/Element Surface" column: it is always the opposite of its parent. White sections get parchment children. Cream sections get white children. The One Rule, applied eleven times without exception.

### The Three Layers Summarized

Think of it as three sheets of paper stacked:

1. **White** — the top sheet, clean, for primary reading
2. **Parchment** — slightly warm, for things that "float" on white (cards, panels, form containers, inputs)
3. **Cream** — the desk surface visible between the sheets

Cards always contrast their parent — white on cream, parchment on white. Inputs follow the same rule: parchment inside white cards (most common), white inside parchment panels. One large navy section breaks the rhythm like a bookmark between pages, while navy accent elements (dots, bars, buttons, badges, tinted backgrounds) appear freely inside cards throughout.

### Quick Reference: Surface CSS Variables

These aliases map to the semantic meaning of each surface:

```css
:root {
  /* Surfaces by role */
  --bg-primary: #ffffff;        /* white — top sheet, cards on cream */
  --bg-elevated: #faf9f6;       /* parchment — cards on white, inputs, form panels */
  --bg-muted: #f5f3ef;          /* cream — page bg, content area, section alternation */
  --bg-inverted: #002c76;       /* navyDeep — bookmark strip (one per page) + navy accents */

  /* Borders */
  --border-light: #edeae4;      /* structural: section dividers, card edges */
  --border-default: #e2dfd8;    /* interactive: inputs, hover targets */
  --border-warm: #d7d3c8;       /* decorative: thread dividers, woven texture */

  /* Inverted surface text */
  --text-on-inverted: #ffffff;
  --text-on-inverted-muted: #a3d9ff;  /* bluePale */

  /* Interactive on surfaces */
  --focus-ring: #2b71b9;        /* blueMid — input focus borders */
  --button-primary: #002c76;    /* navyDeep */
  --button-primary-hover: #004ebc; /* blue */
}
```

---

## 1.4 NAVY AS A SURFACE: TWO SCALES

Navy (`navyDeep` #002c76) is the system's highest-contrast surface color. It appears at two distinct scales, each with different rules.

### Scale 1: The Bookmark (one per page)

One full-width or near-full-width `navyDeep` inverted section per page. The KPI strip on dashboards. The stats bar on the landing page. The command bar on admin screens. The score summary on student results. This is the "bookmark between pages of a book" — a single large moment of visual weight that anchors the eye and establishes page context.

**Bookmark rules:**
- Never more than one bookmark per page
- Always contains the most important contextual information (KPIs, greeting, progress, score)
- Gets `border-radius: 12px` when inside content padding, `0` when full-bleed
- Always gets WovenField canvas texture (white threads at 0.015 opacity on navy)
- Text is white. Muted text is `bluePale` (#a3d9ff)
- Stat cards inside use frosted glass: `rgba(255,255,255,0.06)` bg, `rgba(255,255,255,0.08)` border, `backdrop-filter: blur(4px)`

**Why one bookmark:** Navy on cream is the strongest contrast available. If there were two full-width navy sections, they'd compete for attention and neither would anchor anything. One creates a focal point. Multiple create noise. The bookmark is the spine of the page — there's only one.

### Scale 2: Navy Accents (unlimited within cards)

Navy also appears as accent elements *inside* the warm surface hierarchy. These are small, contained uses that add weight and brand presence without competing with the bookmark. They are part of the 70% True Blues budget and appear on every screen.

**Navy accent patterns (all permitted, use freely):**

```
ELEMENT                    TREATMENT                        WHERE USED
──────────────────────────────────────────────────────────────────────────
Accent bar (left/top)      3-4px solid navyDeep             Priority cards, selected rows,
                                                            featured items, active states
Tinted background          navyDeep at 5-8% opacity         Badges (navyDeep/8%), activity
                                                            feed icons, week badges,
                                                            stat highlights, tag chips
Filled small elements      solid navyDeep bg, white text    Buttons, checkboxes, toggles,
                                                            avatars (square), chat bubbles,
                                                            persona tab active states,
                                                            step indicators (active)
Card header accent         navyDeep/5% bg on header row     Featured/pinned cards, alert
                           OR 2px navyDeep bottom border    cards, "new" content markers
Stat value highlight       navyDeep bg, white text,         Inline stat callouts inside
                           radius md, padding 4px 10px      white cards (small, contained)
Section marker dots        5px solid navyDeep square        Every card header (structural)
Text color                 navyDeep for headings,           All serif headings, all card
                           navyDeep for emphasis             titles, link hover states
```

**The distinction:** A bookmark is a *section* — it spans the full content width, has its own internal layout (greeting, stat grid, woven texture), and serves as the page's primary anchor. Navy accents are *elements* — they sit inside cards, inside rows, inside components. They add weight and brand presence at the card level.

**What this means in practice:** A Faculty Dashboard has one navy KPI strip (the bookmark) AND navy accent bars on priority task cards, navy tinted badges on course rows, navy checkboxes, navy buttons, navy section marker dots, and navy stat highlights inside white cards. The page reads as blue-dominant because navy is *everywhere at the element level*, but there's still only one large inverted section anchoring the top.

### Combined: How Much Navy Is On A Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar: white bg                                            │
│   ● navyDeep section marker dots                             │
│   ■ navyDeep active nav text                                 │
│   ■ navyDeep square avatar (bottom)                          │
├──────────────────────────────────────────────────────────────┤
│ Top bar: white bg                                            │
│   navyDeep page title (serif)                                │
│   navyDeep notification dot                                  │
├──────────────────────────────────────────────────────────────┤
│ Content area: cream bg                                       │
│                                                              │
│  ┌═══════════════════════════════════════════════════════┐   │
│  ║  BOOKMARK — navyDeep bg, full content width           ║   │
│  ║  WovenField texture, frosted stat cards               ║   │
│  ║  This is the ONE large inverted section                ║   │
│  └═══════════════════════════════════════════════════════┘   │
│                                                              │
│  ┌─ White card ──────────────────┐  ┌─ White card ──────┐   │
│  │ ● navyDeep marker dot         │  │ ● navyDeep dot    │   │
│  │ navyDeep serif title          │  │ navyDeep title     │   │
│  │                               │  │                    │   │
│  │ 4px navyDeep left bar         │  │ ▣ navyDeep/8%     │   │
│  │   on priority row             │  │   tinted badges    │   │
│  │                               │  │                    │   │
│  │ ■ navyDeep primary button     │  │ □ navyDeep         │   │
│  │                               │  │   checkbox         │   │
│  │ navyDeep/5% featured bg       │  │                    │   │
│  └───────────────────────────────┘  └────────────────────┘   │
│                                                              │
│  ┌─ White card ──────────────────────────────────────────┐   │
│  │ Table: navyDeep header text, 3px navyDeep left bar    │   │
│  │ on selected row, navyDeep link text in action column  │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

Navy is the dominant color on every dashboard — in text, dots, bars, buttons, badges, and the bookmark. The restriction is only that large inverted *sections* don't multiply.

---

## 1.5 THE 70/30 SPLIT

The overall system palette is approximately **70% True Blues** (navy, blue, blueMid — structure, headings, buttons, inverted sections) and **30% Evergreens** (greenDark, green — badges, labels, success states, accents). This ratio comes from the MSM brand guide's Education Pillar specification.

**How this manifests in practice:** Blues dominate structure on every screen — navyDeep headings, primary buttons, inverted bookmarks, links. Green appears as punctuation: section marker dots on curriculum cards, success badges, coverage ring fills, progress bars, the "OS" logo badge. On brand-heavy screens (landing page, onboarding) the 70/30 is visible. On structural screens (settings, data tables, review lists) the ratio skews more like 85/15 because there's less curriculum content to accent.

The key constraint: green is never used for primary navigation, page headings, or buttons (except the one-off "Approve" button which uses green bg as a semantic override). Green accents. Blue structures. If a screen feels like it has no green at all, that's acceptable — but if green starts competing with blue for structural roles, that's wrong.

---

## 1.6 THE TYPE TRIO

Three font families with non-negotiable roles:

```
FAMILY              WEB FONT          ROLE
──────────────────────────────────────────────────────────────────
Lora (serif)        Google Fonts      Display moments. Headings. Titles. Hero text.
                    maps to MSM's     Card titles. The eye-catching font.
                    Heuristica         Used for the most prominent text on any screen.

Source Sans 3       Google Fonts      Everything else. Body copy. Buttons. Navigation.
(sans)              maps to MSM's     Descriptions. Form text. The workhorse.
                    Myriad Variable

DM Mono (mono)      Google Fonts      Structural annotations. Labels. Badges.
                                      Timestamps. Field labels. Data values.
                                      ALWAYS uppercase. ALWAYS letter-spaced. ALWAYS small.
```

**The absolute rule:** Mono text that isn't uppercase = bug. Heading that isn't serif = wrong (unless card subtitle → sans/700). Label in sans-serif = should be mono.

The trio creates three distinct textures: serif pulls the eye (I'm important), sans recedes (read me), mono signals structure (I'm metadata).

---

## 1.7 THE SECTION MARKER

The single most repeated pattern in the system. Every card header, every section opener, every panel:

```
● MY COURSES                    ← 5px dot + mono/label-md/uppercase/textMuted
Active Courses                  ← serif/heading-lg/navyDeep
Optional description            ← sans/body-sm/textSecondary
```

Dot color = category: `navyDeep` for structural (courses, tasks, questions), `greenDark` for curriculum/education (mastery, coverage, outcomes). This heartbeat pattern means the eye learns to parse cards instantly.

---

## 1.8 THE SURFACE RHYTHM

On the landing page and any long-scroll page, surfaces alternate A-B-A-B:

```
white → cream → white → cream (with one navyDeep bookmark breaking the pattern)
```

Never stack two same-colored sections without a visual break (1px borderLight, inverted strip, or surface change).

---

## 1.9 ANTI-PATTERNS

Everything this system explicitly forbids:

```
✗  Pure grays (#f5f5f5, #e5e5e5, #999)      → warm neutrals only
✗  Black text (#000000)                       → darkest is ink (#1b232a)
✗  Black buttons or backgrounds               → navyDeep (#002c76) instead
✗  Yellow/orange as primary accent             → Education Pillar uses navy + green
✗  Shadows at rest on grid cards            → border only; shadow on hover only
                                              (exception: login card, modals, mobile sidebar)
✗  Arbitrary border-radius                    → only 3, 6, 8, 10, 12px
✗  Colors outside the palette                 → every color is a token
✗  Bold for emphasis in body copy             → navyDeep color shift instead
✗  Emoji as icons                             → SVG or serif symbols (◈ ◆ ◇ ▣ ▢ ✦)
✗  Inter, Arial, Roboto, Geist               → Source Sans 3 is the system sans
✗  Two same-surface sections adjacent         → alternate or break with inverted
✗  More than one inverted SECTION per page    → one bookmark strip only (navy accents
                                              inside cards are unlimited and encouraged)
✗  Card on cream with parchment bg            → cards on cream are ALWAYS white
✗  Input same bg as parent surface           → inputs contrast parent (parchment on white,
                                              white on parchment)
✗  Lowercase mono labels                      → ALWAYS uppercase
✗  Italic headings                            → serif 700 upright always
✗  Generic "Loading..." bare text             → skeleton or spinner
✗  Circle avatars                             → squares (the system shape)
```

---

# PART 2: DESIGN TOKENS

Every value is a token. No raw hex, no magic numbers.

---

## 2.1 COLORS

```css
:root {
  /* ── TRUE BLUES (70% of composition) ───────────────── */
  --navy-deep: #002c76;     /* Headlines, CTAs, inverted sections, primary buttons */
  --navy: #003265;          /* Deep accents, sidebar active text */
  --blue: #004ebc;          /* Hover on navyDeep, interactive emphasis */
  --blue-mid: #2b71b9;      /* Focus rings, links, secondary interactive */
  --blue-light: #00a8e1;    /* Advisor persona, info states */
  --blue-pale: #a3d9ff;     /* Text-on-inverted muted, sparklines */

  /* ── EVERGREENS (30% of composition) ───────────────── */
  --green-dark: #5d7203;    /* Labels, badges, OS tag, section markers on cream */
  --green: #69a338;         /* Success states, faculty persona, progress fills */
  --lime: #d8d812;          /* Reserved — MSM brand, not yet used in UI */

  /* ── SURFACES (warm neutrals — no pure grays) ──────── */
  --white: #ffffff;         /* Layer 3: primary reading, active tabs, content */
  --parchment: #faf9f6;     /* Layer 2: cards on white, inputs, form panels */
  --cream: #f5f3ef;         /* Layer 1: page bg, dashboard content area */
  --warm-gray: #d7d3c8;     /* Decorative: thread dividers, subtle borders */

  /* ── BORDERS ───────────────────────────────────────── */
  --border-light: #edeae4;  /* Structural: section dividers, card edges */
  --border: #e2dfd8;        /* Interactive: input borders, hover targets */

  /* ── TEXT ───────────────────────────────────────────── */
  --ink: #1b232a;           /* Body copy, headings (= textPrimary) */
  --text-secondary: #4a5568;/* Descriptions, card body text */
  --text-muted: #718096;    /* Labels, captions, placeholders, timestamps */
  --text-on-inverted: #ffffff;
  --text-on-inverted-muted: #a3d9ff;

  /* ── SEMANTIC ──────────────────────────────────────── */
  --success: #69a338;       /* = green */
  --warning: #fa9d33;       /* MSM Bright Earth */
  --danger: #c9282d;        /* MSM Bright Earth */
  --info: #00a8e1;          /* = blueLight */
}
```

**Persona identifiers** (tab strips, color bars, indicators):
- Faculty: `navyDeep` #002c76
- Admin: `blueMid` #2b71b9
- Advisor: `blueLight` #00a8e1
- Student: `green` #69a338

---

## 2.2 TYPOGRAPHY

### Type Scale

```
TOKEN              FONT    WT    SIZE              LEAD   TRACK      USAGE
────────────────────────────────────────────────────────────────────────────
display-xl         serif   700   54/38/30px*       1.18   -0.015em   Landing hero H1
display-lg         serif   700   34px              1.25   -0.015em   Section H2 (major)
display-md         serif   700   30-32px           1.25   -0.01em    Section H2 (standard)
display-sm         serif   700   24-26px           1.25   -0.01em    Mobile H2, sub-headers
heading-lg         serif   700   22px              1.3    -0.01em    Card titles, page headings
heading-md         sans    700   16px              1.35   0          Card subtitles, nav items
heading-sm         sans    700   15px              1.35   0          Step titles, row titles
body-lg            sans    400   18px              1.8    0          Hero subtitle, lead text
body-md            sans    400   16px              1.75   0          Body copy, descriptions
body-sm            sans    400   15px              1.7    0          Card body, table cells
body-xs            sans    400   14px              1.65   0          Detail text, metadata
caption            sans    400   13px              1.5    0          Links, help text, fine print
label-lg           mono    500   11px              1      0.1em      Section markers (with dot)
label-md           mono    500   10px              1      0.08em     Field labels, timestamps
label-sm           mono    500   9px               1      0.08em     Badge text, tags, indicators
label-xs           mono    400   8px               1      0.08em     Pillar square labels

* display-xl is responsive: 54px desktop / 38px tablet / 30px mobile
```

### Font Stacks

```css
:root {
  --font-serif: var(--font-lora), Georgia, serif;
  --font-sans: var(--font-source-sans), -apple-system, system-ui, sans-serif;
  --font-mono: var(--font-dm-mono), Menlo, monospace;
}
```

### Tailwind Extension

```js
fontSize: {
  'display-xl': ['clamp(1.875rem, 4vw, 3.375rem)', { lineHeight: '1.18', letterSpacing: '-0.015em' }],
  'display-lg': ['2.125rem', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
  'display-md': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
  'display-sm': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
  'heading-lg': ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
  'heading-md': ['1rem', { lineHeight: '1.35' }],
  'heading-sm': ['0.9375rem', { lineHeight: '1.35' }],
  'body-lg': ['1.125rem', { lineHeight: '1.8' }],
  'body-md': ['1rem', { lineHeight: '1.75' }],
  'body-sm': ['0.9375rem', { lineHeight: '1.7' }],
  'body-xs': ['0.875rem', { lineHeight: '1.65' }],
  'caption': ['0.8125rem', { lineHeight: '1.5' }],
  'label-lg': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.1em' }],
  'label-md': ['0.625rem', { lineHeight: '1', letterSpacing: '0.08em' }],
  'label-sm': ['0.5625rem', { lineHeight: '1', letterSpacing: '0.08em' }],
}
```

---

## 2.3 SPACING (4px base unit)

```
TOKEN     VALUE    CSS VAR           TAILWIND    USAGE
────────────────────────────────────────────────────────────────
xs        4px      --space-xs        gap-1       Icon gaps, tight grouping
sm        6px      --space-sm        gap-1.5     Grid gaps, badge padding
md        8px      --space-md        gap-2       Logo gap, inline grouping
lg        12px     --space-lg        gap-3       Card gaps (mobile)
xl        16px     --space-xl        gap-4 p-4   Card padding (mobile), connectors
2xl       20px     --space-2xl       gap-5 p-5   Card padding, field spacing
3xl       24px     --space-3xl       gap-6 p-6   Card padding (large), nav height
4xl       28px     --space-4xl       gap-7 p-7   Wrap horizontal padding
5xl       32px     --space-5xl       gap-8 p-8   Form padding, section intros
6xl       40px     --space-6xl       gap-10      Section group spacing
7xl       48px     --space-7xl       gap-12      Section header-to-content (desktop)
8xl       56px     --space-8xl       py-14       Stats section padding
9xl       64px     --space-9xl       py-16       Section padding (mobile)
10xl      90px     --space-10xl      py-[90px]   Section padding (desktop)
```

**Container:** `max-width: 1120px`, centered, `padding: 0 28px` (desktop) / `0 18px` (mobile).

---

## 2.4 BORDERS & RADII

```css
:root {
  --radius-sm: 3px;    /* Logo OS badge, small tags, badge pills */
  --radius-md: 6px;    /* Buttons, tabs, step indicators, nav items */
  --radius-lg: 8px;    /* Cards (small), inputs, pillar squares */
  --radius-xl: 10px;   /* Feature cards, benefit cards */
  --radius-2xl: 12px;  /* Dashboard cards, form panels, modals, KPI strip */
}
```

Five values only. No arbitrary radii.

---

## 2.5 SHADOWS

Shadows are accent, not structure. Elevation comes from surface color contrast. Shadow color is ALWAYS derived from `navyDeep rgba(0,44,118,...)`, never black.

```css
:root {
  --shadow-subtle: 0 1px 3px rgba(0,0,0,0.04);           /* Active tab chip */
  --shadow-card: 0 4px 16px rgba(0,44,118,0.05);          /* Card hover */
  --shadow-lifted: 0 4px 20px rgba(0,44,118,0.06);        /* Feature card hover */
  --shadow-panel: 0 8px 32px rgba(0,44,118,0.04);         /* Login form, modals */
  --shadow-focus: 0 0 0 3px rgba(43,113,185,0.08);        /* Input focus ring */
  --shadow-sidebar: 4px 0 24px rgba(0,44,118,0.06);       /* Mobile sidebar */
}
```

**RULE: No shadows at rest** for standard cards. Cards in dashboard grids, review lists, and data tables have `border: 1px solid var(--border-light)` and zero shadow. Shadow appears ONLY on hover or focus.

**Exceptions — shadow at rest:** A small set of elements float as the sole focal point on their surface and use `shadow-panel` at rest to establish visual weight:
- Login form card (the only element on the cream form panel)
- Modal panels (floating over a backdrop)
- Mobile sidebar overlay (sliding over content)

These are not cards in a grid competing with siblings — they are singular focal containers. The shadow reinforces "this is the thing to look at." If you're placing a card alongside other cards, it never gets a shadow at rest.

---

## 2.6 TRANSITIONS

```css
:root {
  --transition-fast: 150ms ease;     /* Checkbox, icon swap, row highlight */
  --transition-default: 200ms ease;  /* Border, color, background shifts */
  --transition-medium: 250ms ease;   /* Card hover states */
  --transition-slow: 300ms ease;     /* Nav scroll, sidebar slide */
  --transition-reveal: 500ms ease;   /* Scroll-triggered fade-in (landing) */
}
```

Stagger: 60-100ms per item for sequential reveals.

---

## 2.7 Z-INDEX

```css
:root {
  --z-base: 0;
  --z-card: 1;
  --z-card-hover: 10;
  --z-sidebar: 40;
  --z-sticky: 50;
  --z-sheet: 70;
  --z-dialog: 80;
  --z-dropdown: 90;
  --z-tooltip: 100;
}
```

---

# PART 3: COMPONENT LIBRARY

Atomic hierarchy: atoms → molecules → organisms → templates → pages. Every component references tokens, never raw values.

---

## 3.1 ATOMS (Level 1)

Located: `/src/app/components/ui/`

50 shadcn/ui base components. The design system adds styling constraints on each.

### Section Marker (section-marker.tsx) — NEW

```tsx
export function SectionMarker({ label, color = "navy" }) {
  const dotColor = color === "green" ? "var(--green-dark)" : "var(--navy-deep)";
  return (
    <div className="flex items-center gap-2">
      <div className="w-[5px] h-[5px] rounded-[1px]" style={{ background: dotColor }} />
      <span className="font-mono text-label-md uppercase text-muted">{label}</span>
    </div>
  );
}
```

### Buttons (button.tsx)

```
VARIANT        BG              TEXT         HOVER BG        BORDER
────────────────────────────────────────────────────────────────────
primary        navyDeep        white        blue            none
secondary      transparent     navyDeep     transparent     1.5px border
ghost          transparent     textMuted    parchment       none
outline        transparent     navyDeep     parchment       1px border
destructive    danger          white        #a71f23         none
```

All: `font-family: Source Sans 3`, `font-weight: 700`, `font-size: 15px`, `border-radius: md (6px)`.
Sizes: sm (32px), md (40px), lg (48px). Disabled: `warmGray bg, textMuted color`.
Loading: text → CSS spinner (18px, 2px border, white on primary). Touch target: 44px min mobile.

### Inputs (input.tsx)

```
background:     follows The One Rule — contrasts parent surface
                on white card → parchment (#faf9f6)  (most common)
                on parchment panel → white (#ffffff)
border:         1px solid border (#e2dfd8)
border-radius:  lg (8px)
font:           Source Sans 3 / 15px / 400
padding:        13px 16px
color:          ink (#1b232a)
placeholder:    textMuted (#718096)
height:         44px (standard), 120px min (textarea)

STATES:
  default:      contrasting bg, border edge
  focus:        border → blueMid, box-shadow: focus token
  error:        border → danger, helper text in danger
  disabled:     opacity 0.5
```

Field labels: `DM Mono / 10px / 500 / uppercase / 0.08em / textMuted`. Above input, 6px gap.

### Card (card.tsx) — THE CRITICAL ATOM

Background is context-dependent (The One Rule applied at component level):

```tsx
<Card>                         // white bg — use when parent is cream
<Card variant="elevated">      // parchment bg — use when parent is white
<Card variant="inverted">      // rgba(w,0.06) bg — use inside navyDeep sections
```

```
VARIANT      BG              BORDER              CHILD ELEMENT BG
──────────────────────────────────────────────────────────────────
default      white           1px borderLight      parchment (inputs, nested panels, headers)
elevated     parchment       1px borderLight      white (inputs, nested panels)
inverted     rgba(w,0.06)    1px rgba(w,0.08)     rgba(w,0.1)
```

All cards: `border-radius: 2xl (12px)`. Padding: `20px 24px` desktop / `16px` mobile.
Hover: `border → blueMid`, `box-shadow: card-hover`. Transition: `medium (250ms)`.

### Badges (badge.tsx)

```
VARIANT      BG                    TEXT            BORDER
──────────────────────────────────────────────────────────────
default      navyDeep/8%           navyDeep        none
secondary    parchment             textMuted       1px borderLight
success      green/10%             greenDark       none
warning      warning/10%           warning         none
destructive  danger/10%            danger          none
outline      transparent           textMuted       1px border
```

All: `DM Mono / 9px / 500 / uppercase / 0.08em / padding: 2px 8px / radius: sm (3px)`.

### Tabs

```
Container:    parchment bg, 1px borderLight, radius lg (8px), padding 4px
Item:         Source Sans 3 / 13px / ghost button
Active:       white bg + subtle shadow (role selector) OR navyDeep bg + white text (persona selector)
Inactive:     transparent bg, textMuted
Hover:        parchment bg
```

### Checkboxes

```
18×18px, radius 4px
Unchecked: white bg, 1.5px border
Checked: navyDeep bg, navyDeep border, white SVG checkmark (1.8px stroke)
```

### Skeleton (skeleton.tsx)

```
background: parchment fill, pulse animation toward warmGray
border-radius: md (6px)
```

Never gray. Always warm-toned loading states.

---

## 3.2 MOLECULES (Level 2)

Located: `/src/app/components/shared/`

### Card with Header (universal composition)

Every card in the system:

```tsx
<Card>
  <CardHeader className="pb-3">
    <SectionMarker label="My Courses" color="navy" />
    <div className="flex items-center justify-between mt-1">
      <CardTitle className="font-serif text-heading-lg text-[--navy-deep]">
        Active Courses
      </CardTitle>
      <Button variant="ghost" size="sm">View all →</Button>
    </div>
  </CardHeader>
  <CardContent>{/* ... */}</CardContent>
</Card>
```

### Stat Card (stat-card.tsx)

Two variants based on parent surface:

```
INVERTED (on navyDeep):
  bg: rgba(255,255,255,0.06), border: rgba(255,255,255,0.08), backdrop-filter: blur(4px)
  label: mono/9px/bluePale/0.6 opacity/uppercase
  value: serif/28px/700/white
  context: sans/11px/bluePale/0.65 opacity
  sparkline: bluePale stroke

LIGHT (on cream or white):
  bg: parchment (on white parent) or white (on cream parent)
  border: 1px borderLight
  label: mono/9px/textMuted
  value: serif/28px/700/navyDeep
  context: sans/11px/textSecondary
  sparkline: blueMid stroke
```

### Labeled Input (labeled-input.tsx)

```
┌───────────────────────────────────────┐
│  EMAIL (label-md, mono, uppercase)    │  ← 6px gap
│  ┌───────────────────────────────┐    │
│  │  you@msm.edu                   │    │  ← input atom
│  └───────────────────────────────┘    │
│  Required field (caption, danger)     │  ← optional error
└───────────────────────────────────────┘
```

### Hover-Reveal Card (hover-card-reveal.tsx)

Used on feature cards, research cards, question cards:

```
Rest:   borderLight border, no shadow, description text visible
Hover:  border → blueMid, shadow-lifted, description swaps to detail text
        transition: medium (250ms)
Mobile: no hover, show description always
```

### Progress Ring (progress-ring.tsx)

```
SVG donut: 40×40px (inline) / 64×64px (standalone)
track: 3px stroke, borderLight
fill:  3px stroke, color by threshold:
       > 80% → green
       60-80% → blueMid
       < 60% → warning
center text: mono/9px/500/textSecondary (percentage)
```

### Sparkline (sparkline.tsx)

```
Mini SVG polyline: 60-80px wide, 24-28px tall
stroke: 1.8px, bluePale (on inverted) or blueMid (on light)
dot: 2.5px circle on last data point
data: 7 points (one week of trend)
```

### Mastery Cell (mastery-cell.tsx)

```
aspect-ratio: 1:1, radius 4px
> 70%  → green bg
40-70% → blueMid bg
15-40% → bluePale bg
< 15%  → borderLight bg
text: mono/9px, white (on dark) or textMuted (on light)
hover: tooltip with topic name + exact percentage
```

### Ascending Squares (ascending-squares.tsx)

```
4 squares in pillar colors, ascending left-to-right
Each offset upward by size × 0.2px
Props: colors[], size (px), gap (px)
Colors: education pillar blues + green
Sizes: 8-12px (decorative), 14px (functional), 28-32px (hero)
Usage: hero decoration, step progress, section openers, brand panels, login
```

### Woven Field (woven-field.tsx)

```
Canvas-drawn woven thread pattern
position: absolute, inset: 0, pointer-events: none
Props: color (hex), opacity (0.012-0.025), density (10-24)
Usage: brand panels, hero, inverted sections, waitlist

SPECIFIC USAGES:
  Hero:         navyDeep threads, 0.025 opacity, density 22 (12 mobile)
  What It Does: greenDark threads, 0.015 opacity, density 24 (10 mobile)
  Benefits:     navyDeep threads, 0.012 opacity, density 20 (10 mobile)
  Waitlist:     navyDeep threads, 0.015 opacity, density 16 (10 mobile)
  KPI Strips:   white threads, 0.015 opacity, density 10
```

### Thread Divider (thread-divider.tsx)

```
Two overlapping sinusoidal SVG paths
stroke: warmGray (#d7d3c8), max-width: 200px, height: 20px
Usage: section separators on landing page, between card groups
```

### Logo Wordmark (logo-wordmark.tsx)

```
"Journey"  serif (Lora) / variable size / 700 / navyDeep
"OS"       badge: mono (DM Mono) / 9px / greenDark text / 1.2px greenDark border / 3px radius
Gap:       size-dependent (6-12px)
Variants:  default (navy+green), white (knockout for dark bg), mono (all navy)
Sizes:     xs (16px), sm (19px), md (22px), lg (30px), xl (40px)
```

Always live text + CSS, never an image. Props: `size`, `variant`, `className`, `style`, `onClick`.

**Next.js setup:**
```tsx
// app/layout.tsx
import { Lora, DM_Mono, Source_Sans_3 } from 'next/font/google';
const lora = Lora({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-lora' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400','500'], variable: '--font-dm-mono' });
const sourceSans = Source_Sans_3({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-source-sans' });
```

---

## 3.3 ORGANISMS (Level 3)

Located: `/src/app/components/organisms/`

### Top Navigation (TopNavigation.tsx)

```
height:          64px desktop / 56px mobile
background:      white at 95% opacity + backdrop-filter: blur(12px)
border-bottom:   1px borderLight
position:        sticky, z-index: z-sticky (50)
contains:        hamburger (mobile) | page title (serif) + date (mono) | search | notifications | avatar
```

### Sidebar (in DashboardLayout / AdminLayout)

```
width:           240px desktop / 220px tablet / 260px mobile overlay
background:      white
border-right:    1px borderLight
position:        fixed (desktop) / slide-in overlay (mobile)
shadow:          shadow-sidebar on mobile only

STRUCTURE (top to bottom):
  Logo wordmark (serif "Journey" + mono "OS" badge), size sm
  "MOREHOUSE SCHOOL OF MEDICINE" (mono/9px/uppercase)
  Navigation items: icon + sans/14px label
    Active (faculty): parchment bg, navyDeep text, font-weight 600
    Active (admin):   greenDark left border instead of parchment bg
    Inactive:         transparent bg, textSecondary, font-weight 400
    Hover:            parchment bg (0.15s transition)
  Bottom: settings link + user card (navyDeep square avatar + name + department mono)

MOBILE OVERLAY:
  translateX(-width) → 0 + backdrop (navyDeep/12% + blur 2px)
  transition: medium (250ms)
```

### Inverted KPI Strip (kpi-strip.tsx)

```
background:       navyDeep
border-radius:    2xl (12px) when inside content padding, 0 when full-bleed
contains:         WovenField (white, 0.015) + greeting + summary + stat grid
padding:          24px 28px desktop / 20px 18px mobile

STAT GRID:
  desktop:        repeat(4, 1fr), gap 14px
  mobile:         1fr 1fr (2×2), gap 10px
  Each card:      frosted glass stat-card molecule
```

### Data Table (constrained)

```
container:       Card (white on cream)
header row:      parchment bg, mono/label-md for column headers, uppercase
body rows:       white bg, hover → parchment (transition-fast)
borders:         1px borderLight between rows
selected row:    parchment bg + 3px navyDeep left border
sort indicator:  small chevron, navyDeep when active
pagination:      inside card footer, mono for page numbers
```

### Question Card (constrained)

```
container:       Card (white on cream)
stem:            serif/body-lg (18px, line-height 1.8 for medical density)
"STEM" label:    mono/label-md/textMuted
"OPTIONS" label: mono/label-md/textMuted
options A-E:     each in subtle row, 16px gap
  correct:       3px green left border + green/10% bg
  wrong:         1px borderLight left border
  letter:        mono/label-lg
  text:          sans/body-md
"EXPLANATION":   mono/label-md, text in sans/body-sm
citations:       mono superscript numbers
hover (in list): border → blueMid, shadow-card
```

### Activity Feed (constrained)

```
container:   Card (white on cream)
items:       no card per item — borderLight dividers between
icon:        28px square, radius-md, tinted bg matching type:
             generated → navyDeep/8%, alert → warning/10%, student → blueMid/10%
text:        sans/caption/textSecondary
timestamp:   mono/label-sm/textMuted
```

### Chat Messages (AI Refinement)

```
User messages:   right-aligned, navyDeep bg, white text, radius 12px
AI messages:     left-aligned, white bg, 1px borderLight, radius 12px
Avatars:         28px squares (NOT circles — squares are the system shape)
                 User: navyDeep bg, white initials (mono)
                 AI: parchment bg, navyDeep ◈ symbol
Timestamps:      mono/label-sm, textMuted
Loading:         three-dot typing indicator in parchment bubble
```

### Coverage Chain (visual flow)

```
Desktop:     horizontal cards connected by thread SVG connectors
Mobile:      vertical timeline with dots + connecting lines
Each node:   parchment bg, borderLight border, radius xl
Label:       mono/label-sm/600 on tinted bg matching step color
Thread SVG:  warmGray stroke, 1.5px, sinusoidal curve
```

---

## 3.4 CHARTS & DATA VISUALIZATION

Charts appear on CourseAnalytics, BlueprintCoverage, PersonalDashboard, StudentAnalytics, and AdminDashboard. All charts live inside white cards on cream (Template A), so the chart canvas is white.

### Chart Color Tokens

```
PRIMARY SERIES:
  Line/bar fill:        navyDeep (#002c76) — default single series
  Area fill:            navyDeep at 6% opacity (#002c76/0.06) — under line charts
  Secondary series:     blueMid (#2b71b9)
  Tertiary series:      blueLight (#00a8e1)
  Success series:       green (#69a338) — when showing positive outcomes
  Warning series:       warning (#fa9d33) — when showing thresholds

HEATMAP SCALE (4 steps, reused everywhere — mastery cells, blueprint coverage, activity calendars):
  0 / empty:            borderLight (#edeae4)
  Low (1-3 / <40%):     bluePale (#a3d9ff)
  Medium (4-7 / 40-70%): blueMid (#2b71b9)
  High (8+ / >70%):     navyDeep (#002c76)

PIE/DONUT:
  Slices use:           navyDeep, blueMid, blueLight, green (in that order)
  Never more than 4 slices — group remainder as "Other" in warmGray
```

### Chart Structural Styling

```
AXES:
  Axis labels:          mono / label-sm / textMuted / uppercase
  Tick marks:           1px warmGray, 4px length
  Axis lines:           1px borderLight (x-axis only — no y-axis line, grid lines suffice)

GRID:
  Horizontal lines:     1px borderLight, dashed (2px dash, 4px gap)
  Vertical lines:       none (clean horizontal reading)
  Background:           transparent (inherits white card)

TOOLTIPS:
  Container:            white bg, 1px borderLight, radius md (6px), shadow-card
  Title:                sans / body-xs / 600 / ink
  Value:                mono / label-md / navyDeep
  Label:                sans / caption / textMuted

LEGENDS:
  Position:             above chart, left-aligned (not inside chart area)
  Swatch:               8px square (not circle), radius 2px
  Label:                mono / label-sm / textMuted

RESPONSIVE:
  Mobile:               simplify to 4-5 data points, hide grid, enlarge touch targets
  Tablet:               standard density
  Desktop:              full density with hover tooltips
```

### Specific Chart Instances

```
"Generation Over Time" (CourseAnalytics):
  Type: area line chart
  Line: navyDeep, 2px stroke
  Area: navyDeep/6% fill
  X-axis: months (mono/label-sm)
  Y-axis: question count (mono/label-sm)

"Topics with Most Questions" (CourseAnalytics):
  Type: horizontal bar chart
  Bars: navyDeep fill, radius 3px on right end
  Labels: sans/body-xs left of bars
  Values: mono/label-md right of bars

"Difficulty Distribution" (CourseAnalytics):
  Type: donut chart (like progress ring, but segmented)
  Slices: navyDeep (Hard), blueMid (Medium), blueLight (Easy)
  Center: serif/heading-lg total count

"Activity Calendar" (PersonalDashboard):
  Type: GitHub-style heatmap grid
  Cells: 12px squares, 2px gap, radius 2px
  Colors: heatmap scale (borderLight → bluePale → blueMid → navyDeep)
  Labels: mono/label-sm day/month headers
```

---

## 3.5 INTERACTION STATES

Every interactive element has ALL of these:

```
STATE          VISUAL TREATMENT
────────────────────────────────────────────────────────────────────
Default        Token-defined rest state (no shadow, border only)
Hover          Border → blueMid, shadow appears, bg shift (desktop only)
Active/Press   Scale 0.98, bg darkens (navyDeep → navy)
Focus          Border → blueMid, shadow: focus token (3px ring)
Disabled       Opacity 0.5 OR warmGray bg + textMuted color
Loading        Spinner replaces text (buttons), skeleton pulse (cards)
Success        Green ◆ icon, green/10% bg flash
Error          Danger border, danger helper text, shake animation
Selected       Parchment bg + 3px navyDeep left border (rows)
```

### Specific Interaction Patterns

**Hover Reveal (cards):** borderLight → blueMid border, shadow-lifted, desc text swaps to detail text. Transition: medium. Mobile: no hover, show description.

**Scroll Reveal (landing only):** opacity 0 + translateY(16px) → 1 + 0. IntersectionObserver 10-12%. Transition: reveal (500ms) + stagger 0.06-0.1s.

**Page Load Stagger (dashboards):** opacity 0 + translateY(8px) → 1 + 0. Duration 0.45s ease + delay (0.05s → 0.24s). KPI first, then left column, then right column.

**Row Hover:** white → parchment, transition-fast (150ms).

**Sidebar Toggle (mobile):** translateX(-width) → 0 + overlay (navyDeep/12% + blur 2px), transition-medium.

### Loading States

```
buttons:     text → CSS spinner (18px, 2px border, white on primary)
cards:       skeleton atoms (parchment fill, warmGray pulse)
tables:      5 skeleton rows of parchment bars
full-page:   centered spinner + "Loading..." in mono/label-md
```

### Empty States

```
container:   centered within parent
icon:        serif symbol (◈ or ◇) at 48px, in navyDeep/10% circle (80px)
heading:     serif/heading-lg/navyDeep
description: sans/body-sm/textSecondary
CTA:         primary button below
```

---

## 3.6 MODALS & OVERLAYS

```
Backdrop:    navyDeep at 12% opacity + backdrop-filter: blur(2px)
Panel:       white bg, radius 2xl (12px), shadow: panel
Max-widths:  400px (auth), 500px (processing), 600px (forms), 800px (detail), 900px (comparison)
Header:      serif heading + close button (ghost, top-right)
Footer:      borderLight top border, right-aligned buttons
Animation:   fade in 200ms + scale from 0.95
```

### Toasts

```
Position:    top-right, 20px from edges
Container:   white bg, borderLight border, shadow: card-hover, radius lg
Left accent: 3px left border in semantic color (green/danger/warning/blueLight)
Dismiss:     ghost X, auto-dismiss 5s
Animation:   slide in from right, 300ms
```

### Progress Bars

```
Track:   borderLight bg, 6px height, full radius
Fill:    green (normal), blueMid (in-progress), navyDeep (primary)
Label:   mono/label-sm, textMuted
```

# PART 4: PAGE TEMPLATES

All 78 screens use one of five templates. Every template specifies its surface color, sidebar behavior, and bookmark placement. Choosing the correct template is the first decision for any screen.

---

## 4.1 TEMPLATE A: DASHBOARD SHELL (52 screens)

```
┌──────────┬────────────────────────────────────────────────────┐
│          │  TOP BAR                                            │
│  SIDE    │  white bg, frosted glass (white/F2 + blur 12px),   │
│  BAR     │  1px borderLight bottom, sticky, z-index 50        │
│          ├────────────────────────────────────────────────────┤
│  white   │                                                    │
│  bg      │  CONTENT AREA — cream (#f5f3ef) bg                 │
│  240px   │  padding: 28px 32px desktop / 24px 24px tablet     │
│  fixed   │  / 20px 16px mobile                                │
│  border  │  max-width: 1200px (left-aligned from sidebar)     │
│  Right:  │                                                    │
│  1px     │    ┌─ Card ──────────┐  ┌─ Card ─────────────┐   │
│  border  │    │ white bg         │  │ white bg            │   │
│  Light   │    │ 1px borderLight  │  │ table: header =     │   │
│          │    │ nested =         │  │ parchment, rows     │   │
│          │    │ parchment        │  │ hover = parchment   │   │
│          │    └──────────────────┘  └─────────────────────┘   │
│          │                                                    │
│          │    ┌─ BOOKMARK (KPI Strip) ──────────────────────┐ │
│          │    │ navyDeep bg, woven texture, frosted cards    │ │
│          │    │ ONE per page — anchors the eye               │ │
│          │    │ border-radius: 12px (inside content padding) │ │
│          │    └─────────────────────────────────────────────┘ │
└──────────┴────────────────────────────────────────────────────┘
```

---

## 4.2 TEMPLATE B: ADMIN SHELL (12 screens)

Identical to Template A but:
- Admin-specific sidebar nav: Setup, Frameworks, Faculty, Knowledge Graph, ILOs, Compliance, Data Integrity
- Active item: `greenDark` left border instead of parchment bg (distinguishes admin from faculty at a glance)

---

## 4.3 TEMPLATE C: SPLIT PANEL (9 auth screens)

```
┌─────────────────────────┬──────────────────────────────────┐
│                         │                                  │
│   BRAND PANEL           │       FORM PANEL                 │
│   white bg              │       cream bg                   │
│   WovenField texture    │       centered content           │
│   flex: 0 0 480px       │       flex: 1                    │
│                         │       max-width: 400px form      │
│   Logo (md)             │                                  │
│   Ascending squares     │       Form card (white bg,       │
│   Headline (serif)      │       panel shadow, radius 2xl)  │
│   Subtitle (sans)       │       OR direct form elements    │
│                         │                                  │
│   Pillar grid (bottom)  │                                  │
│   ThreadDivider         │                                  │
│   Institution name      │                                  │
│                         │                                  │
│   1px borderLight right │                                  │
└─────────────────────────┴──────────────────────────────────┘

tablet:  left panel → 340px
mobile:  stacks vertically, brand panel compact (no pillar grid), logo moves to form header
```

---

## 4.4 TEMPLATE D: FULL-WIDTH FLOW (5 screens)

```
No sidebar. Optional minimal top bar (logo + back link only).
Centered content, max-width varies (600-800px forms, 1120px reviews).
Background: white or gradient (white → cream → parchment).
Can use section rhythm (white/cream/inverted alternation).
Used for: Landing, onboarding flows, CourseReady celebration.
```

---

## 4.5 TEMPLATE E: FOCUS MODE (11 screens)

```
┌──────────┬──────────────────────────────┬─────────────────┐
│          │                              │                 │
│  SIDE    │  PRIMARY PANEL               │  CONTEXT PANEL  │
│  BAR     │  white bg, full height       │  parchment bg   │
│  (thin)  │  question content, editor,   │  metadata, chat │
│          │  graph visualization         │  history, notes │
│          │                              │  300-360px      │
│          │                              │                 │
└──────────┴──────────────────────────────┴─────────────────┘

Primary panel: white bg — maximum contrast for reading.
Context panel: parchment bg — secondary information.
Mobile: context panel → bottom drawer or tab.
Tablet: context panel → slide-in sheet from right.
Desktop: full three-column.
```

**The One Rule on split surfaces:** Focus Mode creates two adjacent panels with different backgrounds. The One Rule applies independently to each:

```
PRIMARY PANEL (white bg):
  Cards/sections → elevated (parchment) bg
  Inputs inside parchment cards → white bg (parchment parent → white child)
  Table headers → parchment
  The question display itself is not in a card — it's directly on white,
    so option rows, explanation panels etc. use parchment bg for grouping

CONTEXT PANEL (parchment bg):
  Cards/sections → white bg (default variant)
  Inputs inside white cards → parchment bg (white parent → parchment child)
  Action buttons panel → white card
  Chat bubbles:
    AI messages → white bg (contrasts parchment parent)
    User messages → navyDeep bg (inverted, always)
  Navigation controls → white bg card
```

Each panel is its own independent surface context. A developer never needs to think about the other panel — just ask "what is my parent surface?" and The One Rule answers.

---

# PART 5: ALL 78 SCREENS

## 5.1 SCREEN-TO-TEMPLATE MAPPING

```
A. PUBLIC & AUTH (9 screens)
──────────────────────────────────────────────────────────────
Landing.tsx               Template D (Full-Width)    Bookmark: stats bar
Login.tsx                 Template C (Split Panel)   Bookmark: none
RoleSelection.tsx         Template C (Split Panel)   Bookmark: none
Registration.tsx          Template C (Split Panel)   Bookmark: none
StudentRegistration.tsx   Template C (Split Panel)   Bookmark: none
FacultyRegistration.tsx   Template C (Split Panel)   Bookmark: none
AdminRegistration.tsx     Template C (Split Panel)   Bookmark: none
ForgotPassword.tsx        Template C (Split Panel)   Bookmark: none
EmailVerification.tsx     Template C (Split Panel)   Bookmark: none

B. ONBOARDING (4 screens)
──────────────────────────────────────────────────────────────
Onboarding.tsx            Template D (Full-Width)    Bookmark: none
StudentOnboarding.tsx     Template D (Full-Width)    Bookmark: none
FacultyOnboarding.tsx     Template D (Full-Width)    Bookmark: none
AdminOnboarding.tsx       Template D (Full-Width)    Bookmark: none

C. DASHBOARDS (3 screens)
──────────────────────────────────────────────────────────────
Dashboard.tsx             Template A (Shell)         Bookmark: — (router)
FacultyDashboard.tsx      Template A (Shell)         Bookmark: KPI strip
StudentDashboard.tsx      Template A (Shell)         Bookmark: progress strip

D. STUDENT LEARNING (5 screens)
──────────────────────────────────────────────────────────────
StudentPractice.tsx       Template A (Shell)         Bookmark: none
StudentQuestionView.tsx   Template E (Focus)         Bookmark: none
StudentResults.tsx        Template A (Shell)         Bookmark: score strip
StudentProgress.tsx       Template A (Shell)         Bookmark: streak bar
StudentAnalytics.tsx      Template A (Shell)         Bookmark: KPI strip

E. COURSE MANAGEMENT (14 screens)
──────────────────────────────────────────────────────────────
AllCourses.tsx            Template A (Shell)         Bookmark: none
CreateCourse.tsx          Template A (Shell)         Bookmark: none
UploadSyllabus.tsx        Template A (Shell)         Bookmark: none
SyllabusProcessing.tsx    Template A (Shell)         Bookmark: progress bar
SyllabusEditor.tsx        Template E (Focus)         Bookmark: none
ReviewSyllabusMapping.tsx Template E (Focus)         Bookmark: none
CourseDashboard.tsx       Template A (Shell)         Bookmark: course KPIs
CourseReady.tsx           Template D (Full-Width)    Bookmark: celebration
WeekView.tsx              Template A (Shell)         Bookmark: none
WeekMaterialsUpload.tsx   Template A (Shell)         Bookmark: none
LectureUpload.tsx         Template A (Shell)         Bookmark: none
LectureProcessing.tsx     Template A (Shell)         Bookmark: progress bar
SubConceptReviewQueue.tsx Template A (Shell)         Bookmark: none
OutcomeMapping.tsx        Template E (Focus)         Bookmark: none

F. QUESTION GENERATION (7 screens)
──────────────────────────────────────────────────────────────
GenerationSpecWizard.tsx  Template A (Shell)         Bookmark: step bar
GenQuestionsSyllabus.tsx  Template A (Shell)         Bookmark: none
GenQuestionsTopic.tsx     Template A (Shell)         Bookmark: none
GenerateTest.tsx          Template A (Shell)         Bookmark: blueprint strip
GenerateQuiz.tsx          Template A (Shell)         Bookmark: none
GenerateHandout.tsx       Template A (Shell)         Bookmark: none
BatchProgress.tsx         Template A (Shell)         Bookmark: progress strip

G. QUESTION REVIEW (7 screens)
──────────────────────────────────────────────────────────────
QuestionReviewList.tsx    Template A (Shell)         Bookmark: none
FacultyReviewQueue.tsx    Template A (Shell)         Bookmark: queue count strip
ItemDetail.tsx            Template E (Focus)         Bookmark: none
QuestionDetailView.tsx    Template E (Focus)         Bookmark: none
AIRefinement.tsx          Template E (Focus)         Bookmark: none
ConversationalRefine.tsx  Template E (Focus)         Bookmark: none
QuestionHistory.tsx       Template A (Shell)         Bookmark: none

H. REPOSITORY (2 screens)
──────────────────────────────────────────────────────────────
Repository.tsx            Template A (Shell)         Bookmark: repo stats strip
ItemBankBrowser.tsx       Template A (Shell)         Bookmark: none

I. EXAM MANAGEMENT (3 screens)
──────────────────────────────────────────────────────────────
ExamAssembly.tsx          Template E (Focus)         Bookmark: blueprint strip
ExamAssignment.tsx        Template A (Shell)         Bookmark: none
RetiredExamUpload.tsx     Template A (Shell)         Bookmark: none

J. UPLOADS & OPS (2 screens)
──────────────────────────────────────────────────────────────
FacultyQuestionUpload.tsx Template A (Shell)         Bookmark: none
BulkOperations.tsx        Template A (Shell)         Bookmark: queue count strip

K. ANALYTICS (4 screens)
──────────────────────────────────────────────────────────────
Analytics.tsx             Template A (Shell)         Bookmark: KPI strip
CourseAnalytics.tsx       Template A (Shell)         Bookmark: course KPI strip
PersonalDashboard.tsx     Template A (Shell)         Bookmark: teaching KPI strip
BlueprintCoverage.tsx     Template A (Shell)         Bookmark: coverage % strip

L. ADMIN BACKEND (12 screens)
──────────────────────────────────────────────────────────────
AdminDashboard.tsx        Template B (Admin)         Bookmark: system KPI strip
SetupWizard.tsx           Template B (Admin)         Bookmark: step bar
FrameworkManagement.tsx   Template B (Admin)         Bookmark: none
FacultyManagement.tsx     Template B (Admin)         Bookmark: none
KnowledgeBrowser.tsx      Template E (Focus)*        Bookmark: none
SubConceptDetail.tsx      Template E (Focus)*        Bookmark: none
ILOManagement.tsx         Template B (Admin)         Bookmark: none
DataIntegrityDash.tsx     Template B (Admin)         Bookmark: health strip
FULFILLSReviewQueue.tsx   Template B (Admin)         Bookmark: none
LCMEComplianceHeatmap.tsx Template B (Admin)         Bookmark: compliance % strip
LCMEElementDrillDown.tsx  Template B (Admin)         Bookmark: none

* Focus template nested inside admin shell (sidebar stays, content switches)

M. SETTINGS & SUPPORT (6 screens)
──────────────────────────────────────────────────────────────
Profile.tsx               Template A (Shell)         Bookmark: none
Settings.tsx              Template A (Shell)         Bookmark: none
Notifications.tsx         Template A (Shell)         Bookmark: none
Help.tsx                  Template A (Shell)         Bookmark: none
Collaborators.tsx         Template A (Shell)         Bookmark: none
QuestionTemplates.tsx     Template A (Shell)         Bookmark: none

N. ERROR (1 screen)
──────────────────────────────────────────────────────────────
NotFound.tsx              Template D (Full-Width)    Bookmark: none
```

---

## 5.2 DETAILED SCREEN SPECIFICATIONS

### AUTH SCREENS (Template C: Split Panel)

#### Login

LEFT PANEL (white bg, 480px desktop):
- WovenField texture (navyDeep, opacity 0.02)
- Logo wordmark (size lg, 30px)
- Ascending squares (4 squares, 14px, education pillar colors)
- Headline: "Every thread of your curriculum, woven together" (serif/display-sm/navyDeep)
- Subtitle: "AI-powered competency-based medical education" (sans/body-sm/textSecondary)
- Pillar grid at bottom: 2×2 grid of 8px squares with label-xs labels (Curriculum, Assessment, Measurement, Compliance)
- Thread divider SVG
- "Morehouse School of Medicine" (mono/label-md/textMuted/uppercase)

RIGHT PANEL (cream bg):
- Centered form (max-width 400px)
- "Welcome back" (serif/heading-lg/navyDeep, centered)
- "Sign in to your account" (sans/caption/textMuted, centered)
- Role tab strip: 4-segment [Faculty | Admin | Advisor | Student]
  Track: parchment bg, borderLight border, radius 8px. Active: white bg + subtle shadow
- Email labeled input (mono label "EMAIL" + parchment input)
- Password labeled input + eye toggle SVG
- Row: checkbox "Remember me" (left) + "Forgot password?" link (blueMid, right)
- Primary button full-width (navyDeep → blue hover). Loading: spinner replaces text. Disabled: warmGray until email + role selected
- OR divider: borderLight lines + "OR" (mono/label-sm/textMuted)
- Google SSO button: white bg, 1px border, Google "G" SVG. Hover: blueMid border + lift
- Footer: lock icon + "Protected by Journey OS" (mono/label-sm/textMuted)
- "Don't have an account? Join the waitlist →" link
- Staggered fade-in: 0.1s delay per element

#### Forgot Password

Same left panel. Right panel:
- Back arrow (ghost, top-left)
- "Reset your password" (serif/heading-lg)
- "Enter your email and we'll send a reset link" (sans/body-sm/textSecondary)
- Email labeled input
- "Send Reset Link" primary (full-width)
- "Back to Sign In" link (blueMid)

#### Email Verification

Same left panel. Right panel centered:
- ◈ icon (32px, in navyDeep/10% circle, 64px diameter)
- "Check your email" (serif/heading-lg)
- "We've sent a verification link to you@msm.edu" (sans/body-sm/textSecondary)
- "Resend email" secondary button
- "Back to Sign In" link

---

### FACULTY DASHBOARD (Template A: Shell)

TOP BAR (sticky, frosted glass):
- Left: hamburger (mobile) + "Dashboard" (serif/heading-lg/navyDeep) + "MONDAY, FEBRUARY 16, 2026" (mono/label-md/textMuted)
- Right: search input (parchment, borderLight, 220px) + notification bell (danger dot) + avatar

CONTENT AREA (cream bg):

**BOOKMARK — KPI Strip** (navyDeep, radius 12px, WovenField white):
- Top row: ascending squares + "FACULTY OVERVIEW" (mono/label-sm/bluePale/0.7) + "Generate Items" ghost button
- Greeting: "Good afternoon, Dr. Adeyemi" (serif/display-sm/white)
- Summary: "3 courses active · 2 items need review · coverage on track" (sans/body-xs/bluePale/0.8)
- KPI grid (4-col desktop, 2×2 mobile): Questions Generated (342), Avg Item Quality (0.84), Coverage Score (91%), Active Students (127)
  Each: frosted glass stat card with label (mono/label-sm/bluePale/0.6), value (serif/28px/white), context (sans/11px/bluePale/0.65), sparkline (bluePale)

**MAIN GRID** (`gridTemplateColumns: 1fr 360px` desktop, `1fr` mobile, gap 20px):

LEFT COLUMN:

*Active Courses* (white card, borderLight, radius 12px):
- SectionMarker ● MY COURSES (navyDeep dot)
- Title "Active Courses" (serif/heading-lg) + "View all →" link
- Course rows separated by borderLight:
  4px color bar (course color, left edge) + name (sans/heading-sm) + metadata (mono code + counts) + coverage ring (40px donut)
  Hover: parchment bg (fast). Draft courses: "DRAFT" warning badge

*Cohort Mastery* (white card):
- SectionMarker ● COHORT MASTERY (green dot)
- Title "PHAR 501 — Topic Mastery"
- Legend: 4 color squares with mono labels (>70%, 40-70%, 15-40%, <15%)
- Heatmap: 6-col desktop, 4-col mobile. Each cell = mastery-cell molecule
- Summary bar: parchment bg, radius 8px, "3 topics below threshold" + "View details →"

RIGHT COLUMN:

*Quick Actions* (white card):
- SectionMarker ● QUICK ACTIONS (blueMid dot)
- 2×2 grid: parchment bg buttons, borderLight, radius 8px, hover → blueMid border + shadow
  Generate Items (◆), Create Exam (◇), Map Curriculum (◈), View Reports (▣)

*Upcoming Tasks* (white card):
- SectionMarker ● UPCOMING TASKS (navyDeep dot)
- Task rows: parchment bg, priority dot (danger/warning/borderLight), title (sans/caption/500), due date (danger red + 600 weight if "Today")

*Recent Activity* (white card):
- SectionMarker ● RECENT ACTIVITY (greenDark dot)
- Items with borderLight dividers: 28px tinted icon square + sans/caption text + mono/label-sm timestamp

**Page load stagger:** KPI 0.05s → courses 0.10s → actions 0.12s → mastery 0.18s → tasks 0.18s → activity 0.24s. Each: opacity 0→1, translateY 8px→0, 0.45s ease.

---

### COURSE MANAGEMENT SCREENS

#### Create Course (Template A)

Centered (max-width 640px) on cream. Step indicator: ascending squares (1 of 3 filled).
SectionMarker ● NEW COURSE. Title "Create New Course" (serif/display-sm).
White card (radius 12px, padding 24px): labeled inputs (Course Name, Code, Semester select, Year Level select, Description textarea). All parchment bg, mono labels. Footer: "Cancel" secondary + "Continue" primary.

#### Upload Syllabus (Template A)

Centered (max-width 700px). Step 2 of 3.
White card with upload zone: parchment bg, 2px dashed warmGray border, radius 12px, 40px padding. ◈ icon (32px), "Drag and drop" (sans/heading-md), "or click to browse" (blueMid link), formats (mono/label-sm). On file: filename + progress bar (green fill). Alternative: "Or paste syllabus text" textarea. Footer: "Back" + "Process Syllabus" (disabled until file).

#### Syllabus Processing (Modal on Template A)

500px modal, white bg, panel shadow, radius 12px. ◈ pulse animation. "Processing Your Syllabus" (serif/heading-lg). Progress bar (6px, green fill). Status updates: "Extracting text..." (20%) → "Identifying structure..." (50%) → "Mapping to frameworks..." (80%) → "Complete!" (100%). On complete: green checkmark + "Review Mapping" button.

#### Review Syllabus Mapping (Template E: Focus)

Primary panel (white): SectionMarker ● COURSE STRUCTURE. Weekly structure table with parchment header. Week badges (navyDeep/8%), topics (secondary badges), blueprint tags (green >80%, warning 60-80%, danger <60%). Expandable rows.
Context panel (parchment, 300px): confidence legend, summary stats, coverage mini-heatmap, "Complete Setup" button.

#### Course Dashboard (Template A)

Breadcrumb (mono). Title: course name (serif/display-sm) + code badge. Actions: "Generate Questions" primary + "Edit" + "Upload Syllabus" secondary.
**BOOKMARK** — Course KPI strip (navyDeep, 12px radius): Total Questions, Blueprint Coverage (% + ring), Avg Quality.
Weekly Timeline (horizontal scroll): white cards on cream, radius xl, week badge + title + tags + progress bar + coverage dot + "Generate" ghost on hover.
Blueprint Coverage Heatmap (white card): SectionMarker ● BLUEPRINT COVERAGE (green dot). Grid: systems × categories. Cell intensity: borderLight (0) → bluePale (1-3) → blueMid (4-7) → navyDeep (8+). Hover: tooltip. Click: filter.

---

### QUESTION GENERATION SCREENS

#### Generation Config — Syllabus-Driven (Template A)

Centered (max-width 800px). Breadcrumb to week. Title "Generate Questions for Week 3" (serif). Subtitle: topic (sans/textSecondary).
White card — Context: "Topics covered" (mono label) + bullets + "Blueprint sections" (mono) + tags.
White card — Config: "Number of Questions" slider (1-20, navyDeep track) + number input. "Difficulty Level" radios (Easy/Medium/Hard/Mixed). "Question Type" radios with icons (◇ SBA, ◈ Clinical Vignette). "Focus Areas" textarea (optional). "Advanced Options" collapsible: Bloom's checkboxes, image toggle.
Estimate card (parchment inside white): "~2-3 min" + "5 questions."
Footer: "Cancel" + "Generate Questions" primary (lg).

#### Generation Config — Topic-Based (Template A)

Two-column (60/40). Left white card: blueprint browser tree with checkboxes, search input, selected topics as removable tags. Right white card: same config options + "Generate" button.

#### Generation Progress (Modal)

500px modal, not dismissible. ◈ pulse. "Generating Questions" (serif/heading-lg). Progress bar (navyDeep fill → green on complete). Status: "Extracting context..." → "Generating 1 of 5..." → "Fact-checking..." → "Checking duplicates..." → "Complete!" On complete: green ◆, "5 questions generated", "Review Questions" primary + "Generate More" link.

---

### QUESTION REVIEW SCREENS

#### Review List (Template A)

Title "Review Questions" (serif). Filter tabs: All | Pending | Approved | Rejected. Actions: "Bulk Approve" + "Export" + "Generate More".
White question cards stacked on cream (padding 20px, borderLight, radius xl): status badge + checkbox, stem (serif/body-md, 2-line clamp), difficulty + blueprint badges, quality score + fact-check icon (◆/✕) + duplicate warning + date (mono/label-sm). Actions: "Review" primary (sm) + three-dot menu. Hover: blueMid border + shadow. Pagination: parchment footer, mono pages.

#### Question Detail (Template E: Focus)

PRIMARY (white): breadcrumb, quality bar (parchment strip: fact-check ◆ "Verified" | difficulty badge | Bloom's badge | quality score). Duplicate warning if any (parchment card, warning left border). Question display: "STEM" (mono label), text (serif/body-lg, 18px, 1.8 line-height), "OPTIONS" (mono label), A-E rows (correct: 3px green left border + green/10% bg; others: borderLight), "EXPLANATION" (mono label), explanation (sans/body-sm), citations (mono superscript). Collapsible: sources, metadata.
CONTEXT (parchment, 300px): navigation "1 of 5" + prev/next, actions: "Approve" (green bg), "Reject" (destructive outlined), "Edit" (secondary), "Refine with AI" (navyDeep primary). Version history.

#### Duplicate Comparison (Modal, 900px)

"Similar Question Found" (serif). "87%" with warning progress bar. Side-by-side: two parchment cards (on modal white bg — The One Rule). Matching text: bluePale highlight. Decision radios: keep both / replace / discard. Notes textarea. "Cancel" + "Confirm" buttons.

#### Manual Edit Mode (Template E: Focus)

Same as detail but editable: stem → parchment textarea + formatting toolbar. Options → parchment inputs + drag handles. Explanation → parchment textarea. Character counts (mono). Inline save/cancel per section. Warning banner: parchment bg, warning left border, "Changes trigger re-fact-check." Bottom sticky: "Save All Changes."

#### AI Refinement — Conversational (Template E: Focus)

PRIMARY (white) — Question Preview: "Question Preview" (serif) + version badge (mono "v2"). Tabs: Current | Original. Question with diff: added (green/10% bg), removed (danger/10% + strikethrough), modified (bluePale bg). Bottom sticky: "Accept Changes" (green primary) + "Revert" ghost.
CONTEXT (parchment, 60%) — Chat: "AI Refinement Assistant" (serif/heading-md) + close. Chat area: welcome card (white bg, per The One Rule on parchment parent) with suggestion chips ("Make harder" / "Better explanation" / "Improve distractors" / "More concise"). User messages: navyDeep bubble, white text, right. AI messages: white bubble, borderLight, left. Avatars: 28px squares. Typing: three parchment dots pulsing. Input: white textarea (contrasts parchment parent), auto-expand, navyDeep send button, "Shift+Enter" hint (mono/label-sm).
Mobile: "Preview" and "Chat" tabs + floating "Accept" button.

#### Refinement Confirmation (Small modal)

Green ◆ (32px). "Question Updated Successfully" (serif/heading-lg). "Created version 3" (mono/label-sm). Buttons: "Approve Question" primary + "Continue Refining" secondary + "Return to List" link.

---

### REPOSITORY SCREENS

#### Repository Main (Template A)

Title "Question Repository" (serif/display-md). Subtitle "Browse and search 2,347 approved questions" (sans/body-sm/textSecondary).
**BOOKMARK** — Repo Stats strip (navyDeep, 12px radius): Total Items, Avg Quality, Blueprint Coverage %, Faculty Contributors.
Toolbar (white card): search input (parchment, large) + filter badge + view toggle (grid/list) + sort dropdown + export.
Filter sidebar (white card, 280px): collapsible accordions — USMLE Topics (tree + checkboxes), Difficulty (checkboxes + counts), Creator (searchable dropdown), Course (multi-select), Tags (cloud), Date Range (inputs), Quality Score (range slider, navyDeep track). Active filters: removable badges.
Grid view (3-col): white cards on cream. Each: checkbox + stem (serif, 3-line clamp) + badges + creator avatar + date + usage count. Hover: blueMid border + shadow.
List view: data table in white card. Parchment header, hover rows.
Empty state: ◈ in circle + "No questions found" + "Clear Filters."

#### Question Detail Modal (800px)

Close (ghost). "#Q-1234" (mono) + status badge + bookmark icon. Question display. Tabs: Details (creator, tags, quality) | Usage Statistics (times used, avg performance, calibration chart) | Version History (timeline). Footer: "Use in Exam" primary + "Copy" + "Edit" (if owner) + "Report Issue" link.

#### Bulk Export Modal (600px)

"Export Questions." Count: "12 selected." Format radios: CSV, JSON, QTI. Include checkboxes: metadata, statistics, citations, history. Preview section. "Cancel" + "Download Export" primary.

---

### ANALYTICS SCREENS

#### Course Analytics (Template A)

Breadcrumb + title. Date range: "This Semester" | "Last 30 Days" | "All Time" | "Custom."
**BOOKMARK** — Course KPI strip: Total Questions, Approval Rate, Avg Quality, Questions/Week, Difficulty Distribution, Blueprint Coverage.
Charts (white cards on cream): "Generation Over Time" line chart (blueMid line, parchment area fill). "Topics with Most Questions" horizontal bar (navyDeep). "Faculty Contributions" bar. Blueprint coverage detail table: system | topics total | covered % | count | gaps (danger). "Generate for Missing Topics" ghost per gap.

#### Blueprint Coverage Visualization (Template A)

Title "USMLE Step 1 Blueprint Coverage" (serif). Toggle: "My Questions" | "This Course" | "Institution-Wide."
**BOOKMARK** — Coverage strip: overall % (serif/display-lg/white) + delta.
Heatmap (white card): rows = systems, cols = categories. Intensity: borderLight (0) → bluePale (1-3) → blueMid (4-7) → navyDeep (8+). Hover: tooltip. Click: navigate. Legend: mono labels. Gaps sidebar (parchment, right): uncovered topics + "Generate" ghost per item.

#### Personal Dashboard (Template A)

**BOOKMARK** — Teaching KPI strip: Generated, Approved, "Estimated 12 hours saved," Contributions.
White cards: recent questions (10, with status/date/course/actions). Activity calendar heatmap (GitHub-style: borderLight → bluePale → blueMid → navyDeep).

---

### ADMIN SCREENS (Template B)

#### Admin Dashboard

**BOOKMARK** — System KPI strip: System Health, Active Users, Coverage %, Data Integrity Score.
Cards: faculty table, recent operations, compliance summary.

#### Knowledge Browser (Template E nested in Admin Shell)

Primary panel: D3/force-directed graph visualization of knowledge graph nodes. Pan/zoom. Click to select.
Context panel: selected node details, relationships, FULFILLS mappings.

---

### SETTINGS & SUPPORT (Template A)

#### Settings

Two-column: left nav (white card, 240px: Profile, Preferences, Notifications, Security, Institution — active: parchment bg) + right content (white card, fluid).
Profile: navyDeep square avatar (64px) + labeled inputs (Name, Email read-only cream bg, Title, Department, Bio textarea) + "Save Changes."
Preferences: generation defaults, display settings. Notifications: toggle switches (navyDeep track). Security: password form, 2FA toggle, sessions list.

#### Help & Support

Search bar (large, white bg — directly on cream per The One Rule, borderLight border, centered). Quick links grid (3-col): white cards with serif icons + titles. Popular articles (white card). Contact: email + response time (mono).

#### 404 Not Found (Template D)

Centered on cream: logo (lg), ◈ at 48px in navyDeep/10% circle (80px), "Page not found" (serif/display-sm), description (sans/body-sm/textSecondary), "Return to Dashboard" primary.

---

# PART 6: RESPONSIVE STRATEGY

```
BREAKPOINT   RANGE           SIDEBAR       GRID        PADDING
─────────────────────────────────────────────────────────────────
mobile       < 640px         overlay       1 col       16-20px
tablet       640-1023px      overlay       2 col       24px
desktop      ≥ 1024px        fixed 240px   2-4 col     28-32px
```

Hook: `useBreakpoint()` → `"mobile" | "tablet" | "desktop"`

### Per-template responsive behavior

**Dashboard Shell:** Mobile: no sidebar, hamburger, 1-col. Tablet: overlay sidebar, 2-col. Desktop: fixed sidebar, full grids.

**Split Panel:** Mobile: stacked (brand compact, no pillar grid). Tablet: narrow left (340px). Desktop: full left (480px).

**Focus Mode:** Mobile: context → bottom drawer. Tablet: context → slide-in sheet. Desktop: three-column.

**KPI Strip:** Mobile: 2×2. Desktop: 4-col.

**Data Tables:** Mobile: horizontal scroll, priority columns. Tablet: compact padding. Desktop: all columns.

---

# PART 7: ACCESSIBILITY

- Contrast: 4.5:1 minimum (navy on white = 10.8:1 ✓, ink on cream = 9.2:1 ✓)
- Focus: 3px blueMid ring (shadow-focus token) on all interactive elements
- Keyboard: full tab order, Enter/Space activation, Escape closes modals
- ARIA: labels on icon buttons, roles on custom components, live regions for loading
- Semantic HTML: `<nav>`, `<main>`, `<article>`, `<aside>`, `<header>`, `<footer>`
- Skip nav: visible on focus, jumps to `<main>`
- Forms: mono labels associated via `htmlFor`
- Errors: announced by screen reader, danger border + icon
- Motion: `prefers-reduced-motion` disables stagger, reduces transitions to 0
- Touch: 44px minimum on all targets

---

# PART 8: BRAND INTEGRATION

The MSM "Woven Tapestry" manifests three ways:

1. **Woven Field** — canvas texture on brand panels and inverted sections
2. **Thread Divider** — sinusoidal SVG between sections
3. **Ascending Squares** — 4 squares in pillar colors (Education, Research, Clinical, Community)

**Logo placement:** sidebar top (Shell), top-left brand panel (Split Panel), centered (Full-Width). Always live text + CSS, never image.

**Education Pillar palette** (70/30) governs every screen. No yellows, oranges, purples.

**"Morehouse School of Medicine"** appears in `mono/label-md/uppercase` in sidebar and login brand panel.

**Hero gradient** (landing page and onboarding flows):
```css
background: linear-gradient(170deg, #ffffff 0%, #f5f3ef 40%, #faf9f6 100%);
```
Angled 170° (nearly vertical, slightly tilted left). White at top → cream at middle → parchment at bottom. The angle and warmth create depth without shadow or blur. This gradient is The Three Sheets expressed as a single CSS rule.

**Nav transparency** (both landing page nav and dashboard top bar):
```css
/* Before scroll (or at rest in dashboard) */
background: #ffffff;

/* After scrolling 40px (landing) / always (dashboard) */
background: #ffffffF2;           /* white at 95% opacity */
backdrop-filter: blur(12px);
border-bottom: 1px solid #edeae4; /* borderLight */
transition: all 0.3s ease;
```
The frosted glass lets content color bleed through on scroll, communicating "there's more above" without distraction. The border only appears after scrolling (landing) or is always present (dashboard).

---

# PART 9: FILE STRUCTURE

```
/src
├── /app
│   ├── /components
│   │   ├── /ui                    ← 50 shadcn atoms + section-marker, updated card/badge/skeleton
│   │   ├── /shared                ← 10 extracted molecules:
│   │   │   stat-card, hover-reveal-card, progress-ring, sparkline,
│   │   │   mastery-cell, ascending-squares, woven-field,
│   │   │   thread-divider, logo-wordmark, labeled-input
│   │   ├── /organisms             ← 12 extracted organisms:
│   │   │   kpi-strip, course-row, activity-feed, task-list,
│   │   │   mastery-heatmap, quick-actions, question-card,
│   │   │   coverage-chain, persona-tabs, step-through,
│   │   │   waitlist-form, login-form
│   │   └── /layout
│   │       ├── DashboardLayout.tsx      ← Template A
│   │       ├── AdminLayout.tsx          ← Template B
│   │       ├── SplitPanelLayout.tsx     ← Template C
│   │       ├── FullWidthLayout.tsx      ← Template D
│   │       ├── FocusModeLayout.tsx      ← Template E
│   │       ├── TopNavigation.tsx
│   │       └── AdminSidebar.tsx
│   ├── /pages                     ← 78 screens
│   └── /hooks
│       ├── useBreakpoint.ts
│       ├── useScrollY.ts
│       └── useIntersectionReveal.ts
└── /styles
    ├── theme.css                  ← all tokens
    ├── tailwind.css
    ├── fonts.css
    └── animations.css             ← keyframes: spin, pulse, reveal
```

---

# PART 10: DECISION CHECKLIST

Before building or modifying any screen, answer:

```
□  Which template?           → A (shell), B (admin), C (split), D (full-width), E (focus)
□  Content area surface?     → cream (shell), cream (split right), white (focus primary),
                                parchment (focus context)
□  Card variant?             → white (on cream) or elevated/parchment (on white)
□  Input backgrounds?        → contrast parent: parchment inside white cards,
                                white inside parchment panels
□  Does it get a bookmark?   → one inverted navyDeep strip per page, or none
                              (navy accents inside cards are separate — always allowed)
□  Section marker?           → dot + mono label on every card header
□  Title hierarchy?          → serif for page/card titles, sans for everything else
□  Label treatment?          → mono, uppercase, letterSpacing 0.08-0.1em, always
□  If Focus Mode: which      → each panel is an independent surface context;
   panel holds what?           The One Rule applies to each panel separately
□  Responsive?               → define for mobile, tablet, desktop
□  Loading state?            → skeleton (parchment pulse) for cards, spinner for buttons
□  Hover treatment?          → border blueMid + shadow on cards, parchment bg on rows
```

---

# PART 11: MIGRATION PLAN

### Phase 1: Tokens (1 day)
Update `theme.css` with all CSS variables. Add tailwind config extensions. No visual changes.

### Phase 2: Card variant prop (1 day)
Update `card.tsx` to accept `variant="default" | "elevated" | "inverted"`. Update all usages.

### Phase 3: Extract molecules (2 days)
Pull StatCard, ProgressRing, Sparkline, MasteryCell, WovenField, AscendingSquares, SectionMarker into `/components/shared/`. Replace all inline usages.

### Phase 4: Extract templates (1 day)
Create SplitPanelLayout, FullWidthLayout, FocusModeLayout. Update 9 auth + 5 focus screens.

### Phase 5: Extract organisms (2 days)
Pull KPIStrip, ActivityFeed, TaskList, CourseRow, MasteryHeatmap, QuickActions into `/components/organisms/`.

### Phase 6: Interaction patterns (1 day)
Standardize hover states, focus rings, transitions, loading skeletons across all 78 screens.

### Phase 7: Responsive audit (2 days)
Verify every screen at all three breakpoints against per-template rules.

**Total: ~10 working days to systematize all 78 screens.**

---

# PART 12: THE STRATEGIC FRAME

This design system isn't just a component library — it's the visual substrate for a knowledge graph operating system. Every design decision reinforces the "woven tapestry" metaphor:

- Individual threads (curriculum, assessment, measurement, compliance) gain strength when woven together
- The atomic design hierarchy mirrors the graph architecture: atoms are nodes, molecules are small subgraphs, organisms are connected systems, templates are schema patterns, pages are instantiated graphs
- The three warm surfaces feel like layers of paper — curriculum documents, assessment blueprints, compliance matrices — stacked on a desk
- The single navy bookmark is the spine of the book holding those pages together, while navy accents woven throughout every card are the thread that makes the whole tapestry feel blue-dominant and branded

The system enables rapid page creation while maintaining brand consistency. Any developer answers the 10-question checklist, selects template/organisms/molecules, follows the surface hierarchy, and produces a screen that belongs to Journey OS without referencing source code or making arbitrary decisions.

Every screen should feel like it belongs — not because they look identical, but because they follow the same rules.
