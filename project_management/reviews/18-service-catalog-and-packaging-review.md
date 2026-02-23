# Missing Feature Review — Service Catalog and Packaging

## Problem
The product has events, but no true service catalog for consulting/training offers.

## What is missing
- Offer types (`consulting`, `training`, `workshop`, `coaching`)
- Delivery mode metadata (`online`, `in-person`, `hybrid`)
- Audience fit (`individual`, `group`, `max_group_size`)
- Duration and cadence templates (single session vs multi-session package)
- Pricing primitives (fixed fee, per-seat, per-hour, package tiers)
- Included deliverables (slides, recordings, worksheets, assessments)

## UX implications
- Clients cannot understand “what to buy” quickly.
- Admins are forced to repurpose event titles/descriptions as pseudo-products.
- Conversion suffers due to weak information scent and inconsistent offers.

## Required fundamentals
1. Offer listing page with filters by audience, mode, and topic.
2. Offer detail page with scope, prerequisites, format, and outcomes.
3. Clear CTA split: `Book 1:1`, `Request group session`, `Talk to us`.
4. Comparable packaging table (starter/pro/team).

## Data model additions
- `service_offerings`: id, slug, title, category, mode, audience, base_price_model, duration, active
- `service_packages`: offering_id, tier_name, seat_range, hours, price
- `offering_outcomes`: offering_id, outcome_text, order

## Acceptance criteria
- A visitor can choose the right service in under 60 seconds.
- Admin can configure an offering without touching free-form event copy.
- Offer metadata supports both online and in-person variants.
