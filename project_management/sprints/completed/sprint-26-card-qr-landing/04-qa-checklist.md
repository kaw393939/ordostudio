# Sprint 26: `/card` — QA Checklist

## 1. Route

- [ ] `/card` returns HTTP 200.
- [ ] `/card?ref=ANYCODE` returns HTTP 200 (no server-side error on unknown code).

---

## 2. Cookie Behaviour

- [ ] Visiting `/card?ref=TESTCODE` sets `so_ref` cookie in the browser.
- [ ] Cookie name is `so_ref`.
- [ ] Cookie value is the ref code (uppercased).
- [ ] Cookie `Max-Age` is 90 days (7,776,000 seconds).
- [ ] Cookie `SameSite=Lax`.
- [ ] Visiting `/card` (no `?ref`) does NOT set `so_ref` cookie.
- [ ] Cookie persists if visitor navigates to `/services/request` in the same browser session.

---

## 3. Attribution Line

- [ ] With a valid `?ref=CODE` that resolves to a first name: attribution line reads `"You were referred by [Name]."` using `type-meta text-text-muted` styling.
- [ ] With an invalid or unresolvable `?ref=CODE`: attribution line does NOT render; no error message or fallback text shown.
- [ ] With no `?ref` param: attribution line does NOT render.

---

## 4. CTAs

- [ ] Primary button reads: **"Commission a project →"** → `/services/request` (not `/studio`)
- [ ] Secondary link reads: **"Learn the method →"** → `/maestro`
- [ ] Primary button uses `intent="primary"` styling.
- [ ] Secondary link is a text link (no button border) — does not visually compete with primary button.
- [ ] No third CTA anywhere on the page.
- [ ] No `BOOKING_URL` CTA on this page.

---

## 5. Below-Fold Content

- [ ] Below-fold section has exactly 3 paragraphs.
- [ ] First sentence is: "The business card you're holding belongs to a Studio Ordo member..."
- [ ] Proof point appears: "23 years teaching engineers. 10,000+ trained."
- [ ] No CTAs in the below-fold section.
- [ ] No newsletter signup form.

---

## 6. `/r/[code]` Redirect

- [ ] Visiting `/r/ANYCODE` redirects to `/card?ref=ANYCODE`.
- [ ] Redirect is a 302.
- [ ] Old redirect to `/services` is gone.

---

## 7. Build & Tests

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
