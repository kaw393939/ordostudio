import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "About \u2022 Studio Ordo",
  description:
    "Built by a teacher. Powered by evidence. 23 years, 10,000+ engineers, and a method that works.",
  openGraph: {
    title: "About \u2022 Studio Ordo",
    description:
      "Built by a teacher. Powered by evidence. 23 years, 10,000+ engineers, and a method that works.",
  },
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <PageShell title="About" subtitle="Built by a teacher. Powered by evidence.">
      {/* Section 01 \u2014 The Founder */}
      <section className="surface p-6">
        <p className="type-meta text-text-muted">The Founder</p>
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
            Along the way, he served as CTO at a startup that was acquired by Anthem Ventures. He consulted
            internationally in Zambia, building data systems in environments where nothing could be taken for granted
            &mdash; not power, not connectivity, not assumptions about how software &ldquo;should&rdquo; work. He earned
            a black belt in Taekwondo. He raised a family. He watched 10,000 students graduate.
          </p>
          <p>And he noticed something.</p>
        </div>
      </section>

      {/* Section 02 \u2014 The Origin Story */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">The Origin</p>
        <h2 className="mt-2 type-title text-text-primary">What 10,000 graduates taught me.</h2>
        <div className="mt-4 space-y-3 type-body-sm italic text-text-secondary">
          <p>
            &ldquo;I&apos;ve watched 10,000 students graduate from my programs. I&apos;ve seen them go to Amazon,
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
            that&apos;s worked for centuries: a workshop where you learn by producing real work under the guidance of
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
            vocabulary, and the discipline to evaluate what machines produce.&rdquo;
          </p>
        </div>
      </section>

      {/* Section 03 \u2014 What We Believe */}
      <section className="mt-6 surface p-6">
        <p className="type-meta text-text-muted">Philosophy</p>
        <h2 className="mt-2 type-title text-text-primary">What we believe.</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="type-label text-text-primary">1. Method over talent.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Talent is distributed normally. Method is teachable. We teach method.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">2. Artifacts over credentials.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              A portfolio of shipped work proves more than any certificate. Every engagement produces evaluable artifacts.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">3. Judgment over speed.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              AI is fast. The question is whether the output is correct, appropriate, and responsible. We train the
              judgment to know.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">4. Vocabulary over vibes.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Professional vocabulary creates precision. Precision creates communication. Communication creates teams
              that ship.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">5. Evidence over hype.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              We cite our sources. MIT RCT data, BLS projections, METR capability tracking, salary surveys. If we
              can&apos;t source it, we don&apos;t claim it.
            </p>
          </div>
          <div>
            <p className="type-label text-text-primary">6. Accountability over completion.</p>
            <p className="mt-1 type-body-sm text-text-secondary">
              Finishing is not enough. Can you explain what you built? Can you defend the decisions you made? Can you put
              your name on it?
            </p>
          </div>
        </div>
      </section>

      {/* Section 04 \u2014 EverydayAI */}
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

      {/* Section 05 \u2014 The Name */}
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

      {/* Section 06 \u2014 The Data */}
      <section className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="surface p-6">
          <p className="type-meta text-text-muted">The Acceleration</p>
          <h3 className="mt-2 type-title text-text-primary">Why now.</h3>
          <ul className="mt-3 space-y-2 type-body-sm text-text-secondary">
            <li>AI capability doubles every 3&ndash;4 months (METR, Feb 2026)</li>
            <li>Language model benchmarks saturated in 12 months</li>
            <li>$600B+ in hyperscaler AI capital expenditure in 2026</li>
            <li>Dario Amodei (Anthropic CEO): &ldquo;We are in the fastest technology transition in human history&rdquo;</li>
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
      <section className="mt-6 surface-elevated p-6 text-center">
        <h2 className="type-title text-text-primary">Ready to bring order to AI in your organization?</h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/services/request"
            className="motion-base rounded-sm border border-action-primary bg-action-primary px-3 py-2 type-label text-text-inverse hover:bg-action-primary-hover"
          >
            Book a technical consult
          </Link>
          <Link href="/newsletter" className="type-label underline">
            Subscribe to the Ordo Brief &rarr;
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
