# Sprint IP-05 — Newsletter Content Engine (12 Issues from BSEAI Research)

## Goal
Mine the BSEAI research archive — acceleration data, salary research, industry voices, peer program analysis, historical figures, and philosophical essays — into 12 pre-written Ordo Brief newsletter issues.

## Why This Sprint
The LMS has a full newsletter system (issues, blocks structured as Models/Money/People/From the Field/Next Steps, subscriber management, send runs). But content creation is the bottleneck. The BSEAI project contains a year's worth of deeply researched material. This sprint converts it into ready-to-publish newsletter content.

## Source Material (from /Users/kwilliams/Projects/bseai)
- `src/content/docs/evidence/why-now.md` — METR data, benchmark saturation, capital deployment
- `src/content/docs/evidence/job-market.md` — BLS projections, salary data, demand paradox
- `src/content/docs/evidence/industry-voices.md` — CEO quotes, hiring manager themes, academic voices
- `src/content/docs/evidence/higher-ed-landscape.md` — peer program gap analysis, competitive matrix
- `src/content/docs/philosophy/acceleration-thesis.md` — Broadway analogy, doubling times
- `src/content/docs/philosophy/stripping-thesis.md` — what AI strips away
- `src/content/docs/philosophy/new-paradigm.md` — old vs. new paradigm, productivity imperative
- `src/content/docs/philosophy/letter-from-the-ai.md` — Claude's case for human judgment
- `src/content/docs/careers/` — role descriptions, salary maps, skills mapping
- `src/content/docs/syllabi/` — historical figure profiles (50+ people)
- `incoming_info/something_big.md` — the Matt Shumer urgency essay (framework, not to copy)
- `keith/me.txt` — "Second Renaissance" essay, Swiss Design case study

## Deliverables

### `business/studio-ordo/newsletter/issue-backlog.md`
12 pre-structured newsletter issues, each in the Ordo Brief format:
- **Models** section (AI capability update)
- **Money** section (market/salary/business data)
- **People** section (profile or quote)
- **From the Field** section (practical insight or case study)
- **Next Steps** section (one actionable thing for the reader)

#### Issue 1: "The Acceleration Is Real"
- Models: METR capability doubling (7mo → 4.3mo → 2.9mo), SWE-bench 1.96%→81.42%
- Money: $600B+ hyperscaler capex 2026, traditional dev postings -51%
- People: Dario Amodei — "6–12 months from models doing most SWE end-to-end"
- From the Field: The Broadway 1900→1913 analogy — no physical infrastructure barrier
- Next Steps: Try the latest model on your hardest current task this week

#### Issue 2: "The Salary Premium Is Now"
- Models: Which AI skills command the biggest premium (+25–50% for LLM integration)
- Money: Entry $110K–$150K, mid $150K–$220K, senior $180K–$350K+ — BLS sourced
- People: NYC is #1 AI market — 5,201 openings, +87% YoY
- From the Field: The "only 48% of AI projects reach production" problem
- Next Steps: Audit your team's AI skills against the 5 target roles

#### Issue 3: "What AI Strips Away"
- Models: Benchmark saturation — MMLU, GPQA, MATH approaching ceiling
- Money: Skill half-life collapse — procedural skills now months, not decades
- People: Profile of Claude Shannon — information theory and why vocabulary matters
- From the Field: The Stripping Thesis — what was never truly human about your work
- Next Steps: List 3 tasks you do that are purely procedural. Now ask: what's left?

#### Issue 4: "The CEO of Agents"
- Models: Context Packs as the meta-skill — 4 components that direct any AI system
- Money: Productivity data — MIT RCT +40% faster, +18% quality, biggest gains for beginners
- People: Profile of Ada Lovelace — the first programmer understood machines need human direction
- From the Field: A Context Pack example for a real engineering task
- Next Steps: Build your first Context Pack for a current project (template attached)

#### Issue 5: "Professional Vocabulary as Competitive Advantage"
- Models: Token economics — 1 named concept = 50 words of explanation (Shannon compression)
- Money: Why the person who says "error budget" gets promoted over the one who says "how much downtime is OK"
- People: Profile of Tim Berners-Lee — how naming things (URL, HTML, HTTP) changed everything
- From the Field: The Spell Book concept — 10 terms that signal engineering maturity
- Next Steps: Learn 3 terms from the Spell Book this week and use them in a meeting

#### Issue 6: "Judgment Is the Bottleneck"
- Models: METR finding — experienced devs 19% SLOWER with AI tools (they couldn't evaluate output)
- Money: Only 29% of orgs have deployed GenAI in production, <16% scaling
- People: Profile of Geoffrey Hinton — the inventor who questions his own creation
- From the Field: The AI Audit Log — a practice for building evaluation muscle
- Next Steps: Keep an AI Audit Log for one week. Document what you accept and reject.

#### Issue 7: "The 40/60 Question"
- Models: When to hand-code vs. delegate to AI — the judgment framework
- Money: How the ratio affects team velocity (data from implementation)
- People: Profile of Kent Beck — test-driven development and "make it work, make it right, make it fast"
- From the Field: A team's 40/60 session walkthrough: 45 min hard-way → 75 min agentic → 15 min debrief
- Next Steps: Run one 40/60 session with your team this sprint

#### Issue 8: "Design for Failure"
- Models: The 12-Factor App in the AI era — what changes, what doesn't
- Money: The cost of outages — error budgets as business decisions
- People: Profile of Margaret Hamilton — who coined "software engineering" during Apollo
- From the Field: How to run an incident drill (the "professor breaks your system" exercise)
- Next Steps: Schedule an incident drill for your team in the next 2 weeks

#### Issue 9: "Data Is Not Truth"
- Models: How RAG systems fail — retrieval quality, chunk strategy, embedding drift
- Money: The graph + vector + SQL hybrid stack — why you need all three
- People: Profile of Edgar Codd — the relational model and the discipline of normalization
- From the Field: Data Assumptions Document template — what your data represents and what it misses
- Next Steps: Write a Data Assumptions Document for your primary data source

#### Issue 10: "The Second Renaissance"
- Models: AI as printing press — recombining all human knowledge
- Money: $38.5T federal debt → productivity imperative → AI education not optional
- People: Profile of Gutenberg to GPT — how knowledge distribution technology changes civilization
- From the Field: Keith's 10-hour Swiss design build — what one person + AI can ship in a day
- Next Steps: Pick one project you've been procrastinating on. Try building it in a day with AI.

#### Issue 11: "Ship & Present"
- Models: Why Demo Day format works — structured evaluation over "best demo wins"
- Money: The stakeholder presentation as career accelerator
- People: Profile of Donella Meadows — systems thinking and seeing the whole picture
- From the Field: Demo Day rubric — Technical depth / Communication / Evidence of evaluation / Impact
- Next Steps: Use the Demo Day rubric for your next project review

#### Issue 12: "What Remains"
- Models: The 8 Human Edge capabilities — comprehensive overview
- Money: Why these skills command premium salaries
- People: Profile of Richard Feynman — "what I cannot create, I do not understand"
- From the Field: A year of lessons — the most important insight per issue
- Next Steps: Take the Human Edge self-assessment — where are you strongest? Where's the gap?

## Adaptation Rules
- Every statistic cites its source
- Anti-hype tone — data and evidence, not breathlessness
- Each issue stands alone but builds on prior issues
- Always end with one concrete, actionable "Next Steps"
- Historical figure profiles: 100–150 words, one story, one lesson

## Acceptance Criteria
- [ ] 12 issues outlined with all 5 sections each
- [ ] Each issue has a clear theme that maps to BSEAI IP
- [ ] Statistics are sourced and cited
- [ ] Historical figure profiles are written, not just named
- [ ] Every issue includes an actionable "Next Steps"
- [ ] Content matches Ordo Brief newsletter structure (Models/Money/People/Field/Next Steps)
- [ ] Anti-hype voice maintained throughout

## Exit Gate
Backlog is ready to feed into the newsletter system without additional research.
