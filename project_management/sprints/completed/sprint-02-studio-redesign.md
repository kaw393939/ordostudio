# Sprint 2: Studio Page Redesign (Completed)

## Use Case
As a prospective client or user visiting the Studio page, I want a responsive, high-converting landing page that clearly communicates the value proposition and upcoming events, so that I can easily understand what Studio Ordo offers and take action.

## Personas Addressed
- **Prospective Client/User**: Needs a clear, visually appealing, and fast-loading page to learn about the Studio.

## Acceptance Criteria
1.  Massive hardcoded images are replaced with optimized `next/image` components using `priority` and proper aspect ratios.
2.  The layout is redesigned to use a CSS grid with a sticky sidebar for events.
3.  Typography and spacing are improved to match the brand guide.

## TDD Plan (Retrospective)

### 1. Optimize Images
- **Test (Negative)**: Large, unoptimized images cause the page to load slowly and negatively impact Core Web Vitals (LCP).
- **Test (Positive)**: Images are served in next-gen formats (WebP/AVIF), properly sized, and use the `priority` attribute for above-the-fold content, resulting in a fast load time.
- **Implementation**: Replaced `<img>` tags with `next/image` in `src/app/(public)/studio/page.tsx`.

### 2. Redesign Layout with CSS Grid
- **Test (Negative)**: The page layout breaks or becomes difficult to read on smaller screens.
- **Test (Positive)**: The page uses a responsive CSS grid that adapts gracefully to different screen sizes, maintaining readability and visual hierarchy. A sticky sidebar keeps upcoming events visible while scrolling the main content on desktop.
- **Implementation**: Implemented CSS Grid and `position: sticky` in the Studio page layout.

### 3. Improve Typography and Spacing
- **Test (Negative)**: Text is too small, cramped, or uses inconsistent fonts, making it hard to read.
- **Test (Positive)**: Typography adheres to the brand guide (e.g., specific font families, sizes, line heights), and spacing creates a clear visual rhythm and hierarchy.
- **Implementation**: Updated Tailwind classes for typography and spacing to align with the design system.