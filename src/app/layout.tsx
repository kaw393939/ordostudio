import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { AnalyticsProvider } from "@/components/analytics-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Studio Ordo — AI Training That Ships",
    template: "%s | Studio Ordo",
  },
  description:
    "Spec-driven AI training for teams and individuals. Eight capabilities, structured method, artifacts that prove how you work. 23 years, 10,000+ engineers.",
  openGraph: {
    title: "Studio Ordo — AI Training That Ships",
    description:
      "Spec-driven AI training for teams and individuals. Eight capabilities, structured method, artifacts that prove how you work.",
    siteName: "Studio Ordo",
    type: "website",
    images: ["/og-default.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio Ordo — AI Training That Ships",
    description:
      "Spec-driven AI training for teams and individuals. 23 years, 10,000+ engineers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>
        <Providers>
          <AnalyticsProvider>
            <ErrorBoundary homeHref="/" homeLabel="Go home">
              {children}
            </ErrorBoundary>
          </AnalyticsProvider>
        </Providers>
      </body>
    </html>
  );
}
