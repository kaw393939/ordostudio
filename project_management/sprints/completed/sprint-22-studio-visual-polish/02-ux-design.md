# Sprint 22: Studio Visual Polish UX Design

## 1. Hero Section (Before vs After)

**Before:**
```
[PageShell Header]
Studio
Not a certificate. A portfolio of shipped work.

[Hero Card]
The Studio Apprenticeship
A 12–18 month guided progression...
[Book a Technical Consult] [Get the Context Pack Starter Kit ->]
[Image]
```

**After:**
```
[Hero Card]
The Studio Apprenticeship
A 12–18 month guided progression...
[Book a Technical Consult] [Get the Context Pack Starter Kit ->]
[Image]
```
*Change: Removed redundant PageShell header.*

## 2. Main Content Layout (Before vs After)

**Before:**
```
[Main Content Column]
- The Model (Card)
- The Journey (Collapsible Card)
- Four levels. Clear progression. (No Card)
  - Level 1 (Blue Badge)
  - Level 2 (Gray Badge)
- Eight projects. (Collapsible Card)
- Where the levels map to. (Collapsible Card)
- The Destination (Card)

[Sidebar Column]
- Recommended events (Card)
```

**After:**
```
[Single Column Layout]
- The Model (Card)
- The Journey (Collapsible Card with hover state)
- Four levels. Clear progression. (Card)
  - Level 1 (Gray Badge)
  - Level 2 (Gray Badge)
- Eight projects. (Collapsible Card with hover state)
- Where the levels map to. (Collapsible Card with hover state)
- The Destination (Card)
- Recommended events (Horizontal Section)
```
*Change: Removed sidebar column, moved Recommended events to the bottom, wrapped Four levels in a card, added hover states to collapsibles, unified badge colors.*

## 3. Level Cards Typography (Before vs After)

**Before:**
```
[Number Circle] (type-label)
[Badge] (variant="default" or "outline")
[Description] (type-body-sm)
[Gate projects] (type-meta)
[2] (type-label)
```
*Type roles: 4 (label, body-sm, meta, label)*

**After:**
```
[Number Circle] (type-meta)
[Badge] (variant="secondary")
[Description] (type-body-sm)
[Gate projects] (type-meta)
[2] (type-label)
```
*Type roles: 3 (meta, body-sm, label)*
