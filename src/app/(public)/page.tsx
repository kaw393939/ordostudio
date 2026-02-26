import { HomeHero } from "@/components/experiments/home-hero";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Home",
  titleAbsolute: "Studio Ordo — We Train What AI Can't Automate",
  description:
    "Eight capabilities. Spec-driven method. Artifacts that prove how you work. 23 years, 10,000+ engineers.",
  canonical: "/",
});

export default function Home() {
  return (
    <main id="main-content" className="flex flex-col" style={{ height: "calc(100dvh - var(--nav-height, 97px))" }}>
      <HomeHero />
    </main>
  );
}
