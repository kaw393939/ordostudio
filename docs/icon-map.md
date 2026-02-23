# Canonical Lucide Icon Map

> Single source-of-truth for icon usage across the LMS 219 UI.
> Always use the icon listed here for its concept — never introduce an alternative without updating this doc.

All icons are imported from `lucide-react`:

```tsx
import { Check, AlertCircle, Calendar } from "lucide-react";
```

## Icon Registry

| Concept | Icon(s) | Typical Usage |
|---------|---------|---------------|
| Success / Complete | `Check`, `CheckCircle` | Status badges, toast, inline confirmation |
| Error / Danger | `AlertCircle`, `XCircle` | Error states, destructive status badges |
| Warning / Caution | `AlertTriangle` | Approaching deadline, conflict warnings |
| Info | `Info` | Help text, tooltips, informational banners |
| Calendar / Date | `Calendar`, `CalendarDays` | Date pickers, event cards |
| Clock / Time | `Clock` | Time inputs, countdown, "Closing Soon" badge |
| User / Account | `User`, `Users` | Profile avatar fallback, admin user lists |
| Search | `Search` | Search inputs, command palette trigger |
| Settings / Config | `Settings` | Admin settings page |
| Trash / Delete | `Trash2` | Destructive delete actions |
| Edit / Pencil | `Pencil` | Inline edit, form edit buttons |
| Plus / Create | `Plus`, `PlusCircle` | Create actions, "Add" buttons |
| Download / Export | `Download` | CSV export, `.ics` download |
| External link | `ExternalLink` | "Add to Google Calendar", external nav |
| Filter | `Filter`, `SlidersHorizontal` | List filter controls |
| Sort | `ArrowUpDown` | Table column sort headers |
| Chevrons | `ChevronLeft`, `ChevronRight`, `ChevronDown` | Navigation, dropdowns, pagination |
| Menu | `Menu` | Mobile hamburger toggle |
| Close | `X` | Dialog close, sheet close, toast dismiss |
| Sun / Moon | `Sun`, `Moon` | Dark-mode toggle |
| Eye / EyeOff | `Eye`, `EyeOff` | Password show/hide toggle |
| Undo | `Undo2` | Undo toast action |
| Loader | `Loader2` (animated spin) | Submit/loading spinner overlay |

## Sizing Convention

Use Tailwind size utilities with Lucide icons:

| Context | Class | Example |
|---------|-------|---------|
| Inline text | `size-4` | Status badges, breadcrumbs |
| Button icon | `size-4` or `size-5` | Icon buttons, icon-with-label |
| Empty state | `size-8` to `size-12` | Centered illustration icons |
| Page header | `size-6` | Section headings |

## Adding New Icons

1. Check this map first — the concept may already have an assigned icon.
2. Browse [lucide.dev/icons](https://lucide.dev/icons) for candidates.
3. Add the mapping to this table and update the component catalog.
4. Import from `lucide-react` — never use raw SVGs.
