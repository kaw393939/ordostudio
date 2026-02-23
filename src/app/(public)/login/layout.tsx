import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  openGraph: {
    title: "Login",
  },
  alternates: {
    canonical: "/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
