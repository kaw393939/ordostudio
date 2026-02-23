import { describe, expect, it } from "vitest";

import { setupStandardE2EFixture } from "@/app/__tests__/helpers/e2e-fixtures";
import { createToolRegistry } from "@/mcp/tools";
import { createFieldReport } from "@/lib/api/field-reports";
import { createNewsletterIssue } from "@/lib/api/newsletter";

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected_object");
  }
  return value as Record<string, unknown>;
};

describe("mcp tools", () => {
  it("summarize_field_report returns newsletter/outreach JSON", async () => {
    const fixture = await setupStandardE2EFixture();

    const report = createFieldReport({
      userId: fixture.userId,
      eventSlug: "published-open",
      keyInsights: "Teams ship agents without eval gates.\nSecond line.",
      models: "- Model: gpt-5\n- Tool: CI eval harness",
      money: "- Budget: $10k/mo for tooling\n- ROI: reduce review load",
      people: "- Jane Doe — Organizer — worth meeting — linkedin.com/in/janedoe",
      whatITried: "- Asked 3 attendees about blockers",
      clientAdvice: "- Mention in newsletter: eval gates are the bottleneck\n- Reach out to organizer",
      requestId: "test-request",
    });

    const registry = createToolRegistry();
    const result = await registry.call(
      "summarize_field_report",
      { id: report.id },
      { actor: { type: "USER", id: fixture.adminId }, requestId: "mcp-test" },
    );

    expect(result.isError).toBeUndefined();
    const payload = asRecord(JSON.parse(result.content[0].text) as unknown);

    expect(payload.field_report_id).toBe(report.id);

    const event = asRecord(payload.event);
    expect(event.slug).toBe("published-open");

    const newsletter = asRecord(payload.newsletter);
    expect(String(newsletter.summary)).toContain("Teams ship agents");

    const outreach = asRecord(payload.outreach);
    expect(Array.isArray(outreach.candidates)).toBe(true);
  });

  it("attach_field_report_to_newsletter attaches provenance with confirmation", async () => {
    const fixture = await setupStandardE2EFixture();

    const report = createFieldReport({
      userId: fixture.userId,
      eventSlug: "published-open",
      keyInsights: "One key insight",
      models: "Models",
      money: "Money",
      people: "People",
      whatITried: "Tried",
      clientAdvice: "Advice",
      requestId: "test-request",
    });

    const issue = createNewsletterIssue({
      title: "Ordo Brief",
      issueDate: "2026-02-23",
      actor: { type: "USER", id: fixture.adminId },
      requestId: "issue-create",
    });

    const registry = createToolRegistry();

    const confirm = `attach_field_report_to_newsletter:${issue.id}:${report.id}`;
    const result = await registry.call(
      "attach_field_report_to_newsletter",
      { issue_id: issue.id, field_report_id: report.id, confirm },
      { actor: { type: "USER", id: fixture.adminId }, requestId: "mcp-test" },
    );

    expect(result.isError).toBeUndefined();
    const payload = asRecord(JSON.parse(result.content[0].text) as unknown);

    const provenance = asRecord(payload.provenance);
    const fromField = asRecord(provenance.FROM_FIELD);
    const fieldReports = fromField.field_reports;

    expect(Array.isArray(fieldReports)).toBe(true);
    expect((fieldReports as Array<unknown>).some((fr) => asRecord(fr).id === report.id)).toBe(true);
  });
});
