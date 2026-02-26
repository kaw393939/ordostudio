# Sprint 39: Workflow Routing Engine — UX Design

## `/admin/workflows` — Rule List

```
  Workflow Rules                           [+ New Rule]

  ┌────────────────────────────────────────────────────────────────┐
  │ Name                      Trigger         Action      Enabled  │
  ├────────────────────────────────────────────────────────────────┤
  │ Assign intake on submit   intake.submitt  ASSIGN_TO   [●] ON   │
  │ Intake confirm email      intake.submitt  SEND_EMAIL  [●] ON   │
  │ Mark QUALIFIED on approv  role_req.appro  UPDATE_CON  [○] OFF  │
  │ 3-day follow-up           intake.submitt  CREATE_FEE  [○] OFF  │
  │ Welcome email on provisi  onboarding.acc  SEND_EMAIL  [●] ON   │
  └────────────────────────────────────────────────────────────────┘
```

## Rule Form

Fields:
1. Name
2. Description (optional)
3. Trigger event (dropdown of known types)
4. Condition (optional: field / operator / value)
5. Action type (dropdown: 4 types)
6. Action config (rendered per type)
7. Enabled (toggle)

## Executions Log

```
  Rule                    Event             Status    Executed
  Assign intake on sub    intake.submitted  SUCCESS   2m ago
  Intake confirm email    intake.submitted  SUCCESS   2m ago
  Mark QUALIFIED on app   role_req.approv   SKIPPED   5m ago   [condition not met]
```
