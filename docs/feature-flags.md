# Feature Flags

## Flags

Build-time (public) flags are read from environment variables prefixed with `NEXT_PUBLIC_FF_`.

Current keys:
- `NEXT_PUBLIC_FF_CALENDAR_GRID`
- `NEXT_PUBLIC_FF_DARK_MODE_TOGGLE`
- `NEXT_PUBLIC_FF_UNDO_DELETE`

Values:
- `true` enables
- any other value / unset disables

## Runtime overrides (optional)

The client merges build-time flags with optional runtime overrides fetched from:
- `GET /api/v1/feature-flags` (no-store)

Runtime overrides can be supplied via either:
- `APP_RUNTIME_FEATURE_FLAGS_FILE` (path to JSON file)
- `APP_RUNTIME_FEATURE_FLAGS_JSON` (inline JSON)

Shape:
```json
{
  "CALENDAR_GRID": true,
  "DARK_MODE_TOGGLE": false,
  "UNDO_DELETE": true
}
```

Notes:
- Runtime overrides take precedence over build-time defaults.
- Keep runtime overrides small and time-bounded; prefer making the flagged path the default once proven.
