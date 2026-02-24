# Sprint 17: Billing Integration

## Use Case
As a client or subscriber, I need a self-serve billing portal so that I can manage my payment methods, view invoices, and upgrade or downgrade my subscription without contacting support.

## Personas Addressed
- **Client**: Needs a secure and easy way to pay for services and manage their account.
- **Subscriber**: Needs to manage their recurring payments and access billing history.

## Acceptance Criteria
1.  Stripe is integrated for payment processing and subscription management.
2.  A self-serve billing portal (`/settings/billing`) is available for users to manage their payment methods and view invoices.
3.  Webhook handlers are implemented to process subscription lifecycle events (e.g., successful payment, failed payment, cancellation).
4.  Access to premium features is automatically granted or revoked based on subscription status.

## TDD Plan

### 1. Stripe Integration
- **Test (Negative)**: A user attempting to access a premium feature without an active subscription is redirected to a pricing page or receives a 403 Forbidden.
- **Test (Positive)**: A user with an active subscription can access premium features seamlessly.
- **Implementation**: Integrate the Stripe Node.js library, configure API keys, and create a database migration to add `stripe_customer_id` to the `users` table and create a `subscriptions` table.

### 2. Self-Serve Billing Portal
- **Test (Negative)**: A user without a Stripe customer ID cannot access the billing portal.
- **Test (Positive)**: A user with a Stripe customer ID can access the billing portal, view their current subscription, and update their payment method.
- **Implementation**: Create a new settings view (`/settings/billing`) that integrates with Stripe Customer Portal or uses custom UI components to manage billing information.

### 3. Webhook Handlers
- **Test (Negative)**: A webhook event with an invalid signature is rejected with a 400 Bad Request.
- **Test (Positive)**: A `invoice.payment_succeeded` webhook event successfully updates the user's subscription status in the database.
- **Test (Positive)**: A `customer.subscription.deleted` webhook event successfully revokes the user's premium access.
- **Implementation**: Implement a webhook endpoint (`POST /api/v1/webhooks/stripe`) to handle incoming events and update the database accordingly.

### 4. Automated Access Control
- **Test (Negative)**: A user whose subscription has expired or failed payment cannot access premium features.
- **Test (Positive)**: A user who successfully upgrades their subscription is immediately granted access to premium features.
- **Implementation**: Update the RBAC middleware or feature gating logic to check the user's subscription status in addition to their role.
### 5. E2E Testing
- **Test (Negative)**: A user with a failed payment cannot access premium features.
- **Test (Positive)**: A user can successfully subscribe, view their invoice, and access premium features.
- **Implementation**: Write Playwright tests using Stripe's test mode to simulate successful and failed payments.
