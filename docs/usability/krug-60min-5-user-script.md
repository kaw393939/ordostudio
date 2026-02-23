# Krug-Style Usability Test Script (60 minutes, 5 users)

## Purpose
Run a lightweight, repeatable usability test to identify the top friction points in the public conversion flow and prioritize fixes.

## Participants
- 5 users per round
- Target mix: 2 engineering leaders, 2 individual engineers, 1 “adjacent” technical role

## Session format (60 minutes)
- 0–5m: Welcome + framing
- 5–10m: Trunk test (5 seconds)
- 10–20m: First click tests
- 20–50m: Task scenarios (success/failure scoring)
- 50–60m: Wrap-up + “what would you change?”

## Moderator rules
- Do not teach. Do not lead.
- Ask: “What do you expect will happen?” then observe.
- If the user is stuck: ask what they would do next.

## Trunk test (5 seconds)
1. Show the homepage for 5 seconds.
2. Hide it.
3. Ask:
   - What is this site?
   - What can you do here?
   - Who is it for?
   - What would you click next?

## First click tests
For each prompt, ask the user to point to the first thing they would click.
- “You want to see what training is available.”
- “You want to talk to someone before buying anything.”
- “You want to understand what ‘the Ordo method’ means.”

Record:
- First click target
- Confidence (1–5)
- Time to first click

## Task scenarios (score success/failure)

### Task 1 — Find training
Prompt: “You’re evaluating training for yourself. Find the training tracks and pick one to learn more.”
Success criteria:
- Reaches `/services`
- Opens a specific track detail

### Task 2 — Start consult request
Prompt: “You want to book a technical consult. Start the request.”
Success criteria:
- Reaches `/services/request`
- Can explain what information is required

### Task 3 — Submit consult request
Prompt: “Submit a consult request using realistic info.”
Success criteria:
- Completes form and sees success panel

### Scoring
For each task:
- Success: Yes / Partial / No
- Time to completion
- Notes on confusion points

## Severity rubric
- Blocker: Prevents completion or causes abandonment
- Major: Completion possible but with high confusion/friction
- Minor: Cosmetic or low-cost confusion

## Output
- Log findings using the template in `docs/usability/findings-template.md`
- Pick top 3 issues and create sprint backlog items
