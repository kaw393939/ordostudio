# Sprint 35: Content + Config Layer — UX Design

## Staff Settings Page `/admin/settings`

### Layout
Two-column table layout, consistent with existing admin panels.

```
┌─────────────────────────────────────────────────────────┐
│  Site Settings                            [Save all]    │
├──────────────────────┬──────────────────────────────────┤
│ contact.phone        │ [+1 (000) 000-0000          ] [✓]│
│ contact.email        │ [hello@studioordo.com        ] [✓]│
│ contact.booking_url  │ [https://cal.com/studioordo  ] [✓]│
│ brand.name           │ [Studio Ordo                 ] [✓]│
│ brand.tagline        │ [Bring order to AI...        ] [✓]│
│ commission.rate_pct  │ [20                          ] [✓]│
│ guild.affiliate_min  │ [50                          ] [✓]│
└──────────────────────┴──────────────────────────────────┘
```

- Each row: key (read-only label) / inline `<input>` / save checkmark on blur
- Save is per-row (PATCH single key on blur) — no full-page reload
- Success: row briefly highlights green
- Error: row highlights red with inline error message

### No public UI changes in this sprint.
