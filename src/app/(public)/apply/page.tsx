import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import ChatWidget from "@/components/chat/chat-widget";

export const metadata = buildMetadata({
  title: "Apply",
  description:
    "Talk to Studio Ordo about training and commissions work. Start a conversation or fill out the intake form.",
  canonical: "/apply",
});

const paths = [
  {
    title: "Apprentice",
    description:
      "You want to learn and work. You're building your craft inside a real project with guild oversight.",
    href: "/apply/apprentice",
  },
  {
    title: "Journeyman",
    description:
      "You have experience. You want access to guild projects and a professional practice context.",
    href: "/apply/journeyman",
  },
  {
    title: "Affiliate",
    description:
      "You refer work. You get a referral code and QR card. You earn commission on conversions.",
    href: "/apply/affiliate",
  },
] as const;

export default function ApplyPage() {
  return (
    <main id="main-content" className="container-grid py-6 flex flex-col gap-10">
      {/* Section 1 — Chat intake */}
      <section aria-labelledby="chat-heading">
        <h1 id="chat-heading" className="type-title text-text-primary mb-1">
          Talk to us first.
        </h1>
        <p className="type-body-sm text-text-secondary mb-5">
          Tell us what you&apos;re trying to do. We&apos;ll figure out together if we&apos;re the
          right fit.
        </p>
        <ChatWidget mode="page" />
      </section>

      {/* Section 2 — Form fallback (below fold) */}
      <section aria-labelledby="form-heading" className="border-t border-border pt-8">
        <h2 id="form-heading" className="type-subtitle text-text-primary mb-1">
          Prefer a form?
        </h2>
        <p className="type-body-sm text-text-secondary mb-5">
          Choose the path that matches where you are.
        </p>
        <div className="flex flex-col gap-3">
          {paths.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="surface border-border border rounded p-5 block hover:bg-bg-subtle transition-colors"
            >
              <span className="type-label text-text-primary block">{p.title}</span>
              <span className="type-body-sm text-text-secondary block mt-1">
                {p.description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

