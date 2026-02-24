# Sprint 13: Performance & Core Web Vitals

## Use Case
As a user accessing the platform, I want pages to load quickly and smoothly, without layout shifts or delays, so that I can efficiently complete my tasks and navigate the site without frustration.

## Personas Addressed
- **All Users (Public, Authenticated, Admin)**: Everyone benefits from a fast, responsive, and stable platform.

## Acceptance Criteria
1.  Lighthouse audits are run on all public pages (e.g., Home, Studio, Events, Register, Login) to identify performance bottlenecks.
2.  Dynamic imports are implemented for heavy components (e.g., large charts, complex forms, third-party libraries) to reduce initial bundle size.
3.  Fonts and third-party scripts are optimized to minimize render-blocking resources and improve First Contentful Paint (FCP).
4.  Layout shifts (Cumulative Layout Shift - CLS) are eliminated by ensuring images and dynamic content have explicit dimensions or placeholders.
5.  *Strategic Update:* Privacy-friendly product analytics (e.g., PostHog) are integrated to measure business telemetry and funnel conversion rates.

## TDD Plan

### 1. Run Lighthouse Audits
- **Test (Negative)**: A Lighthouse audit on the Home page reveals a low Performance score (e.g., < 50) due to large images or render-blocking scripts.
- **Test (Positive)**: A Lighthouse audit on the Home page achieves a Performance score of 90+ after optimizations.
- **Implementation**: Use the Chrome DevTools Lighthouse panel or a CI/CD integration to run audits on key pages. Document the baseline scores and identify specific areas for improvement.

### 2. Implement Dynamic Imports
- **Test (Negative)**: A large charting library is included in the initial bundle for the Dashboard, causing a slow Time to Interactive (TTI).
- **Test (Positive)**: The charting library is dynamically imported using `next/dynamic` only when the user navigates to a specific tab or section that requires it, reducing the initial bundle size.
- **Implementation**: Identify heavy components or libraries (e.g., `react-chartjs-2`, complex rich text editors) and refactor them to use `next/dynamic` with a loading fallback.

### 3. Optimize Fonts and Third-Party Scripts
- **Test (Negative)**: Custom web fonts are loaded synchronously, causing a flash of unstyled text (FOUT) or a delay in text rendering.
- **Test (Positive)**: Custom web fonts are loaded asynchronously using `next/font` or `font-display: swap`, ensuring text is visible immediately.
- **Test (Positive)**: Third-party scripts (e.g., analytics, chat widgets) are loaded asynchronously or deferred using the `next/script` component with appropriate strategies (`lazyOnload` or `worker`).
- **Implementation**: Review the `src/app/layout.tsx` and other entry points to optimize font loading and third-party script execution.

### 4. Eliminate Layout Shifts (CLS)
- **Test (Negative)**: An image on the Studio page loads without explicit dimensions, causing the content below it to jump down once the image is fully rendered.
- **Test (Positive)**: All images use `next/image` with explicit `width` and `height` attributes, or CSS aspect ratios, preventing layout shifts.
- **Test (Positive)**: Dynamic content areas (e.g., the Action Feed) use skeleton loaders or placeholders with fixed heights while data is fetching, ensuring a stable layout.
- **Implementation**: Audit all pages for CLS issues using Lighthouse or Chrome DevTools Performance panel. Add explicit dimensions to images and implement skeleton loaders for async content.