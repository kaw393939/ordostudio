# Decision Log: OPS-01 Operating Model + Minimal UX Contract

Date: 2026-02-23

## Open Items & Decisions

### 1. Newsletter
- **Decision**: The newsletter is a weekly ritual, surfaced via the cockpit and operator navigation. It is not a daily-driver top navigation item.
- **Rationale**: Keeps the primary navigation focused on daily tasks and reduces cognitive load.

### 2. Maestro Permissions
- **Decision**: Maestro role has permissions for Deals, Events, and Newsletter. They have read-only context elsewhere and no access to payouts or roles.
- **Rationale**: Enforces the principle of least privilege. Maestros focus on quality and prioritization, not financial or administrative tasks.

### 3. Admin Pages in Production
- **Decision**: Keep high-context approval cockpits (Deals, Events, Registrations, Engagements, Offers, Intake, Commercial, Ledger, Apprentices, Field Reports, Referrals, Newsletter). Move advanced admin and bulk operations (Measurement, Flywheel, Entitlements, Users, Settings, Audit) to CLI/MCP.
- **Rationale**: Reduces UI surface area, improves clarity, and aligns with the contract that agents handle bulk/admin operations.
