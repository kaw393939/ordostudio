# Sprint PRD-05 — Deployment Configuration + CI/CD Pipeline

## Severity: CRITICAL

## Goal
Create a production-ready deployment configuration: `.env.example` documenting all environment variables, a multi-stage `Dockerfile`, `docker-compose.yml` for local development, and a GitHub Actions CI/CD pipeline that runs tests, lint, build, and optionally deploys.

## Why This Is Critical
There is **no `.env.example`** — new developers must read source code to discover ~25 env vars. There is **no Dockerfile** — the app cannot be deployed as a container. The only CI pipeline is a Lighthouse performance gate — there is **no CI that runs tests, lint, or build**. Without these, the system cannot be deployed or operated reliably.

## Current State (Evidence)

| What exists | Where | Problem |
|-------------|-------|---------|
| No `.env.example` or `.env.template` | Confirmed by search | Env vars undocumented |
| No Dockerfile | Confirmed by search | Can't containerize |
| No docker-compose.yml | Confirmed by search | No local multi-service dev |
| Only CI: Lighthouse gate | `.github/workflows/lighthouse-release-gate.yml` | No test/lint/build CI |
| No vercel.json / fly.toml | Confirmed by search | No platform deployment config |
| ~25 env vars across auth, Stripe, Postmark, Discord, platform | Spread across 8+ files | Discovery requires code reading |

### Complete Environment Variable Inventory
From research (auth.ts, newsletter.ts, platform/config.ts, stripe-client.ts, discord-client.ts, feature-flags.ts):

**Platform:**
`APPCTL_ENV`, `APPCTL_DB_FILE`, `APPCTL_DB_BUSY_TIMEOUT_MS`, `APPCTL_REQUIRE_EMAIL_VERIFICATION`, `APPCTL_REQUIRE_TOKEN_STAGING`, `APPCTL_REQUIRE_TOKEN_PROD`, `APPCTL_DANGEROUS_REQUIRE_EXPLICIT_PROD`, `APPCTL_AUDIT_STRICT`, `APPCTL_OUTPUT_FORMAT`

**Email:**
`NEWSLETTER_EMAIL_PROVIDER`, `POSTMARK_SERVER_TOKEN`, `NEWSLETTER_FROM_EMAIL`, `POSTMARK_MESSAGE_STREAM`, `NEWSLETTER_BASE_URL`, `NEWSLETTER_UNSUBSCRIBE_SECRET`, `TRANSACTIONAL_EMAIL_PROVIDER` (from PRD-01), `TRANSACTIONAL_FROM_EMAIL` (from PRD-01)

**Integrations:**
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_COUNTRY`, `DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_ENTITLEMENT_ROLE_MAP_JSON`

**UI / Feature Flags:**
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FF_CALENDAR_GRID`, `NEXT_PUBLIC_FF_DARK_MODE_TOGGLE`, `NEXT_PUBLIC_FF_UNDO_DELETE`, `NEXT_PUBLIC_FF_EXP_HOME_HERO_COPY_V2`, `NEXT_PUBLIC_FF_EXP_HOME_PRIMARY_CTA_CONSULT`, `NEXT_PUBLIC_FF_EXP_SERVICES_CARD_ORDER_ALT`

**Logging (from PRD-03):**
`LOG_LEVEL`, `LOG_FORMAT`

**Security (from PRD-04):**
`CORS_ALLOWED_ORIGINS`, `MAX_REQUEST_BODY_BYTES`

## Scope

### 1. `.env.example`
Document every env var with:
- Name, default value, description
- Which are required vs optional
- Which are sensitive (should not be committed)
- Grouped by: Platform, Auth, Email, Stripe, Discord, Feature Flags, Logging, Security

### 2. Multi-Stage Dockerfile
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system app && adduser --system --ingroup app app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# SQLite data directory
RUN mkdir -p /app/data && chown app:app /app/data
VOLUME ["/app/data"]

USER app
EXPOSE 3000
CMD ["node", "server.js"]
```

Requires `next.config.ts` update:
```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

### 3. `docker-compose.yml`
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    environment:
      - APPCTL_ENV=local
      - APPCTL_DB_FILE=/app/data/app.db
```

### 4. `.dockerignore`
```
node_modules
.next
.git
data/*.db
tmp/
*.md
project_management/
e2e/
```

### 5. GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  docker:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t lms-app .
      - run: docker run --rm lms-app node -e "console.log('container starts')"
```

### 6. Health Check Endpoint
Add `GET /api/v1/health` route:
```ts
export async function GET() {
  return Response.json({
    status: "ok",
    version: process.env.npm_package_version ?? "unknown",
    uptime: process.uptime(),
  });
}
```
Used by Docker `HEALTHCHECK` and load balancers.

### 7. `next.config.ts` Updates
- `output: "standalone"` for Docker
- Security headers (if not using middleware exclusively)

## Non-Goals
- Kubernetes manifests / Helm charts
- Multi-environment deployment (staging/prod pipelines)
- Database migration automation in CI (operators run CLI manually)
- Secret management (AWS Secrets Manager, Vault, etc.)
- CDN / edge configuration

## TDD Process

### Red Phase
1. **Health check tests** (`src/app/api/v1/__tests__/health.test.ts`):
   - GET /api/v1/health → 200 with `{ status: "ok" }`
   - Response includes `uptime` as number
   - No auth required

2. **Docker build test** (in CI):
   - `docker build .` succeeds
   - Container starts and responds to health check

3. **Env var documentation test** (`src/__tests__/env-documentation.test.ts`):
   - Parse `.env.example` for all documented vars
   - Scan source code for `process.env.` references
   - Assert: every `process.env.X` in source is documented in `.env.example`
   - This is a living documentation guard

### Green Phase — Create all files
### Refactor Phase — Verify Docker build, CI pipeline

## E2E Verification Tests

### Test: "health endpoint accessible without auth"
```
1. GET /api/v1/health (no session cookie)
2. Assert: 200
3. Assert: body.status === "ok"
4. Assert: body.uptime >= 0
```

### Test: "all environment variables documented in .env.example"
```
1. Read .env.example, extract all VAR_NAME entries
2. Grep source code for process.env.SOMETHING patterns
3. Assert: every env var found in source exists in .env.example
4. Fail with list of undocumented vars
```

### Test: "Docker image builds and starts"
```
1. docker build -t lms-test .
2. docker run -d -p 3001:3000 -e APPCTL_ENV=local lms-test
3. curl http://localhost:3001/api/v1/health
4. Assert: 200 response
5. docker stop + rm
```

## Acceptance Criteria
- [ ] `.env.example` with all ~30 env vars documented
- [ ] Multi-stage `Dockerfile` producing minimal image
- [ ] `docker-compose.yml` for local development
- [ ] `.dockerignore` excluding unnecessary files
- [ ] `next.config.ts` updated with `output: "standalone"`
- [ ] GitHub Actions CI pipeline: lint → test → build → docker
- [ ] Health check endpoint at `/api/v1/health`
- [ ] Env var documentation test guards against undocumented vars
- [ ] Docker image builds and starts successfully
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
docker build -t lms-test .
```
