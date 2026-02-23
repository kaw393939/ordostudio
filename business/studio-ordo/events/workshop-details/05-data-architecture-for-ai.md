# Workshop 5: Data Architecture for AI

## Overview

| Field | Value |
|-------|-------|
| **Duration** | Full-day (6 hours) |
| **Audience** | Data engineers, backend engineers, AI engineers |
| **Human Edge** | Epistemic Humility |
| **Prerequisites** | Basic SQL knowledge, familiarity with databases |
| **Max participants** | 16 |
| **Offer tier** | Offer 2 (developer accelerator) |

## Learning Objectives

By the end of this workshop, participants will be able to:
1. Design relational schemas with explicit normalization reasoning
2. Model domain relationships as a knowledge graph
3. Implement vector embeddings for semantic search
4. Build a hybrid retrieval system combining SQL, graph, and vector search
5. Write a Data Assumptions Document that names what the data captures and what it misses
6. Apply CAP theorem reasoning to distributed data architecture decisions

## Agenda

### Morning — Building the Substrate (40%)

| Time | Block | Format | Description |
|------|-------|--------|-------------|
| 0:00–0:20 | Data Is Not Truth | Presentation | Why epistemic humility matters. Data represents *someone's* model of reality — not reality itself. Every schema has assumptions. |
| 0:20–1:00 | SQL by Hand | Hands-on | Write queries manually for a provided dataset. Normalize to 3NF. Identify what the schema captures and what it misses. No AI. |
| 1:00–1:30 | Graph Modeling | Exercise | Model the same domain as a knowledge graph. Map entities and relationships. Compare: what does the graph reveal that the table structure hides? |
| 1:30–1:45 | Break | — | — |
| 1:45–2:30 | Vector Embeddings | Presentation + exercise | What embeddings are. How cosine similarity works. What "semantic space" means — and where it distorts. Generate embeddings for sample data. |
| 2:30–3:00 | Lunch | — | — |

### Afternoon — Practicing the Real Workflow (60%)

| Time | Block | Format | Description |
|------|-------|--------|-------------|
| 3:00–3:45 | Hybrid Retrieval Build | AI-directed | Using AI tools with Context Pack methodology, build a prototype combining SQL queries, graph traversal, and vector search for a single domain. |
| 3:45–4:15 | CAP Theorem Discussion | Structured debate | Given a real architecture scenario, teams argue for different CAP tradeoffs. No right answer — the point is honest reasoning about limitations. |
| 4:15–4:30 | Break | — | — |
| 4:30–5:15 | Data Assumptions Document | Exercise | For the prototype built earlier, write a Data Assumptions Document: what the data captures, what it misses, known biases, representation choices, and limitations. |
| 5:15–5:45 | Review + Critique | Group | Teams present their hybrid architectures and assumptions documents. Peer feedback focused on: what assumptions did you miss? |
| 5:45–6:00 | Wrap-up | Presentation | Spell Book review. The "Bobby Tables" reminder. When to denormalize. |

## Materials

- SQL exercise dataset (pre-loaded database)
- Graph modeling template
- Vector embedding demonstration notebook
- Hybrid retrieval starter code
- Data Assumptions Document template
- CAP theorem decision matrix
- Spell Book handout: Relational model, ACID, normalization, SQL injection, CAP theorem, knowledge graph, vector embedding, cosine similarity, hybrid retrieval, semantic search, denormalization

## Artifact Produced

- Normalized SQL schema with reasoning documentation
- Knowledge graph model of the same domain
- Working hybrid retrieval prototype
- Data Assumptions Document — what the data captures, what it misses, known biases

## FAQ

**"I already know SQL. Is this remedial?"**
The SQL portion is 40 minutes. The rest covers graph databases, vector embeddings, and hybrid architectures. The Data Assumptions Document is the novel artifact — most teams have never written one.

**"Do we need our own data?"**
We provide a dataset. If you bring your own domain data, the artifacts will be more immediately useful.
