# Sprint Eval-01: Policy Enforcement Eval Suite — Architecture

## New Eval Type Structure

### `PolicyEvalScenario` Interface

```typescript
// src/evals/types.ts additions

interface PolicyEvalScenario {
  id:          string;
  description: string;
  type:        "policy";

  /**
   * Set up the DB state before the scenario runs.
   */
  preSetup?: (db: Database) => void;

  /**
   * The action to perform — either an HTTP call or a direct DB/tool invocation.
   */
  action: PolicyAction;

  /**
   * Assertions on the result.
   */
  assertions: PolicyAssertion[];

  /**
   * Optional DB cleanup after the scenario.
   */
  teardown?: (db: Database) => void;
}

type PolicyAction =
  | { type: "http"; method: string; path: string; body?: object; headers?: Record<string, string> }
  | { type: "tool-call"; toolName: string; args: object; callerId: string; callerRole: string }
  | { type: "db-call"; fn: (db: Database) => unknown }
  | { type: "webhook"; event: string; payload: object };

type PolicyAssertion =
  | { type: "http-status"; expected: number }
  | { type: "response-contains"; key: string; value: unknown }
  | { type: "db-row-exists"; sql: string }
  | { type: "db-row-not-exists"; sql: string }
  | { type: "throws-with-code"; code: string }
  | { type: "response-field"; path: string; predicate: (v: unknown) => boolean };
```

### Policy Runner Architecture

```
PolicyEvalScenario
        │
        ▼
policy-runner.ts
   │
   ├── action.type === 'http'
   │     └── fetch(testServerUrl + path, { method, body, headers })
   │
   ├── action.type === 'tool-call'
   │     └── callTool(toolName, args, { callerId, callerRole })
   │
   ├── action.type === 'db-call'
   │     └── action.fn(db)
   │
   └── action.type === 'webhook'
         └── simulateWebhook(event, payload, db)
        │
        ▼
   Run assertions
        │
        ▼
   Pass / Fail with descriptor
```

## Test Server
Policy evals that test HTTP routes require a running test server.
Use `createServer()` from Next.js app router test utilities, OR
use the existing Vitest HTTP helper if present.

> **Alternative (preferred for speed):** Call route handler functions directly
> in Vitest, passing a `NextRequest` mock. Avoids needing a live port.

```typescript
import { GET, POST } from "@/app/api/v1/intake/[id]/route";

const req  = new NextRequest("http://localhost/api/v1/intake/test-id");
const resp = await GET(req, { params: { id: "test-id" } });
expect(resp.status).toBe(401);
```

## Webhook Simulation Pattern

```typescript
// For PE-04 commission-void-on-refund
function simulateStripeRefundWebhook(db: Database, paymentIntentId: string) {
  // Directly call the webhook handler logic (not the HTTP route)
  // This avoids Stripe signature verification in tests
  const handler = getWebhookHandler("payment_intent.payment_failed");
  handler(db, { paymentIntentId, amount: 4000 });
}
```

## File Map

```
src/evals/
  types.ts                        ← MODIFIED
  policy-suite.eval.ts            ← NEW (6 scenarios)
src/evals/runners/
  policy-runner.ts                ← NEW
src/evals/fixtures/
  policy-seeds.ts                 ← NEW
```
