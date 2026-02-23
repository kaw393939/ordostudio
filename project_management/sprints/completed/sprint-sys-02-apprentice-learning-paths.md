# Sprint SYS-02 — Apprentice Learning Path System

## Goal
Add structured learning paths to the apprenticeship system — levels, gate projects, progress tracking, and Spell Book vocabulary accumulation tied to the apprentice profile.

## Prerequisites
- Sprint IP-01 (Frameworks) — Human Edge, Spell Book definitions
- Sprint IP-04 (Learning Paths) — level definitions and gate projects

## Scope

### Database Changes
New tables/fields:
1. **`apprentice_levels`** — defines the 4 levels (Apprentice, Journeyman, Senior Journeyman, Maestro Candidate) with requirements, Spell Book term count, and Human Edge focus
2. **`gate_projects`** — project definitions with acceptance criteria, rubric, estimated duration, and level requirement
3. **`apprentice_gate_submissions`** — tracks an apprentice's submission for a gate project (status: SUBMITTED, IN_REVIEW, PASSED, REVISION_NEEDED)
4. **`apprentice_vocabulary`** — tracks which Spell Book terms an apprentice has demonstrated mastery of (term_slug, demonstrated_at, context)
5. Add `current_level` field to `apprentice_profiles` table

### API Endpoints
- `GET /api/v1/apprentices/:handle/progress` — returns level, completed gates, vocabulary count, next gate
- `POST /api/v1/apprentices/:handle/gate-submissions` — submit a gate project for review
- `PATCH /api/v1/apprentices/:handle/gate-submissions/:id` — maestro reviews submission (pass/revision)
- `GET /api/v1/apprentices/:handle/vocabulary` — returns accumulated Spell Book terms
- `POST /api/v1/apprentices/:handle/vocabulary` — add demonstrated vocabulary term
- `GET /api/v1/apprentice-levels` — public endpoint listing all levels and requirements

### UI Changes
- **Apprentice profile page** (`/apprentices/[handle]`): show current level, progress bar, gate projects completed, Spell Book count
- **Studio page** (`/studio`): show the 4-level path visually (from IP-04 content)
- **Admin apprentice detail**: gate submission review interface, vocabulary management
- **Apprentice dashboard** (if in `/account`): personal progress view, next gate, vocabulary tracker

### Progress Calculation
- Level advancement: all gate projects at current level PASSED + minimum Spell Book count met
- Level 1→2: 2 gates passed, 15+ terms
- Level 2→3: 2 gates passed, 30+ terms (cumulative)
- Level 3→4: 2 gates passed, 45+ terms (cumulative)
- Maestro status: Level 4 gates passed, 60+ terms, maestro endorsement

## Technical Work
- New migration(s) for tables
- New repository files for gate submissions and vocabulary
- New API route handlers
- New/updated UI components
- Seed data for levels and gate project definitions (from IP-04)

## Acceptance Criteria
- [ ] 4 apprentice levels defined in database
- [ ] 8 gate projects seeded with acceptance criteria
- [ ] Gate submission workflow works (submit → review → pass/revise)
- [ ] Vocabulary tracking works (add term, query count)
- [ ] Apprentice profile shows level and progress
- [ ] Studio page shows the learning path
- [ ] Admin can review gate submissions
- [ ] All existing tests pass + new tests for gate submission workflow
- [ ] Lint/build clean

## End-of-Sprint Verification
```bash
npx vitest run
npx eslint .
npx next build
```

## Exit Gate
A real apprentice could sign up, see their path, submit gate projects, and track progress.
