import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Join",
  description:
    "Tell us what brings you here. We build software, teach the Maestro method, and welcome new guild members.",
  canonical: "/join",
});

const options = [
  {
    label: "I need something built.",
    description: "Building an AI-assisted tool or internal product.",
    href: "/studio",
  },
  {
    label: "I want to learn this method.",
    description: "The Maestro course on directing AI in software work.",
    href: "/maestro",
  },
  {
    label: "I want to join the guild.",
    description: "Apprentice, Journeyman, or Affiliate.",
    href: "/apply",
  },
] as const;

export default function JoinPage() {
  return (
    <main id="main-content" className="container-grid py-6">
      <h1 className="type-title text-text-primary">What brings you here?</h1>
      <div className="mt-6 flex flex-col gap-3">
        {options.map((opt) => (
          <Link
            key={opt.href}
            href={opt.href}
            className="surface border-border border rounded p-5 block hover:bg-bg-subtle transition-colors"
          >
            <span className="type-label text-text-primary block">{opt.label}</span>
            <span className="type-body-sm text-text-secondary block mt-1">
              {opt.description}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
