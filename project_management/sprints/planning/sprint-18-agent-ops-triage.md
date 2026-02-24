# Sprint 18: Agent Ops Triage

## Use Case
As a system administrator or support agent, I need an automated triage system for incoming client requests and support tickets so that I can prioritize and respond to them efficiently, reducing manual workload and improving response times.

## Personas Addressed
- **System Administrator**: Needs to manage and prioritize incoming requests effectively.
- **Support Agent**: Needs context and recommendations to resolve issues quickly.

## Acceptance Criteria
1.  LLMs are integrated to automatically triage and categorize incoming client requests (e.g., intake forms, support tickets).
2.  An Agent Ops dashboard (`/admin/agent-ops`) is available for admins to review AI-generated summaries, categorizations, and recommended actions.
3.  Automated email responses are triggered based on AI triage results (e.g., acknowledging receipt, requesting more information).
4.  The triage system learns and improves over time based on admin feedback and resolution outcomes.

## TDD Plan

### 1. LLM Integration for Triage
- **Test (Negative)**: A request with insufficient information is flagged for manual review rather than being incorrectly categorized.
- **Test (Positive)**: A clear request (e.g., "I need help with my billing") is accurately categorized as "Billing Support" by the LLM.
- **Implementation**: Integrate an LLM API (e.g., OpenAI, Anthropic) to process incoming text, return structured categorization data, and store it in a new `triage_tickets` database table (with SQLite migrations).

### 2. Agent Ops Dashboard
- **Test (Negative)**: A user without the `ADMIN` or `SUPPORT` role cannot access the Agent Ops dashboard.
- **Test (Positive)**: An admin can view a list of triaged requests, including the AI's summary, category, and confidence score.
- **Implementation**: Create a new admin view (`/admin/agent-ops`) that fetches and displays triaged requests from the database.

### 3. Automated Responses
- **Test (Negative)**: A request categorized as "High Priority" or "Urgent" does not receive an automated response, but is immediately escalated to a human agent.
- **Test (Positive)**: A request categorized as "General Inquiry" receives an automated response acknowledging receipt and providing relevant FAQ links.
- **Implementation**: Integrate the email service with the triage system to trigger automated responses based on the assigned category and confidence score.

### 4. Feedback Loop and Improvement
- **Test (Negative)**: An admin who disagrees with the AI's categorization cannot easily correct it.
- **Test (Positive)**: An admin can override the AI's categorization, and this feedback is logged for future model fine-tuning or prompt adjustments.
- **Implementation**: Add a feedback mechanism to the Agent Ops dashboard that allows admins to correct categorizations and log the results.
### 5. E2E Testing
- **Test (Negative)**: A non-admin user cannot access the Agent Ops dashboard.
- **Test (Positive)**: An admin can view triaged tickets, override categories, and trigger automated responses.
- **Implementation**: Write Playwright tests to verify the Agent Ops dashboard functionality and RBAC.
