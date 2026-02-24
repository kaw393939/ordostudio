# Sprint 16: Real-Time Telemetry

## Use Case
As a product manager or system administrator, I need comprehensive business telemetry to track user journeys, feature usage, and platform health so that I can make data-driven decisions and optimize the user experience.

## Personas Addressed
- **Product Manager**: Needs insights into user behavior and feature adoption.
- **System Administrator**: Needs to monitor platform health and identify potential issues.

## Acceptance Criteria
1.  PostHog is integrated across the platform for product analytics and session recording.
2.  Custom events are tracked for key actions (e.g., role applications, intake submissions, onboarding completion).
3.  An internal dashboard is available for monitoring platform health and user engagement metrics.
4.  Telemetry data is anonymized or pseudonymized to protect user privacy where necessary.

## TDD Plan

### 1. PostHog Integration
- **Test (Negative)**: A user who opts out of tracking (e.g., via Do Not Track or cookie consent) is not tracked by PostHog.
- **Test (Positive)**: A user who consents to tracking has their page views and interactions recorded by PostHog.
- **Implementation**: Integrate the PostHog snippet into the Next.js application and configure it to respect user privacy settings.

### 2. Custom Event Tracking
- **Test (Negative)**: A failed role application submission does not trigger a successful application event.
- **Test (Positive)**: A successful role application submission triggers a custom event in PostHog with relevant metadata (e.g., requested role).
- **Implementation**: Add custom event tracking calls to key API endpoints and frontend components (e.g., `POST /api/v1/roles/request`, `POST /api/v1/intake`).

### 3. Internal Monitoring Dashboard
- **Test (Negative)**: A user without the `ADMIN` role cannot access the internal monitoring dashboard.
- **Test (Positive)**: An admin can access the dashboard and view key metrics (e.g., daily active users, feature adoption rates).
- **Implementation**: Create a new admin view (`/admin/telemetry`) that fetches and displays aggregated data from PostHog or an internal database.

### 4. Privacy and Data Anonymization
- **Test (Negative)**: Sensitive user data (e.g., passwords, personal messages) is not sent to PostHog.
- **Test (Positive)**: User identifiers (e.g., email addresses) are pseudonymized or hashed before being sent to PostHog, unless explicit consent is given.
- **Implementation**: Implement data sanitization logic before sending events to PostHog to ensure compliance with privacy regulations.
### 5. E2E Testing
- **Test (Negative)**: Telemetry events are not fired when tracking is disabled.
- **Test (Positive)**: Key user actions trigger the correct PostHog events with expected metadata.
- **Implementation**: Write Playwright tests to verify event firing and dashboard access controls.
