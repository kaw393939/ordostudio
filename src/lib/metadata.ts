import type { Metadata } from "next";

export const SITE_NAME = "Studio Ordo";

export const DEFAULT_DESCRIPTION =
  "Spec-driven AI training for teams and individuals. Eight capabilities, structured method, artifacts that prove how you work. 23 years, 10,000+ engineers.";

export const BOOKING_URL = "/services/request";

/**
 * Build consistent page metadata with Studio Ordo branding.
 *
 * Title is combined with the root layout template: `"%s | Studio Ordo"`.
 * Use `titleAbsolute` for pages that need full control (e.g. homepage).
 */
export function buildMetadata(page: {
  title: string;
  titleAbsolute?: string;
  description?: string;
  canonical: string;
  ogImage?: string;
}): Metadata {
  const description = page.description ?? DEFAULT_DESCRIPTION;
  return {
    title: page.titleAbsolute ? { absolute: page.titleAbsolute } : page.title,
    description,
    openGraph: {
      title: page.titleAbsolute ?? `${page.title} | ${SITE_NAME}`,
      description,
      images: [page.ogImage ?? "/og-default.png"],
    },
    alternates: { canonical: page.canonical },
  };
}
