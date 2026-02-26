# Studio Ordo Canonical Persona Pack for MCP Tools and Evals

Use this as the canonical human-role model for Studio Ordo / Bottega / Academy / Practice OS.

## Implementation directive

Do **not** assume a greenfield build.

First, inspect the existing system and normalize what already exists:

* current MCP tools
* prompts
* resources
* API routes
* UI flows
* data models
* role / auth model
* ledger / affiliate / booking surfaces
* event-reporting / newsletter surfaces

Then map existing capabilities to the canonical personas and interactions below.

If a capability already exists under another name, **adapt and extend it** rather than duplicating it.

The goal is:

1. make personas explicit
2. ensure each persona has a complete tool path
3. add evals that prove the system serves each persona correctly
4. identify missing MCP tools needed for reliable orchestration

---

## System worldview

Studio Ordo is not just a SaaS product. It is a multi-layer ecosystem:

* **Guild / Brand**: trust, rank, standards
* **Academy**: free apprentice entry + paid training
* **Practice OS**: site, intake, booking, payments, CRM, affiliate
* **Media**: newsletter / show / event reporting
* **Studio Services**: consulting, delivery, assignments

The system must support all five layers without collapsing them into one undifferentiated app.

---

## Canonical personas

## 1) Independent Professional Customer

### Description

An experienced white-collar professional (consultant, coach, accountant, strategist, specialist) using Studio Ordo to run a modern one-person firm.

### Primary needs

* professional web presence
* intake and lead capture
* scheduling and booking
* payment / deposits
* callback escalation
* CRM memory
* referral / affiliate tracking
* reduced admin burden

### Pain points

* too much manual follow-up
* missed leads
* fragmented tools
* weak online presence
* poor conversion from networking into booked work

### Core interactions

* sets profile, offers, pricing, availability
* receives leads from direct traffic, QR, referrals, newsletter traffic
* approves / reviews bookings or callback escalation
* reviews payout/commission impacts
* sees customer interaction history
* optionally buys classes / joins guild tiers

### Required MCP tool surfaces

* read_profile
* update_profile
* list_services
* set_service_rules
* set_schedule
* check_availability
* create_booking
* create_payment_request
* list_leads
* get_customer_timeline
* request_callback
* review_affiliate_activity
* approve_payout

### Critical evals

* can configure a viable practice without admin confusion
* can convert a lead into booking + payment
* can view referral source deterministically
* cannot accidentally double-book
* ambiguous lead routes to HITL correctly

---

## 2) Small Service Business Owner

### Description

A local operator or microbusiness owner (dog care, cleaning, mobile service, repair, wellness, tutoring, etc.) using the same system but with simpler operational needs.

### Primary needs

* fast lead capture
* appointment scheduling
* service-area rules
* deposits or prepayment
* text/email confirmations
* urgent callback requests
* easy referral links / QR

### Pain points

* limited tech literacy
* inconsistent follow-up
* limited time
* phone tag
* poor local marketing attribution

### Core interactions

* receives local leads from cards, QR, flyers, referrals
* books time slots based on simple constraints
* collects deposit
* triggers callback when lead is urgent or unclear
* tracks which affiliate/source brought the lead

### Required MCP tool surfaces

* set_service_area
* set_basic_schedule
* create_simple_booking
* create_deposit_link
* send_confirmation
* trigger_urgent_callback
* get_referral_source
* issue_qr_asset

### Critical evals

* simple service owner can finish setup with minimal fields
* out-of-area leads are blocked or routed properly
* urgent leads escalate correctly
* payment + booking remain consistent after cancellations

---

## 3) Apprentice

### Description

A free, approved entry-level Studio Ordo member. Learns, attends events, distributes cards, gathers intelligence, refers users, and builds early portfolio work.

### Primary needs

* identity and legitimacy
* personal site / profile
* QR-coded card
* affiliate code
* Discord/community access
* clear tasking
* event-reporting workflow
* advancement path

### Pain points

* low initial credibility
* uncertainty about what to do at events
* unclear quality standards
* inconsistent follow-through

### Core interactions

* applies and is approved/rejected
* receives apprentice role and starter assets
* gets QR + referral identity
* attends events and submits reports
* refers prospects to courses/products/services
* showcases projects
* accumulates reputation signals

### Required MCP tool surfaces

* apply_for_apprenticeship
* review_apprentice_application
* activate_member_profile
* issue_affiliate_code
* generate_card_payload
* submit_event_report
* submit_lead_referral
* list_assigned_tasks
* view_rank_requirements

### Critical evals

* only approved users gain apprentice privileges
* event report submissions are structured and attributable
* affiliate attribution persists across referral-to-purchase flow
* apprentice cannot overstate role / access restricted actions

---

## 4) Associate

### Description

A more trusted operator who has completed some training, demonstrated reliability, and may handle scoped work or stronger referral responsibilities.

### Primary needs

* more visibility
* more trusted lead routing
* better analytics
* small project assignment
* clearer revenue participation

### Pain points

* needs differentiation from apprentice
* needs reliable assignment logic
* needs transparent compensation rules

### Core interactions

* receives qualified tasks
* may assist with client work
* submits deliverables / notes
* earns referral + possibly delivery compensation
* moves toward certification

### Required MCP tool surfaces

* list_eligible_assignments
* accept_assignment
* submit_work_update
* view_compensation_breakdown
* escalate_issue
* request_review_for_promotion

### Critical evals

* role boundaries are enforced
* can accept only valid assignments
* referral compensation is separated from service compensation
* escalation works without breaking audit trail

---

## 5) Certified Consultant

### Description

A trusted, higher-tier operator approved to deliver real client-facing work under Studio Ordo standards.

### Primary needs

* authority
* client delivery surfaces
* assignment clarity
* trust signals
* stronger CRM access for owned work
* clear revenue accounting

### Pain points

* must protect brand quality
* must avoid ambiguous ownership of leads
* must distinguish personal practice vs Studio-assigned work

### Core interactions

* receives or claims approved project assignments
* manages client interactions within policy
* contributes case studies / showcases
* may mentor apprentices
* may refer and deliver simultaneously under explicit rules

### Required MCP tool surfaces

* view_assigned_clients
* update_client_status
* record_decision_note
* attach_deliverable
* mentor_member
* propose_case_study
* close_engagement

### Critical evals

* can only access authorized client records
* client state transitions are valid and auditable
* mentorship actions do not leak permissions
* project closure updates finance + CRM state coherently

---

## 6) Studio Director / Maestro

### Description

The brand authority and decision-maker. Oversees standards, content voice, approvals, assignments, rank changes, and sensitive escalations.

### Primary needs

* full operational visibility
* approval queues
* assignment control
* editorial control
* reputation management
* promotion / demotion controls
* human override authority

### Pain points

* information overload
* weak governance causes chaos
* poor source quality damages trust
* unclear approvals create disputes

### Core interactions

* approves apprentices
* reviews payouts
* assigns projects
* approves promotions
* reviews content pipeline
* escalates to calls
* sets system policy defaults

### Required MCP tool surfaces

* view_global_dashboard
* review_pending_approvals
* approve_or_reject_member
* assign_project
* review_payout_queue
* publish_news_item
* promote_or_demote_member
* override_policy_exception

### Critical evals

* all sensitive actions require explicit director-level authority
* override path is logged and reasoned
* approvals are idempotent and auditable
* content publication respects source / review policy

---

## 7) Affiliate Referrer

### Description

A person who may or may not be a formal Studio member but can refer customers through a QR code or tracked link.

### Primary needs

* easy tracked link
* QR asset
* transparent earnings
* payout clarity
* low-friction sharing

### Pain points

* distrust of attribution
* lack of clarity on pending vs paid
* limited insight into why commissions were denied or reversed

### Core interactions

* shares link or QR
* sees clicks/leads/conversions
* sees pending commissions
* requests / receives payouts if eligible

### Required MCP tool surfaces

* get_affiliate_link
* get_affiliate_qr
* get_affiliate_stats
* list_pending_commissions
* request_payout
* view_commission_policy

### Critical evals

* attribution is deterministic
* self-referral abuse is detected or blocked
* refunds reverse commission state properly
* payout eligibility rules are consistent

---

## 8) Course Buyer / Academy Learner

### Description

A user buying classes, workshops, or educational products, possibly entering the system before becoming an apprentice.

### Primary needs

* understand offerings clearly
* register and pay simply
* receive confirmations
* access course materials / onboarding
* optionally transition into guild roles

### Pain points

* confusion between training and consulting
* unclear next steps after purchase
* missing referral attribution

### Core interactions

* browses offers
* purchases a class
* receives transactional email
* enters onboarding flow
* may later apply to become apprentice

### Required MCP tool surfaces

* list_courses
* get_course_details
* enroll_in_course
* create_checkout
* send_enrollment_confirmation
* start_onboarding
* apply_for_apprenticeship

### Critical evals

* training purchase path is clean and separate from service purchase path
* referral is preserved at checkout
* post-purchase onboarding is deterministic
* learner can transition to applicant without data loss

---

## 9) Media Subscriber / Audience Member

### Description

A reader/viewer consuming the newsletter, podcast, and show. They may become a customer, learner, or affiliate later.

### Primary needs

* valuable signal
* easy subscription
* clear CTA paths
* trust in editorial quality
* relevant product demos

### Pain points

* generic AI news fatigue
* low signal-to-noise
* unclear why the content matters

### Core interactions

* subscribes
* consumes newsletter / show
* clicks through to offers, demos, or events
* may convert to customer, learner, or referrer

### Required MCP tool surfaces

* subscribe_to_newsletter
* manage_subscription
* list_recent_issues
* view_featured_demos
* capture_content_interest
* convert_subscriber_to_lead

### Critical evals

* subscriber journey is low-friction
* clickthrough attribution persists
* editorial content and sales CTAs are linked but not conflated
* unsubscribe and preferences work correctly

---

## 10) Hiring Client / Studio Service Buyer

### Description

A company or individual seeking direct Studio Ordo consulting, training, implementation, or a trusted operator.

### Primary needs

* trust
* clear offer framing
* rapid response
* qualification
* scheduling
* clear ownership of engagement

### Pain points

* not sure whether they are buying a class, a consultant, or software
* slow response kills deal momentum
* wants a real human when stakes are high

### Core interactions

* arrives via direct, referral, or content
* submits inquiry
* gets qualified by system
* receives call scheduling or callback
* may be assigned to Studio, consultant, or academy path

### Required MCP tool surfaces

* create_service_inquiry
* qualify_lead
* propose_next_best_path
* create_consultation_booking
* trigger_priority_callback
* assign_engagement_owner

### Critical evals

* enterprise/high-value lead gets priority treatment
* lead is routed to correct business lane
* no ambiguous ownership after assignment
* human escalation occurs when confidence is low

---

## Canonical interaction map

These are the main journeys the system must support.

### Journey A: Event-to-lead

* apprentice attends event
* presents Studio Ordo + newsletter + demos
* prospect scans QR
* system records source, affiliate identity, event context
* prospect becomes subscriber, lead, learner, or customer

### Journey B: Lead-to-booking

* visitor lands on site
* AI/front desk qualifies request
* system checks schedule / rules
* booking created or callback requested
* payment/deposit collected if needed
* confirmations sent
* CRM timeline updated

### Journey C: Referral-to-purchase

* affiliate shares QR/link
* prospect visits tracked path
* purchase occurs
* commission enters pending ledger state
* payout requires policy satisfaction + approval path

### Journey D: Apprentice-to-advancement

* applicant approved
* receives starter assets
* participates in event reporting, referrals, training, demos
* earns signals
* reviewed for promotion to associate/certified

### Journey E: Reporting-to-media

* apprentice submits event report
* system extracts structured signals
* editorial review occurs
* approved items feed newsletter/show
* audience interacts
* some audience converts into leads or buyers

### Journey F: High-value lead escalation

* lead is ambiguous, urgent, or high-intent
* system does not over-automate
* callback within defined SLA or direct manual review
* human takes over
* all actions stay on timeline

---

## Minimum policy rules

These rules must exist in the system and be testable.

* referrals do not equal delivery rights
* rank determines permissions
* apprentice cannot represent themselves as certified
* sensitive actions require explicit approval
* ambiguous or high-stakes cases route to HITL
* all payouts are ledger-backed
* refunds / reversals propagate correctly
* training, software, and consulting lanes remain distinct
* attribution is deterministic and timestamped
* role transitions preserve audit history

---

## MCP tool design requirements

Tools should be grouped by domain, not scattered ad hoc.

### Membership / Identity

* application, approval, rank, card issuance, affiliate identity

### Practice OS

* profile, services, schedule, booking, callback, CRM timeline

### Commerce / Finance

* checkout, deposits, commissions, payout requests, payout approvals, refund propagation

### Media / Reporting

* event report intake, story triage, editorial review, publish controls, demo linking

### Studio Delivery

* inquiries, qualification, assignment, case ownership, work updates, closure

### Governance

* policy reads, approvals, overrides, audit logs, role review

Each tool should expose:

* deterministic input contract
* explicit role authorization
* confidence / uncertainty where applicable
* idempotency strategy for side-effecting actions
* audit receipt or state-change reference

---

## Eval framework

Add evals at three levels.

## 1) Persona coverage evals

For each persona:

* can they complete the core journey?
* do they hit correct guardrails?
* do they see only correct data?
* are outcomes clear and attributable?

## 2) Workflow integrity evals

* booking + payment coherence
* referral + payout coherence
* application + approval coherence
* reporting + publication coherence
* lead routing + assignment coherence

## 3) Policy / abuse evals

* self-referral abuse
* role escalation abuse
* duplicate payout attempts
* double booking
* refund after payout
* lead ownership conflicts
* apprentice trying to access consultant-only tools
* LLM suggesting action outside policy

---

## Canonical eval scenarios

At minimum, implement these.

* apprentice submits an event report and it is stored with attribution
* affiliate referral leads to course purchase and creates pending commission
* refunded purchase reverses eligible commission state
* independent professional configures schedule and receives a valid booking
* ambiguous lead triggers callback instead of auto-book
* high-value service inquiry routes to priority human review
* course buyer purchase path does not leak into consulting workflow
* director approval is required for promotion and payout release
* associate can accept scoped work but cannot access unrelated client records
* subscriber converts from newsletter click to lead with source preserved

---

## Discovery pass the agent must perform before changes

Before implementing anything new, the agent must produce a reconciliation report:

1. existing tools mapped to canonical domains
2. existing routes mapped to canonical journeys
3. existing role model mapped to canonical roles
4. missing tools
5. missing policy checks
6. missing eval coverage
7. duplicate / overlapping surfaces to consolidate

If current implementation diverges from this spec, prefer:

* **rename / normalize**
* **wrap existing logic**
* **add adapters**
  instead of rewriting working surfaces.

---

## Success condition

The system is successful when:

* every major persona has a clean path
* every sensitive action has a human or policy gate
* referrals, bookings, and payouts are trustworthy
* the media flywheel has structured intake
* role advancement is explicit
* the LLM can orchestrate safely because tools and permissions are well-defined

Build for institutional clarity, not just feature accumulation.
