# Sprint 24: CTA Audit Fixes — UX Design Notes

This sprint is string changes only. No layout, no component creation. Notes below document the before/after copy for each change so QA has a clear reference.

---

## 1. Homepage §01 — Headline

**Before:**
```
The Double Stripping is here.
```

**After:**
```
AI is automating execution. What remains is direction.
```

**Rationale:** "The Double Stripping" is jargon. A visitor without context stops and thinks "what does that mean?" — that question mark costs trust. The replacement is a statement of fact. No prior context needed. (Source: `01-homepage.md` §01.)

---

## 2. Homepage §02 — Section Heading

**Before:**
```
The 40/60 Split
```

**After:**
```
The 40/60 Method
```

**Rationale:** "Method" signals a system. "Split" signals a ratio with no implied discipline. The content plan locks this label. (Source: `01-homepage.md` §02.)

---

## 3. Homepage §02 — Body First Sentence

**Before:**
```
A 90-day high-intensity transformation. We use a 40/60 split: 40% manual understanding...
```

**After:**
```
40% manual understanding. 60% AI-directed execution. Every Studio Ordo engagement — training or client work — runs on this ratio.
```

**Rationale:** "A 90-day high-intensity transformation" is bootcamp marketing language. The replacement front-loads what "40/60" actually means — answering the implicit question mark in the headline before any other copy. (Source: `01-homepage.md` §02 body spec.)

---

## 4. Homepage §02 — CTA Label

**Before:**
```
Hire an Associate →        href="/services/request"
```

**After:**
```
Commission a project →     href="/services/request"
```

**Rationale:** "Hire an Associate" references a non-existent role and sends a hiring signal to a buyer who wants work delivered, not a person placed. "Commission a project" is direct, matches the business model (20% project commission), and is the approved CTA verb per `06-cta-audit.md`. The destination `/services/request` is unchanged.

---

## 5. `/join` Page — Metadata Description

**Before:**
```
Three questions to find your path in Studio Ordo — Apprentice, Journeyman, Maestro Accelerator, Affiliate, or Observer.
```

**After:**
```
What brings you here? Three choices. Immediate routing to the right place.
```

**Rationale:** The old description describes the retired 5-path wizard model. The new one matches the simplified intent: 3 buttons, no questions, immediate routing. (Source: `04-join.md`.)
