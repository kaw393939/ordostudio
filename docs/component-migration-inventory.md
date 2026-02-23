# Component Migration Inventory

> Maps existing custom primitives/patterns to their shadcn/ui replacements.
> Created as part of Sprint 45 — shadcn Foundation.

## Primitives → shadcn/ui

| Existing | File | shadcn Replacement | Strategy |
|----------|------|--------------------|----------|
| `Button` | `primitives/button.tsx` | `ui/button.tsx` | **Deprecate** — shadcn Button has matching variants (`default`, `destructive`, `outline`, `ghost`, `link`). Map `intent` → `variant`, `fullWidth` → className. |
| `Card` | `primitives/card.tsx` | `ui/card.tsx` | **Deprecate** — shadcn Card adds `CardHeader`, `CardTitle`, `CardDescription`, `CardFooter`. The `elevated` prop becomes a className modifier. |
| `Input` | `primitives/input.tsx` | `ui/input.tsx` *(not yet installed)* | **Direct replacement** — install via `npx shadcn add input`, then swap imports. |

## Patterns → shadcn Composition

| Existing | File | shadcn Basis | Strategy |
|----------|------|--------------|---------| 
| `Breadcrumbs` | `patterns/breadcrumbs.tsx` | `ui/breadcrumb.tsx` | **Wrapper** — keep array-based API, delegate to shadcn `Breadcrumb` sub-components. |
| `EmptyState` | `patterns/empty-state.tsx` | `Card` + layout | **Wrapper** — compose with shadcn Card internals. No direct shadcn equivalent. |
| `ErrorState` | `patterns/error-state.tsx` | `Alert` *(not yet installed)* + `Button` | **Wrapper** — use `Alert variant="destructive"`, keep `supportCode` section. |
| `LoadingState` | `patterns/loading-state.tsx` | `ui/skeleton.tsx` | **Wrapper** — replace hand-rolled pulse divs with Skeleton. |
| `SuccessState` | `patterns/success-state.tsx` | `Alert` or `Sonner` toast | **Wrapper** — inline success → Alert, ephemeral → Sonner. |
| `AsyncBoundary` | `patterns/async-boundary.tsx` | `Skeleton` + `Button` | **Keep** — already uses shadcn primitives. |

## shadcn Components Installed (Sprint 45)

`alert-dialog` · `avatar` · `badge` · `breadcrumb` · `button` · `card` · `command` · `dialog` · `dropdown-menu` · `popover` · `scroll-area` · `separator` · `sheet` · `skeleton` · `sonner` · `table` · `tabs` · `tooltip`

## Still Needed

- `input` — for form fields (Sprint 46+)
- `alert` — for ErrorState/SuccessState refactoring (Sprint 46+)

## Recommended Migration Order

1. Switch `primitives/button` → `ui/button` (highest usage)
2. Switch `primitives/card` → `ui/card`
3. Install + switch `primitives/input` → `ui/input`
4. Refactor `LoadingState` to use `Skeleton`
5. Install `Alert`, refactor `ErrorState`
6. Refactor `Breadcrumbs` to wrap `ui/breadcrumb`
7. Refactor `EmptyState` + `SuccessState`
8. Remove `src/components/primitives/` once all imports migrated
