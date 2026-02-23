# Missing Feature Review — Delivery Modes (Online / In-Person / Hybrid)

## Problem
Delivery mode is not a first-class business concept in the current product.

## What is missing
- Session mode model: `online`, `in_person`, `hybrid`
- Location management (venue, room, address, access instructions)
- Online session details (meeting URL, platform, backup link)
- Mode-specific prep checklists and reminders
- Localized timezone display for distributed participants

## UX implications
- Users do not know where/how to join with confidence.
- Admins must improvise critical logistics in free-text fields.
- Session-day failure risk (late starts, wrong links, venue confusion) increases.

## Required fundamentals
1. Mode-specific session template fields and validation.
2. “How to attend” module visible in confirmation and account history.
3. Per-mode reminder schedule (e.g., 24h + 1h, with location/link payload).
4. Join/check-in affordances tailored by mode.

## Data model additions
- `session_delivery`: session_id, mode, location_id, meeting_url, join_instructions
- `locations`: name, address, capacity, notes
- `delivery_checklists`: session_id, item, completed_by, completed_at

## Acceptance criteria
- Participants can always answer “where/how do I attend?” without support.
- Admin can configure logistics without free-text hacks.
- Online and in-person operational failure rates decrease measurably.
