# Sprint 7: Dashboard "Action Feed" Refactor (Part 1 - Data Aggregation)

## Use Case
As an authenticated user (Apprentice, Affiliate, or Client), I want a unified view of all my upcoming events, required actions, and recent activity in a single chronological feed, so that I don't have to click through multiple tabs to figure out what I need to do next.

## Personas Addressed
- **Apprentice/Affiliate/Client**: Needs a clear, prioritized list of tasks and events.
- **Admin**: Needs to see a unified timeline of user activity for support and auditing.

## Acceptance Criteria
1.  A new backend service or API endpoint (`GET /api/v1/me/feed`) aggregates data from `AccountRegistration`, `EngagementTimelineItem`, `FollowUpAction`, `OnboardingProgress`, `SubscriptionEvent`, and `TriageTicket`.
2.  The aggregated data is mapped to a unified `FeedItem` TypeScript interface.
3.  The feed items are sorted chronologically (newest first for history, soonest first for upcoming).
4.  The API supports basic filtering (e.g., `?type=upcoming`, `?type=history`, `?type=action_required`).

## TDD Plan

### 1. Define `FeedItem` Interface
- **Test (Positive)**: Create a TypeScript interface `FeedItem` that can represent an event registration, a timeline item, a follow-up action, an onboarding task, a subscription event, or a triage ticket. It must include `id`, `type`, `timestamp`, `title`, `description`, and `actionUrl` (optional).
- **Implementation**: Add the interface to `src/lib/api/schemas.ts` or a dedicated types file.

### 2. Create Aggregation Logic
- **Test (Negative)**: If a user has no data in any of the three tables, the aggregation function returns an empty array `[]`.
- **Test (Positive)**: If a user has 1 registration, 2 timeline items, and 1 follow-up action, the aggregation function returns an array of 4 `FeedItem` objects.
- **Implementation**: Create a new service function in `src/lib/api/feed.ts` that queries the database for the three data types, maps them to `FeedItem`, and concatenates the arrays.

### 3. Implement Sorting and Filtering
- **Test (Positive)**: The aggregated array is sorted by `timestamp` in descending order (newest first).
- **Test (Positive)**: Calling the function with a filter `type=action_required` only returns `FeedItem` objects mapped from `FollowUpAction`.
- **Implementation**: Add sorting and filtering logic to the service function in `src/lib/api/feed.ts`.

### 4. Create API Endpoint (`GET /api/v1/me/feed`)
- **Test (Negative)**: Unauthenticated request returns 401 Unauthorized.
- **Test (Positive)**: Authenticated request returns 200 OK with the aggregated, sorted, and filtered `FeedItem` array.
- **Implementation**: Create the route handler in `src/app/api/v1/me/feed/route.ts` that calls the service function and returns the data.