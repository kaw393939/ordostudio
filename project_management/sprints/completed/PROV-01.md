# PROV-01 — Cryptographically Weak Temporary Password Generation

**Status:** Open  
**Priority:** Medium  
**Effort:** XS  
**Files:** `src/lib/api/provisioning.ts`

---

## Problem

`generateTempPassword` uses `Math.random()` to pick characters:

```ts
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
```

`Math.random()` is a pseudo-random number generator seeded from the system clock.  Its output is
**not cryptographically secure** (PRNG, not CSPRNG).  An attacker with knowledge of the
approximate provisioning time can narrow the seed space and enumerate the ~2^32 possible outputs,
making brute-force of a temporary password feasible.

Temporary passwords are emailed to new users.  Until the user changes their password, they
authenticate solely with this value.  Using a weak generator undermines the security of the
new-account bootstrap flow.

`node:crypto.randomBytes` is already imported for `randomUUID()` elsewhere in the same file.
Switching costs nothing.

---

## Fix

Replace `Math.random()` with `crypto.randomInt(0, chars.length)`:

```ts
import { randomUUID, randomInt } from "node:crypto";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[randomInt(0, chars.length)]).join("");
}
```

`crypto.randomInt(min, max)` uses the OS CSPRNG and is available in Node 14.10+.

---

## Tests

No dedicated unit test needed — `generateTempPassword` is private and tested implicitly via
`provisionAccount`.  Add a comment in the existing provisioning test asserting `tempPassword`
is non-empty and has length 12.
