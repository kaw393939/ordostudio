# Lighthouse Summary

Base URL: http://localhost:3000

| Area | Page | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| unauthenticated | / | 100 | 100 | 100 | 100 |
| unauthenticated | /events | 100 | 100 | 100 | 100 |
| unauthenticated | /events/lighthouse-open | 100 | 98 | 100 | 100 |
| unauthenticated | /events/lighthouse-full | 100 | 98 | 100 | 100 |
| unauthenticated | /login | 100 | 100 | 100 | 100 |
| unauthenticated | /register | 100 | 100 | 100 | 100 |
| unauthenticated | /privacy | 100 | 100 | 100 | 100 |
| unauthenticated | /terms | 100 | 100 | 100 | 100 |
| authenticatedUser | /account | 100 | 98 | 100 | 100 |
| authenticatedUser | /events/lighthouse-full | 100 | 98 | 100 | 100 |
| authenticatedAdmin | /admin | 100 | 96 | 100 | 100 |
| authenticatedAdmin | /admin/events | 99 | 100 | 100 | 100 |
| authenticatedAdmin | /admin/audit | 100 | 100 | 100 | 100 |
| authenticatedAdmin | /admin/users | 100 | 100 | 100 | 100 |
| authenticatedAdmin | /admin/events/lighthouse-open | 99 | 100 | 100 | 100 |
| authenticatedAdmin | /admin/events/lighthouse-open/registrations | 100 | 100 | 100 | 100 |
| authenticatedAdmin | /admin/events/lighthouse-open/export | 100 | 100 | 100 | 100 |

## Core Web Vitals (Required Routes)

- Budgets: LCP < 2500ms, INP < 200ms, CLS < 0.1, TBT < 300ms

| Area | Page | LCP (ms) | INP (ms) | CLS | TBT (ms) |
| --- | --- | ---: | ---: | ---: | ---: |
| unauthenticated | / | 72 | 26 | 0.000 | 0 |
| unauthenticated | /events | 70 | 25 | 0.013 | 0 |
| unauthenticated | /events/lighthouse-open | 189 | 25 | 0.053 | 0 |
| unauthenticated | /login | 54 | 25 | 0.000 | 0 |
| authenticatedAdmin | /admin | 168 | 25 | 0.016 | 0 |

## Legacy Table

| Page | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| / | 100 | 100 | 100 | 100 |
| /events | 100 | 100 | 100 | 100 |
| /events/lighthouse-open | 100 | 98 | 100 | 100 |
| /events/lighthouse-full | 100 | 98 | 100 | 100 |
| /login | 100 | 100 | 100 | 100 |
| /register | 100 | 100 | 100 | 100 |
| /privacy | 100 | 100 | 100 | 100 |
| /terms | 100 | 100 | 100 | 100 |
| /account | 100 | 98 | 100 | 100 |
| /events/lighthouse-full | 100 | 98 | 100 | 100 |
| /admin | 100 | 96 | 100 | 100 |
| /admin/events | 99 | 100 | 100 | 100 |
| /admin/audit | 100 | 100 | 100 | 100 |
| /admin/users | 100 | 100 | 100 | 100 |
| /admin/events/lighthouse-open | 99 | 100 | 100 | 100 |
| /admin/events/lighthouse-open/registrations | 100 | 100 | 100 | 100 |
| /admin/events/lighthouse-open/export | 100 | 100 | 100 | 100 |


## Route Budget Gate

- Budget config: /Users/kwilliams/Projects/lms_219/scripts/lighthouse-route-budgets.json
- Waiver config: /Users/kwilliams/Projects/lms_219/scripts/lighthouse-budget-waivers.json
- Variance buffer: 2

- No budget failures.

- No active waivers used.