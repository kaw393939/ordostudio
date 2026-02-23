# Sprint SYS-01 — Seed Events + Offers from Workshop Catalog

## Goal
Populate the LMS database with bookable events and offers derived from the IP-03 workshop catalog, making the 8 workshops and 3 corporate packages immediately available through the public site.

## Prerequisites
- Sprint IP-01 (Frameworks) — needed for Human Edge / Spell Book references
- Sprint IP-03 (Workshop Catalog) — provides the content
- Sprint IP-07 (EverydayAI) — provides corporate package definitions

## Scope

### Seed Offers
Create CLI seed commands or migration to insert:
1. **8 workshop offers** into the `offers` table with proper slugs, titles, summaries, audience, delivery mode, pricing, and refund policy
2. **3 corporate packages** (Starter $2K, Professional $5K, Enterprise $10K) with `offer_packages` tiers
3. **Free community event offer** for EverydayAI sessions
4. Map each offer to its Human Edge capabilities in the description/metadata

### Seed Events
Create initial events for:
1. At least 2 upcoming workshops (e.g., "Ask Better Questions" and "Design for Failure")
2. 1 Town Hall event (free, virtual)
3. 1 EverydayAI community session (free, in-person)
4. Each event linked to its offer, with proper capacity, dates, and delivery mode

### Update Event Display
- Add Human Edge capability badge/tag to event cards and detail pages
- Add Spell Book terms preview ("You'll learn: error budget, blameless postmortem, 12-Factor") to event descriptions
- Add "What you'll take home" artifact list to event detail pages

### Update Offer Display
- Enhance offer detail pages with workshop-specific content from the workshop catalog
- Add "Best for" audience chips to offer cards
- Add Spell Book terms and Human Edge capability to offer pages

## Technical Work
- New seed data in CLI or migration
- Possible new fields: `human_edge_capability` on events/offers (or use tags/metadata)
- Update event card component to show capability badges
- Update event detail page to show artifacts and Spell Book terms
- Update offer pages with enhanced content

## Acceptance Criteria
- [ ] 8 workshop offers exist in the database with complete metadata
- [ ] 3 corporate packages exist with tiered pricing
- [ ] At least 4 events seeded with proper dates and capacities
- [ ] Event cards show Human Edge capability tags
- [ ] Event detail pages show "What you'll take home" artifacts
- [ ] Offer pages enhanced with workshop content
- [ ] All existing tests pass
- [ ] Lint/build clean

## End-of-Sprint Verification
```bash
npx vitest run
npx eslint .
npx next build
```

## Exit Gate
Public site shows bookable events and offers with rich workshop content.
