import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for LMS 219.",
  openGraph: {
    title: "Terms of Service",
  },
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl p-6">
      <h1 className="type-h2 text-text-primary">Terms of Service</h1>
      <p className="mt-2 type-meta text-text-muted">Last updated: 2026-02-19</p>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Agreement</h2>
        <p className="type-body text-text-secondary">
          By accessing or using LMS 219, you agree to these Terms. If you are using LMS 219 on behalf of an organization,
          you represent that you have authority to accept these Terms for that organization.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Accounts and access</h2>
        <ul className="list-disc pl-6 type-body text-text-secondary space-y-1">
          <li>You are responsible for activity on your account and for keeping credentials secure.</li>
          <li>Administrative features may be limited to authorized users based on role.</li>
          <li>We may suspend access to protect the service or investigate suspected abuse.</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Acceptable use</h2>
        <ul className="list-disc pl-6 type-body text-text-secondary space-y-1">
          <li>Do not attempt to access data you are not authorized to view.</li>
          <li>Do not disrupt, overload, or reverse engineer the service.</li>
          <li>Do not upload or submit content that is unlawful or violates others’ rights.</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Events and registrations</h2>
        <p className="type-body text-text-secondary">
          LMS 219 supports event listings and registrations. Availability, schedules, and registration status may change.
          Some actions (like cancellations or check-ins) may be performed by authorized administrators.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Audit and logging</h2>
        <p className="type-body text-text-secondary">
          Administrative actions may be logged for security, accountability, troubleshooting, and compliance purposes.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Disclaimers</h2>
        <p className="type-body text-text-secondary">
          LMS 219 is provided on an “as is” and “as available” basis. To the extent permitted by law, we disclaim
          warranties of merchantability, fitness for a particular purpose, and non-infringement.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Limitation of liability</h2>
        <p className="type-body text-text-secondary">
          To the extent permitted by law, LMS 219 and its operators will not be liable for indirect, incidental, special,
          consequential, or punitive damages, or any loss of data, profits, or revenues.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Changes</h2>
        <p className="type-body text-text-secondary">
          We may update these Terms from time to time. If we make material changes, we will update the “Last updated”
          date on this page.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="type-title text-text-primary">Contact</h2>
        <p className="type-body text-text-secondary">
          Questions about these Terms should be directed to your LMS 219 administrator or service operator.
        </p>
      </section>
    </main>
  );
}
