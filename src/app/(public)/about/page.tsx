import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/primitives/button";
import { buildMetadata, BOOKING_URL } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "About",
  description:
    "A Modern Software Bottega. Built by a teacher. Powered by evidence. 23 years, 10,000+ engineers, and a method that works.",
  canonical: "/about",
});

export default function AboutPage() {
  return (
    <PageShell title="About" subtitle="A Modern Software Bottega. Built by a teacher. Powered by evidence.">
      {/* Section 01 — The Maestro */}
      <section className="surface p-6">
        <p className="type-meta text-text-muted">The Maestro</p>
        <h2 className="mt-2 type-title text-text-primary">Keith Williams</h2>
        <div className="mt-4 space-y-3 type-body-sm text-text-secondary">
          <p>
            Keith Williams has been teaching people to build software since before most of his students were born. He
            wrote his first program in 1983 on a Commodore 64. He&apos;s been writing them ever since.
          </p>
          <p>
            For 23 years, he taught at the New Jersey Institute of Technology &mdash; one of the country&apos;s top
            public research universities. He built the Web Systems concentration that became the foundation for modern
            web development education at NJIT. He designed and launched the Master of Science in Data Science program,
            which has graduated 200+ professionals now working at companies including Amazon, Google, JPMorgan, and
            Goldman Sachs. He created the Bachelor of Science in Enterprise AI &mdash; the first undergraduate program
            of its kind, now with 300+ students enrolled.
          </p>
          <p>
            At Studio Ordo, Keith acts as the Maestro. He sets the architectural vision, defines the &ldquo;Double Stripping&rdquo; thesis, and serves as the final quality gate for all commissions. He does not manage the day-to-day execution of trainees, preserving the strict ethical firewall between his academic role and the commercial guild.
          </p>
        </div>
      </section>

      {/* Section 02 — The Journeyman */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">The Journeyman</p>
        <h2 className="mt-2 type-title text-text-primary">John</h2>
        <div className="mt-4 space-y-3 type-body-sm text-text-secondary">
          <p>
            John is the operational bridge of Studio Ordo. With an MS in Data Science from NJIT, he is an experienced engineer and an early adopter of agentic coding tools, with multiple AI-assisted projects shipped to production.
          </p>
          <p>
            As the Journeyman, John manages the commissions, oversees the agentic output, and directly supervises the Apprentices. He ensures that the Maestro&apos;s architectural vision is executed flawlessly through the 40/60 split of manual understanding and agentic execution.
          </p>
        </div>
      </section>

      {/* Section 03 — The Origin Story */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">The Origin</p>
        <h2 className="mt-2 type-title text-text-primary">What 10,000 graduates taught me.</h2>
        <blockquote className="mt-4 space-y-3 type-body-sm italic text-text-secondary border-l-2 border-border-subtle pl-4">
          <p>
            I&apos;ve watched 10,000 students graduate from my programs. I&apos;ve seen them go to Amazon,
            Google, JPMorgan, Goldman Sachs, and hundreds of companies in between. I know who thrives and who stalls.
          </p>
          <p>
            It&apos;s not the smartest students who succeed. It&apos;s the ones with method.
          </p>
          <p>
            The ones who can write a spec before they write code. The ones who test before they build. The ones who can
            explain what they built and why they built it that way. The ones who ship &mdash; not &lsquo;almost
            done,&rsquo; but deployed, tested, and defended.
          </p>
          <p>
            When AI arrived, I saw the same pattern amplified. The students with method used AI as a force multiplier.
            The students without it used AI as a crutch. The gap widened.
          </p>
          <p>
            I built Studio Ordo to close that gap. Not with certificates or online courses. With the same approach
            that&apos;s worked for centuries: a Bottega where you learn by producing real work under the guidance of
            someone who&apos;s done it 10,000 times.
          </p>
          <p>
            The frameworks aren&apos;t theoretical. They come from watching what actually works &mdash; in classrooms,
            in corporate teams, in international consulting, in startups. Every tool we teach, I&apos;ve used. Every
            failure mode we train for, I&apos;ve seen.
          </p>
          <p>
            I named it Ordo &mdash; Latin for order &mdash; because that&apos;s what&apos;s missing. The AI is here.
            The infrastructure is being built. What&apos;s missing is order: structured methods, professional
            vocabulary, and the discipline to evaluate what machines produce.
          </p>
          <footer className="not-italic type-meta text-text-muted pt-2">
            &mdash; Keith Williams, Founder
          </footer>
        </blockquote>
      </section>

      {/* Section 04 — What We Believe */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">Philosophy</p>
        <h2 className="mt-2 type-title text-text-primary">What we believe.</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="type-label text-text-primary">1. Inquiry over answers.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              AI has all the answers. The value of the human is in asking the right questions. We teach Disciplined Inquiry.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">2. Polymaths over specialists.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Specialization is for algorithms. The future belongs to the generalist who can direct specialized AI agents across product, design, and infrastructure.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">3. Artifacts over credentials.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              A portfolio of shipped work proves more than any certificate. Every engagement produces evaluable artifacts.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">4. Judgment over speed.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              AI is fast. The question is whether the output is correct, appropriate, and responsible. We train the judgment to know.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">5. Vocabulary over vibes.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Professional vocabulary creates precision. Precision creates communication. Communication creates teams that ship.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">6. Accountability over completion.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Finishing is not enough. Can you explain what you built? Can you defend the decisions you made? Can you put your name on it?
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">7. Real productivity over junk food work.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Eight AI-generated reports that you skim but don&apos;t synthesize. Code you let the agent write and never understood.
              Outputs that look productive and build no judgment. Jack Clark (co-founder, Anthropic) named it: &ldquo;junk food work.&rdquo;
              Every Studio practice &mdash; the Context Pack, the AI Audit Log, the Maestro code review &mdash; is designed to make
              that pattern structurally impossible.
            </p>
          </div>
        </div>
      </section>

      {/* Section 05 — EverydayAI */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">Community</p>
        <h2 className="mt-2 type-title text-text-primary">EverydayAI &mdash; where the community gathers.</h2>
        <p className="mt-2 type-body-sm text-text-secondary">
          Before there was Studio Ordo, there was EverydayAI &mdash; a free community event that makes AI accessible to
          anyone. Monthly sessions. Three hours. No jargon. No sales pitch.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Hour 1 &mdash; Landscape</p>
            <p className="mt-1 type-meta text-text-secondary">What&apos;s happening in AI right now (data, not speculation)</p>
          </div>
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Hour 2 &mdash; Practice</p>
            <p className="mt-1 type-meta text-text-secondary">Hands-on exercise with real tools (everyone builds something)</p>
          </div>
          <div className="surface-elevated p-4">
            <p className="type-label text-text-primary">Hour 3 &mdash; Conversation</p>
            <p className="mt-1 type-meta text-text-secondary">Open discussion, questions, community connection</p>
          </div>
        </div>
        <p className="mt-4 type-body-sm text-text-secondary">
          EverydayAI is a bridge. For most people, the community event is everything they need &mdash; a monthly
          check-in on AI capability. For some, it reveals an appetite for deeper work. Those people find their way to
          workshops, team programs, or the studio. We don&apos;t pitch at EverydayAI events. The funnel is natural.
        </p>
        <div className="mt-4">
          <Link href="/events" className="type-label underline">
            Join the next EverydayAI session &rarr;
          </Link>
        </div>
      </section>

      {/* Section 06 — The Name */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">The Name</p>
        <h2 className="mt-2 type-title text-text-primary">Ordo.</h2>
        <div className="mt-4 space-y-3 type-body-sm text-text-secondary">
          <p>
            <em>Ordo</em> is Latin for order, arrangement, method. It appears in monastic traditions (the structured
            daily rhythm of work and study), in military history (the organized formation), and in typography (the
            orderly arrangement of elements on a page).
          </p>
          <p>
            We chose it because that&apos;s what we bring to AI adoption: order. Not restriction. Not bureaucracy. The
            productive kind of order &mdash; the kind that lets skilled people work faster, communicate precisely, and
            produce work they can defend.
          </p>
          <p>
            The visual identity follows the same principle. Swiss typographic tradition. Clean grids. No decoration.
            The content speaks. The brand stays out of the way.
          </p>
        </div>
      </section>

      {/* Section 07 — The Data */}
      <section className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="surface p-6">
          <p className="type-meta text-text-muted">The Acceleration</p>
          <h3 className="mt-2 type-title text-text-primary">Why now.</h3>
          <ul className="mt-3 space-y-2 type-body-sm text-text-secondary">
            <li>AI capability doubles every 3&ndash;4 months (METR, Feb 2026)</li>
            <li>Language model benchmarks saturated in 12 months</li>
            <li>$600B+ in hyperscaler AI capital expenditure in 2026</li>
            <li>Dario Amodei (Anthropic CEO): &ldquo;We are in the fastest technology transition in human history&rdquo;</li>
            <li>Jack Clark (Anthropic co-founder, The Ezra Klein Show, Feb 2026): &ldquo;Maybe a guild-style philosophy of maintaining human excellence&rdquo; &mdash; describing what organizations will need to build</li>
          </ul>
        </div>
        <div className="surface p-6">
          <p className="type-meta text-text-muted">The Gap</p>
          <h3 className="mt-2 type-title text-text-primary">What&apos;s missing.</h3>
          <ul className="mt-3 space-y-2 type-body-sm text-text-secondary">
            <li>Only 48% of AI projects reach production deployment</li>
            <li>Traditional developer job postings down 51% (Indeed, 2023&ndash;2024)</li>
            <li>AI-skill job postings up 68% (UMD Smith School, Q4 2022&ndash;Q4 2024)</li>
            <li>Median AI engineer salary in NYC/NJ: $184K&ndash;$213K+ (Glassdoor, 2025)</li>
          </ul>
          <p className="mt-4 type-meta italic text-text-muted">
            1900 Fifth Avenue: horses. 1913 Fifth Avenue: automobiles. Thirteen years. Complete inversion.
            We are in 1901.
          </p>
        </div>
      </section>

      {/* Page CTA */}
      <section className="mt-6 surface-elevated p-6 text-center rounded-lg border border-border-subtle">
        <h2 className="type-title text-text-primary">Ready to bring order to AI in your organization?</h2>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild intent="primary">
            <Link href={BOOKING_URL}>Book a Technical Consult</Link>
          </Button>
          <Link href="/newsletter" className="type-label text-text-secondary hover:text-text-primary underline underline-offset-4">
            Subscribe to the Ordo Brief &rarr;
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
