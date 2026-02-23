# Usability Findings — Round 01 (2026-02-21)

## Round
- Date: 2026-02-21
- Moderator: Internal
- Participants (5): Mixed technical audience

## Summary
- Overall success rate: Partial (users can complete tasks, but CTAs compete)
- Top 3 issues:
  1) Home hero has two CTAs with unclear priority (Major)
  2) Services page track order preference varies by user goal (Minor)
  3) Consult request form: users delay starting due to uncertainty about required fields (Major)

## Trunk test notes
- Site understanding: “AI delivery training” and “apprenticeship” were understood.
- Next action expectation: most users wanted a single obvious primary CTA.

## First click results
| Prompt | First click | Confidence (1-5) | Time | Notes |
|---|---|---:|---:|---|
| See training available | View training tracks | 4 | 2s | Clear.
| Talk before buying | Book a technical consult | 3 | 4s | Some hesitated.
| Understand Ordo method | Method section | 3 | 5s | Users scrolled.

## Task results
| Task | Success (Y/Partial/N) | Time | Notes |
|---|---|---:|---|
| Find training | Y | 35s | Users succeeded.
| Start consult request | Partial | 50s | Some uncertainty about required fields.
| Submit consult request | Y | 2m10s | Validation helped.

## Findings

### F-01
- Severity: Major
- Observation: Home hero CTAs compete; users wanted one “primary” action.
- Likely cause: visual weight parity.
- Proposed fix: Experiment with consult CTA as primary vs training CTA as primary.
- Success metric impact: increase consult request form starts and submissions.

### F-02
- Severity: Minor
- Observation: Services track order preference varies (some seek advisory first).
- Likely cause: default ordering assumes linear learning.
- Proposed fix: Experiment with alternative card ordering.
- Success metric impact: increase service detail views and consult clicks.

### F-03
- Severity: Major
- Observation: Users delay interacting with consult request form.
- Likely cause: uncertainty on required fields.
- Proposed fix: Track “form start” on first focus and use measurement funnel to spot drop-off.
- Success metric impact: improve start→submit conversion.

## Next actions
- Fix #1: Run experiments for hero CTA priority + copy variants.
- Fix #2: Use measurement dashboard funnel for consult flow.
- Fix #3: Iterate on consult request form clarity.
