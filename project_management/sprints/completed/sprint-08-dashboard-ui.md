# Sprint 8: Dashboard "Action Feed" Refactor (Part 2 - UI Implementation)

## Use Case
As an authenticated user (Apprentice, Affiliate, or Client), I want a unified, visually distinct feed of my upcoming events, required actions, and recent activity on my dashboard, so that I can quickly understand what needs my attention without navigating through multiple tabs.

## Personas Addressed
- **Apprentice/Affiliate/Client**: Needs a clear, prioritized list of tasks and events.
- **Admin**: Needs to see a unified timeline of user activity for support and auditing.

## Acceptance Criteria
1.  The tabbed dashboard (`/dashboard`) is replaced with a single, unified `ActionFeed` component.
2.  The `ActionFeed` component fetches data from `GET /api/v1/me/feed`.
3.  Distinct UI cards are designed for different `FeedItem` types (e.g., "Upcoming Event", "Action Required", "Reminder").
4.  The feed supports infinite scroll or pagination for historical items.
5.  *Strategic Update:* The feed components are architected to easily accept real-time data streams (SSE) and interactive onboarding checklists in future sprints.

## TDD Plan

### 1. Build `ActionFeed` Component
- **Test (Negative)**: If the API returns an empty array, the component displays a custom `EmptyState` component (e.g., "No upcoming events or actions required.").
- **Test (Positive)**: If the API returns an array of `FeedItem` objects, the component renders a list of distinct UI cards.
- **Implementation**: Create a new component `src/components/dashboard/action-feed.tsx` that fetches data from the API and maps over the array to render individual cards.

### 2. Design Distinct UI Cards
- **Test (Positive)**: A `FeedItem` of type `Upcoming Event` renders a card with the event title, date, and a "View Details" button.
- **Test (Positive)**: A `FeedItem` of type `Action Required` renders a card with a prominent call-to-action button (e.g., "Complete Intake Form").
- **Test (Positive)**: A `FeedItem` of type `Reminder` renders a card with a subtle icon and a brief description.
- **Implementation**: Create separate components for each card type (e.g., `UpcomingEventCard`, `ActionRequiredCard`, `ReminderCard`) in `src/components/dashboard/cards/`.

### 3. Implement Infinite Scroll or Pagination
- **Test (Positive)**: When the user scrolls to the bottom of the feed, the component fetches the next page of data and appends it to the list.
- **Test (Positive)**: If there is no more data to fetch, the component displays a "No more items" message.
- **Implementation**: Add pagination logic to the `ActionFeed` component, using a library like `react-intersection-observer` or a custom hook to detect when the user reaches the bottom of the list.

### 4. Replace Tabbed Dashboard
- **Test (Positive)**: The `/dashboard` page no longer displays tabs for "Overview", "My Registrations", "Follow-Ups", and "Feedback".
- **Test (Positive)**: The `/dashboard` page renders the `ActionFeed` component as the primary content area.
- **Implementation**: Update `src/app/(authenticated)/dashboard/page.tsx` to remove the tabbed layout and render the `ActionFeed` component instead.