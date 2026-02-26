# Phase 0: Eval Hotfix — Overview

**Sprint:** `sprint-phase0-eval-fix`  
**Date:** 2026-02-26  
**Estimate:** 0.5 days  
**Priority:** 🔴 P0 — blocks eval gate for all downstream work  
**Git baseline:** `e2da15a`  
**Eval baseline:** 12/13 passing

---

## Problem

The eval `intake-agent-pricing-lookup` is failing because the agent correctly answers the pricing question from the **system prompt itself** — it never needs to call `content_search`. This means the tool isn't getting exercised, the eval expectation isn't met, and the same anti-pattern will repeat as more facts get hardcoded into the prompt.

**Root cause:** `src/lib/api/agent-system-prompt.ts` contains:
> "Individual pricing is $3,000 to $5,000; team and enterprise pricing is $18,000 to $24,000."

The pricing facts already live in `content/site/training.md` and `content/site/services.md`.

---

## Goal

Single source of truth: content files. System prompt tells the model *how to behave*, never *what the facts are*.

After this sprint:
- The system prompt no longer contains any pricing figures
- Rule 6 of the system prompt instructs the agent to use `content_search` before stating any factual claim about pricing, syllabi, schedule, or guild structure  
- `npm run evals` → **13/13 PASS**
- `npm test` → ≥ 1714/1715 (no regressions)

---

## What This Unlocks

Every downstream sprint assumes the eval gate is clean. This is a mandatory pre-req for:
- Maestro-01 (adds 18 more evals — gate would be broken at baseline)
- Vec-01 (adds 4 content retrieval evals)
- CI policy (eval gate is part of release gate)
