# Sprint 27: `/studio` — UX Design

> **Goal:** A buyer visits this page. They are an engineering director at a company building AI-assisted tooling. They have 60 seconds. They need to know: do these people build what I need, and how do I start?

---

## Section 1 — Hero

**Heading:** Commission a project.
**Subhead:** AI-capable engineers. Spec-driven method. Audit-logged deliverables.
**CTA:** Start a project → `/services/request`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Commission a project.                       type-title        │
│                                                                 │
│  AI-capable engineers. Spec-driven method.   type-body         │
│  Audit-logged deliverables.                                     │
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │  Start a project →               │  → /services/request     │
│  └──────────────────────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 2 — What We Build

**Heading:** What We Build

Five items, buyer language (no guild terms, no training language):

1. Line-of-business web applications
2. Internal tooling and workflow automation
3. AI-integrated features for existing products
4. API development and system integrations
5. Codebase audits and spec remediation

```
┌─────────────────────────────────────────────────────────────────┐
│  What We Build                               type-section-title │
│                                                                 │
│  • Line-of-business web applications                           │
│  • Internal tooling and workflow automation                     │
│  • AI-integrated features for existing products                 │
│  • API development and system integrations                      │
│  • Codebase audits and spec remediation                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 3 — Who We Work With

**Heading:** Who We Work With

```
┌─────────────────────────────────────────────────────────────────┐
│  Who We Work With                                               │
│                                                                 │
│  Engineering directors managing teams building AI-assisted      │
│  software. CTOs who need a reliable external build partner.     │
│  Product leads with a spec and a deadline.                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 4 — Proof Point

```
─────────────────────────────────────────────────────────────────

  23 years teaching engineers · 10,000+ trained · spec-driven from day one

─────────────────────────────────────────────────────────────────
```

Centered. `type-meta text-text-muted`. Single line or wraps naturally on mobile.

---

## Section 5 — How We Work

**Heading:** How We Work

Buyer framing: the 40/60 is a delivery assurance, not a guild philosophy lecture.

```
┌─────────────────────────────────────────────────────────────────┐
│  How We Work                                                    │
│                                                                 │
│  We spend 40% of every engagement in spec. That means          │
│  requirements are locked before a line of code is written,      │
│  and deliverables match what was agreed.                        │
│                                                                 │
│  The remaining 60% is build — AI-capable engineers working      │
│  against a living spec document that you can audit at any       │
│  point in the engagement.                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components Removed

| Component / Section | Action |
|---------------------|--------|
| `StudioBottegaModel` | Remove from page render |
| `RecommendedEvents` | Remove from page render |
| "You're not learning to code" section | Delete |
| Bottega/Leonardo/Verrocchio narrative | Delete |
| `"Get the Context Pack Starter Kit →"` | Delete |

No other page changes. `/studio/[slug]` sub-routes are not touched this sprint.
