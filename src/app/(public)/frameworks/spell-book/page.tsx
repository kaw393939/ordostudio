"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";

type Theme = "Architecture" | "Reliability" | "Data" | "AI Systems" | "Business & Leadership";

type Term = {
  name: string;
  definition: string;
  theme: Theme;
};

const terms: Term[] = [
  /* ── Architecture ─────────────────────────── */
  { name: "Twelve-Factor App", definition: "Twelve principles for building SaaS applications (codebase, dependencies, config, backing services, build/release/run, processes, port binding, concurrency, disposability, dev/prod parity, logs, admin processes).", theme: "Architecture" },
  { name: "SOLID", definition: "Five principles of OO design: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.", theme: "Architecture" },
  { name: "Conway\u2019s Law", definition: "Organizations design systems that mirror their communication structures.", theme: "Architecture" },
  { name: "Separation of Concerns", definition: "Each module or layer handles one responsibility. Presentation \u2260 business logic \u2260 data access.", theme: "Architecture" },
  { name: "MVC", definition: "Model-View-Controller \u2014 separates data (Model), presentation (View), and logic (Controller).", theme: "Architecture" },
  { name: "Coupling / Cohesion", definition: "Coupling: how much one module depends on another. Cohesion: how closely related responsibilities within a module are. Good design = low coupling, high cohesion.", theme: "Architecture" },
  { name: "REST", definition: "Representational State Transfer \u2014 architectural style using standard HTTP methods and resource-based URLs.", theme: "Architecture" },
  { name: "Infrastructure as Code", definition: "Managing servers, networks, services through machine-readable config files rather than manual processes.", theme: "Architecture" },
  { name: "Emergent Behavior", definition: "System-level properties that arise from component interactions but are not visible in any individual component.", theme: "Architecture" },
  { name: "Defense in Depth", definition: "Security strategy using multiple independent layers of protection.", theme: "Architecture" },

  /* ── Reliability ──────────────────────────── */
  { name: "Error Budget", definition: "Acceptable downtime/failure in a period, derived from SLA. 99.9% SLA = 43.8 min/month error budget.", theme: "Reliability" },
  { name: "Blameless Postmortem", definition: "Structured incident review focused on systemic causes, not individual fault.", theme: "Reliability" },
  { name: "Circuit Breaker", definition: "Pattern that stops calling a failing service after repeated errors, preventing cascade failures.", theme: "Reliability" },
  { name: "MTTR", definition: "Mean Time to Recovery \u2014 average time from incident detection to resolution.", theme: "Reliability" },
  { name: "Runbook", definition: "Documented procedure for handling a specific operational scenario.", theme: "Reliability" },
  { name: "Observability", definition: "Understanding a system\u2019s internal state from external outputs \u2014 logs, metrics, traces.", theme: "Reliability" },
  { name: "SLA / SLO / SLI", definition: "Service Level Agreement (contract), Objective (target), Indicator (measurement).", theme: "Reliability" },
  { name: "Incident Severity", definition: "Classification system (Sev 1\u20134) for prioritizing incident response by business impact.", theme: "Reliability" },

  /* ── Data ──────────────────────────────────── */
  { name: "ACID", definition: "Atomicity, Consistency, Isolation, Durability \u2014 four guarantees of reliable database transactions.", theme: "Data" },
  { name: "CAP Theorem", definition: "Distributed system can provide at most 2 of 3: Consistency, Availability, Partition tolerance.", theme: "Data" },
  { name: "Normalization", definition: "Organizing data to reduce redundancy (1NF, 2NF, 3NF). Denormalization is intentional reversal for performance.", theme: "Data" },
  { name: "SQL Injection", definition: "Attack exploiting unsanitized user input to execute malicious SQL.", theme: "Data" },
  { name: "Knowledge Graph", definition: "Data structure representing entities and relationships as nodes and edges, enabling traversal and inference.", theme: "Data" },
  { name: "Vector Embedding", definition: "Numerical representation of data in high-dimensional space where similar items cluster together.", theme: "Data" },
  { name: "Cosine Similarity", definition: "Similarity measure between two vectors based on angle, regardless of magnitude.", theme: "Data" },
  { name: "Hybrid Retrieval", definition: "Combining keyword search (exact match) with semantic search (vector similarity).", theme: "Data" },

  /* ── AI Systems ───────────────────────────── */
  { name: "RAG", definition: "Retrieval-Augmented Generation \u2014 feeding relevant context from a knowledge base into an LLM to ground responses in facts.", theme: "AI Systems" },
  { name: "Human-in-the-Loop (HITL)", definition: "Workflow design where human judgment is required at specific decision points.", theme: "AI Systems" },
  { name: "Prompt Injection", definition: "Attack where malicious input manipulates an AI system into ignoring instructions or revealing info.", theme: "AI Systems" },
  { name: "Evaluation Harness", definition: "Test suite for measuring AI system quality \u2014 accuracy, relevance, safety, cost, latency.", theme: "AI Systems" },
  { name: "Regression Gate", definition: "Checkpoint preventing deployment if new model/prompt performs worse than current version.", theme: "AI Systems" },
  { name: "Model Extraction", definition: "Attack using AI outputs to reverse-engineer the underlying model.", theme: "AI Systems" },
  { name: "Stochastic Parrot", definition: "Term (Bender et al., 2021) for AI systems that generate plausible text without understanding meaning.", theme: "AI Systems" },
  { name: "Andon Cord", definition: "Mechanism (from Toyota) allowing anyone to stop production when they detect a quality problem.", theme: "AI Systems" },

  /* ── Business & Leadership ────────────────── */
  { name: "ROI", definition: "Return on Investment \u2014 ratio of net benefit to cost.", theme: "Business & Leadership" },
  { name: "TCO", definition: "Total Cost of Ownership \u2014 full cost over lifetime including maintenance, training, incidents, replacement.", theme: "Business & Leadership" },
  { name: "Jobs to Be Done", definition: "Framework (Christensen) for understanding what users are actually trying to accomplish.", theme: "Business & Leadership" },
  { name: "Fermi Estimation", definition: "Making reasonable approximate calculations with limited data.", theme: "Business & Leadership" },
  { name: "Brooks\u2019s Law", definition: "\u201cAdding people to a late software project makes it later.\u201d", theme: "Business & Leadership" },
  { name: "No Silver Bullet", definition: "Brooks\u2019s argument that no single technology delivers order-of-magnitude productivity improvements.", theme: "Business & Leadership" },
  { name: "Second-System Effect", definition: "Tendency to over-engineer the second version with all features cut from the first.", theme: "Business & Leadership" },
  { name: "Cognitive Load", definition: "Mental effort required to understand or use something (Sweller, 1988). Types: intrinsic, extraneous, germane.", theme: "Business & Leadership" },
];

const allThemes: Theme[] = [
  "Architecture",
  "Reliability",
  "Data",
  "AI Systems",
  "Business & Leadership",
];

const themeColors: Record<Theme, string> = {
  Architecture: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Reliability: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Data: "bg-green-500/10 text-green-700 dark:text-green-300",
  "AI Systems": "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  "Business & Leadership": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export default function SpellBookFrameworkPage() {
  const [search, setSearch] = useState("");
  const [activeTheme, setActiveTheme] = useState<Theme | "ALL">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return terms.filter((t) => {
      if (activeTheme !== "ALL" && t.theme !== activeTheme) return false;
      if (q.length === 0) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q)
      );
    });
  }, [search, activeTheme]);

  return (
    <PageShell
      title="The Spell Book"
      subtitle="42 professional terms every AI-era engineer must know. A shared vocabulary that separates informed practitioners from prompt-and-pray operators."
      breadcrumbs={[
        { label: "Frameworks", href: "/frameworks" },
        { label: "Spell Book" },
      ]}
    >
      {/* Search + theme filters */}
      <div className="space-y-3">
        <Input
          placeholder="Search terms\u2026"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTheme("ALL")}
            className={`rounded-full px-3 py-1 type-meta transition-colors ${
              activeTheme === "ALL"
                ? "bg-action-primary text-text-inverse"
                : "border border-border-default text-text-secondary hover:border-action-primary"
            }`}
          >
            All ({terms.length})
          </button>
          {allThemes.map((theme) => {
            const count = terms.filter((t) => t.theme === theme).length;
            return (
              <button
                key={theme}
                type="button"
                onClick={() => setActiveTheme(theme === activeTheme ? "ALL" : theme)}
                className={`rounded-full px-3 py-1 type-meta transition-colors ${
                  activeTheme === theme
                    ? "bg-action-primary text-text-inverse"
                    : "border border-border-default text-text-secondary hover:border-action-primary"
                }`}
              >
                {theme} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <p className="mt-3 type-meta text-text-muted">
        {filtered.length} {filtered.length === 1 ? "term" : "terms"}
        {search ? ` matching \u201c${search}\u201d` : ""}
        {activeTheme !== "ALL" ? ` in ${activeTheme}` : ""}
      </p>

      {/* Term list */}
      <div className="mt-3 space-y-2">
        {filtered.map((term) => (
          <button
            key={term.name}
            type="button"
            onClick={() =>
              setExpanded(expanded === term.name ? null : term.name)
            }
            className="block w-full text-left rounded-lg border border-border-default p-3 transition-colors hover:border-action-primary/40"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block rounded-full px-2 py-0.5 type-meta ${themeColors[term.theme]}`}>
                {term.theme}
              </span>
              <span className="type-label">{term.name}</span>
            </div>
            {expanded === term.name ? (
              <p className="mt-2 type-body-sm text-text-secondary">
                {term.definition}
              </p>
            ) : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-4 p-4 text-center">
          <p className="type-body-sm text-text-muted">
            No terms match your search. Try a different query.
          </p>
        </Card>
      ) : null}

      {/* CTA */}
      <Card className="mt-6 p-4 text-center">
        <p className="type-body-sm text-text-secondary">
          Want the complete Spell Book with historical context and workshop connections?
        </p>
        <Link
          href="/resources/spell-book"
          className="mt-2 inline-block rounded-md bg-action-primary px-4 py-2 type-label text-text-inverse"
        >
          Get the full Spell Book PDF \u2192
        </Link>
      </Card>
    </PageShell>
  );
}
