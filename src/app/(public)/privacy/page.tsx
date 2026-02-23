import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for LMS 219.",
  openGraph: {
    title: "Privacy Policy",
  },
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl p-6">
      <h1 className="type-h2 text-text-primary">Privacy Policy</h1>
      <p className="mt-2 type-meta text-text-muted">Last updated: 2026-02-19</p>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Overview</h2>
        <p className="type-body text-text-secondary">
          This Privacy Policy explains how LMS 219 collects, uses, and protects information when you create an account,
          browse events/services, register for events, and use administrative features.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Information we collect</h2>
        <ul className="list-disc pl-6 type-body text-text-secondary space-y-1">
          <li>Account data (such as email address and authentication-related metadata).</li>
          <li>Event participation data (registrations, check-ins, and attendance-related status).</li>
          <li>Operational logs (such as audit entries for administrative actions).</li>
          <li>Service inquiry data (intake requests and triage history, when submitted).</li>
          <li>Referral attribution data (referral link clicks and attributed service inquiries).</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">How we use information</h2>
        <ul className="list-disc pl-6 type-body text-text-secondary space-y-1">
          <li>Provide core functionality: accounts, registrations, and event operations.</li>
          <li>Maintain safety and integrity: fraud prevention, abuse mitigation, and access control.</li>
          <li>Operational support: troubleshooting, diagnostics, and incident response.</li>
          <li>Compliance and governance: security/audit logging and retention-safe deletion.</li>
          <li>Referral reporting: attribute consult requests to a referrer when a referral link was used.</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Referral tracking</h2>
        <p className="type-body text-text-secondary">
            If you arrive via a referral link, we set a small referral cookie (&quot;so_ref&quot;) for up to 90 days so we can
          attribute a subsequent consult request to the referring member. This cookie is used for referral attribution
          and reporting.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Sharing</h2>
        <p className="type-body text-text-secondary">
          LMS 219 does not sell personal information. Information may be shared with authorized administrators and service
          operators as needed to run the service, respond to support requests, and meet legal or security obligations.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Retention</h2>
        <p className="type-body text-text-secondary">
          We retain information for as long as needed to provide the service and for legitimate operational, security, and
          compliance purposes. Some records (such as audit logs) may be retained longer to support governance and
          accountability.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Your choices and rights</h2>
        <p className="type-body text-text-secondary">
          Depending on your jurisdiction and account role, you may have rights to access, correct, or delete certain
          information. You can also choose whether to register for events and whether to submit intake requests.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Contact</h2>
        <p className="type-body text-text-secondary">
          For questions about this policy, contact your LMS 219 administrator or service operator.
        </p>
      </section>
    </main>
  );
}
