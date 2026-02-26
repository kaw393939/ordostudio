# Sprint Maestro-03: Marketing Intelligence — UX Notes

*This sprint has no new UI surfaces. All output surfaces through the existing `/admin/chat` page.*

---

## New conversational patterns enabled

### Weekly ops brief
The Maestro can now ask "What happened this week?" and get a single synthesized response covering all four dimensions:

```
Ops Agent

Here's your week in review (last 7 days):

**Funnel**
4 new intakes came in. 2 were triaged, 1 is now qualified.
No new bookings this week.

**What prospects are asking about**
Top searches hitting the intake agent:
  1. "pricing" — 6 times
  2. "maestro training requirements" — 3 times
  3. "guild hierarchy" — 2 times

This suggests interest in cost and prerequisites. Consider updating
the knowledge base with more explicit pricing context.

**Contacts**
8 contacts in the system. 5 are ACTIVE, 2 QUALIFIED, 1 still NEW.

**Activity**
4 NewIntakeRequest events, 1 RoleApproved, 1 ContentSearch (from Maestro).
```

### Funnel velocity
```
How long does it usually take to qualify someone?

For the last 90 days (12 intakes):
  Median time NEW → QUALIFIED: 18.5 hours
  75th percentile: 42 hours

A few intakes took more than 2 days — typically the ones where
contact info was missing and required a follow-up.
```

---

## `get_ops_brief` output rendering

The `get_ops_brief` tool returns raw counts. Claude synthesizes it into prose. The assistant response is markdown — rendered in the existing chat UI with `react-markdown`.

No new UI components required. The existing `OpsChat` markdown rendering handles bold, bullet lists, and code blocks.

---

## Content search insights → knowledge base action

When `get_content_search_log` reveals that prospects keep searching for something and finding few results, the Maestro can act on it:
- They can note the gap and update the content knowledge base manually
- Future sprint: a "Suggest content update" tool that drafts a knowledge base entry based on the top unanswered queries

This is out of scope for Maestro-03 but the data foundation is laid here.
