import type { Metadata } from "next";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: Omit<LayoutProps, "children">): Promise<Metadata> {
  const { slug } = await props.params;
  const title = slug ? `Service: ${slug}` : "Service";
  return {
    title,
    openGraph: {
      title,
    },
    alternates: {
      canonical: `/services/${encodeURIComponent(slug)}`,
    },
  };
}

export default async function ServiceSlugLayout({ children }: LayoutProps) {
  return children;
}
