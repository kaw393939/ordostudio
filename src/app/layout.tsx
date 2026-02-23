import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "LMS 219",
    template: "%s | LMS 219",
  },
  description: "LMS 219 UI consuming /api/v1 HAL APIs",
  openGraph: {
    title: "LMS 219",
    description: "LMS 219 UI consuming /api/v1 HAL APIs",
    siteName: "LMS 219",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LMS 219",
    description: "LMS 219 UI consuming /api/v1 HAL APIs",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>
        <Providers>
          <ErrorBoundary homeHref="/" homeLabel="Go home">
            {children}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
