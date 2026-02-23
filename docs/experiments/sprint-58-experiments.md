# Sprint 58 — Experiment Registry

## EXP_HOME_HERO_COPY_V2
- Hypothesis: a clearer headline/subhead improves understanding and increases CTA clicks.
- Success metric: increase `CTA_CLICK_VIEW_TRAINING_TRACKS` + `CTA_CLICK_BOOK_TECHNICAL_CONSULT` per `PAGE_VIEW_HOME`.
- Start date: 2026-02-21
- End date: 2026-03-07
- Rollback rule: if consult form submit rate drops vs baseline, disable.

## EXP_HOME_PRIMARY_CTA_CONSULT
- Hypothesis: making consult the primary CTA increases consult funnel completion.
- Success metric: increase `FORM_START_CONSULT_REQUEST` and `FORM_SUBMIT_CONSULT_REQUEST_SUCCESS` per `PAGE_VIEW_SERVICES_REQUEST`.
- Start date: 2026-02-21
- End date: 2026-03-07
- Rollback rule: if consult starts increase but submits decrease (worse completion), disable.

## EXP_SERVICES_CARD_ORDER_ALT
- Hypothesis: alternative track ordering increases engagement for users seeking advisory first.
- Success metric: increase `PAGE_VIEW_SERVICE_DETAIL` and `CTA_CLICK_BOOK_TECHNICAL_CONSULT` per `PAGE_VIEW_SERVICES`.
- Start date: 2026-02-21
- End date: 2026-03-07
- Rollback rule: if consult clicks per services view drops, disable.
