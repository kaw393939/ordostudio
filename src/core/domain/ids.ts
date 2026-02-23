/**
 * Branded / nominal ID types.
 *
 * At runtime these are plain strings. At the type level the `__brand`
 * property prevents accidental cross-assignment (e.g. DealId ≠ UserId).
 */
import { InvalidInputError } from "./errors";

/* ── branded type helper ────────────────────────────── */

type Brand<K extends string> = string & { readonly __brand: K };

const makeId = <K extends string>(raw: string, label: K): Brand<K> => {
  if (!raw || raw.trim().length === 0) {
    throw new InvalidInputError(`${label}_id_empty`);
  }
  return raw as Brand<K>;
};

/* ── public branded types ───────────────────────────── */

export type UserId = Brand<"UserId">;
export const UserId = (raw: string): UserId => makeId(raw, "UserId");

export type DealId = Brand<"DealId">;
export const DealId = (raw: string): DealId => makeId(raw, "DealId");

export type LedgerEntryId = Brand<"LedgerEntryId">;
export const LedgerEntryId = (raw: string): LedgerEntryId => makeId(raw, "LedgerEntryId");

export type EventId = Brand<"EventId">;
export const EventId = (raw: string): EventId => makeId(raw, "EventId");

export type RegistrationId = Brand<"RegistrationId">;
export const RegistrationId = (raw: string): RegistrationId => makeId(raw, "RegistrationId");

export type IntakeRequestId = Brand<"IntakeRequestId">;
export const IntakeRequestId = (raw: string): IntakeRequestId => makeId(raw, "IntakeRequestId");

export type OfferId = Brand<"OfferId">;
export const OfferId = (raw: string): OfferId => makeId(raw, "OfferId");
