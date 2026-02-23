# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- Visual regression suite (Playwright `toHaveScreenshot`) covering key public/admin routes across light/dark and multiple viewports.
- Feature flags (build-time + optional runtime overrides) with gating for higher-risk UI transitions.
- Lighthouse gating improvements: Core Web Vitals metric budgets (LCP/INP/CLS/TBT) and a public-route SEO score gate.
- Bundle-size gate script to track per-route initial JS (gzipped) for key public routes.
- Published design-system documentation.
