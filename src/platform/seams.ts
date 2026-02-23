/**
 * Platform-layer injectable seams for clock and ID generation.
 *
 * These provide default implementations that use `Date` and `crypto.randomUUID`,
 * but can be replaced in tests with deterministic stubs. This follows the
 * "Humble Object" pattern: side-effecting calls go through seams that can
 * be swapped.
 *
 * Usage in production code:
 *   import { clock, ids } from "@/platform/seams";
 *   const now = clock.now();
 *   const id  = ids.uuid();
 *
 * Usage in tests:
 *   import { setClock, setIds, resetSeams } from "@/platform/seams";
 *   setClock({ now: () => "2025-01-01T00:00:00.000Z" });
 *   setIds({ uuid: () => "test-uuid-1" });
 *   afterEach(() => resetSeams());
 */
import { randomUUID } from "node:crypto";

// ── Interfaces ───────────────────────────────────────────────────────

export interface Clock {
  /** Returns the current time as a UTC ISO 8601 string. */
  now(): string;
}

export interface Ids {
  /** Returns a new UUID v4 string. */
  uuid(): string;
}

// ── Default implementations ──────────────────────────────────────────

const defaultClock: Clock = {
  now: () => new Date().toISOString(),
};

const defaultIds: Ids = {
  uuid: () => randomUUID(),
};

// ── Mutable singletons (swappable in tests) ─────────────────────────

let _clock: Clock = defaultClock;
let _ids: Ids = defaultIds;

/** Read-only proxy to the current clock implementation. */
export const clock: Clock = {
  now: () => _clock.now(),
};

/** Read-only proxy to the current ID generator implementation. */
export const ids: Ids = {
  uuid: () => _ids.uuid(),
};

// ── Test helpers ─────────────────────────────────────────────────────

/** Replace the clock implementation. Typically used in tests. */
export function setClock(impl: Clock): void {
  _clock = impl;
}

/** Replace the ID generator implementation. Typically used in tests. */
export function setIds(impl: Ids): void {
  _ids = impl;
}

/** Reset clock and IDs to their default (non-stubbed) implementations. */
export function resetSeams(): void {
  _clock = defaultClock;
  _ids = defaultIds;
}
