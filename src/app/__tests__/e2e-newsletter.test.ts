import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postFieldReport } from "../api/v1/account/field-reports/route";
import { POST as postFeatureFieldReport } from "../api/v1/admin/field-reports/[id]/feature/route";
import { POST as postCreateNewsletter, GET as getNewsletterList } from "../api/v1/admin/newsletter/route";
import { GET as getNewsletterIssue, PATCH as patchNewsletterIssue } from "../api/v1/admin/newsletter/[id]/route";
import { POST as postGenerateNewsletter } from "../api/v1/admin/newsletter/[id]/generate/route";
import { POST as postReviewNewsletter } from "../api/v1/admin/newsletter/[id]/review/route";
import { POST as postPublishNewsletter } from "../api/v1/admin/newsletter/[id]/publish/route";
import { GET as getNewsletterExport } from "../api/v1/admin/newsletter/[id]/export/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

const requireResponse = (response: Response | undefined): Response => {
  if (!response) {
    throw new Error("Expected route handler to return a Response");
  }
  return response;
};

describe("e2e admin newsletter", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("generates a draft with provenance and preserves provenance across edits", async () => {
    const createFieldReportResponse = await postFieldReport(
      new Request("http://localhost:3000/api/v1/account/field-reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
        body: JSON.stringify({
          event_slug: "published-open",
          key_insights: "Evaluation gates are where reliability lives.",
          models: "Teams standardize on a single model per workflow.",
          money: "Budgets move from experimentation to repeatable eval runs.",
          people: "Enablement is the bottleneck: review standards beat heroics.",
          what_i_tried: "I applied a review rubric to an existing PR flow and found gaps.",
          client_advice: "Start with one workflow, add an eval checklist, then scale.",
        }),
      }),
    );

    expect(createFieldReportResponse.status).toBe(201);
    const createdFieldReport = (await createFieldReportResponse.json()) as { id: string };

    const featureResponse = requireResponse(
      await postFeatureFieldReport(
      new Request(`http://localhost:3000/api/v1/admin/field-reports/${createdFieldReport.id}/feature`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ featured: true }),
      }),
      { params: Promise.resolve({ id: createdFieldReport.id }) },
      ),
    );

    expect(featureResponse.status).toBe(200);

    const createIssueResponse = requireResponse(
      await postCreateNewsletter(
      new Request("http://localhost:3000/api/v1/admin/newsletter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ title: "Ordo Brief", issue_date: "2026-09-07" }),
      }),
      ),
    );

    expect(createIssueResponse.status).toBe(201);
    const createdIssue = (await createIssueResponse.json()) as { id: string };

    const generateResponse = requireResponse(
      await postGenerateNewsletter(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}/generate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          research_sources: [{ url: "https://example.com/research", title: "Example Research" }],
        }),
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(generateResponse.status).toBe(200);
    const generated = (await generateResponse.json()) as {
      status: string;
      blocks: Record<string, { content_md: string }>;
      provenance: Record<string, { field_reports: unknown[]; research_sources: Array<{ url: string }> }>;
    };

    expect(generated.status).toBe("DRAFT");
    expect(generated.blocks.MODELS.content_md).toContain("-");
    expect(generated.blocks.NEXT_STEPS.content_md).toContain("-");
    expect(generated.provenance.MODELS.field_reports.length).toBeGreaterThan(0);
    expect(generated.provenance.MODELS.research_sources[0].url).toBe("https://example.com/research");

    const patchResponse = requireResponse(
      await patchNewsletterIssue(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          blocks: {
            MODELS: "- Edited models point",
          },
        }),
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(patchResponse.status).toBe(200);

    const getIssueResponse = requireResponse(
      await getNewsletterIssue(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}`, {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(getIssueResponse.status).toBe(200);
    const fetched = (await getIssueResponse.json()) as typeof generated;
    expect(fetched.blocks.MODELS.content_md).toContain("Edited models");
    expect(fetched.provenance.MODELS.field_reports.length).toBeGreaterThan(0);
    expect(fetched.provenance.MODELS.research_sources[0].url).toBe("https://example.com/research");

    const exportResponse = requireResponse(
      await getNewsletterExport(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}/export`, {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(exportResponse.status).toBe(200);
    const exported = await exportResponse.text();
    expect(exported).toContain("# Ordo Brief");
    expect(exported).toContain("## Models");
    expect(exported).toContain("Provenance:");
    expect(exported).toContain("http://localhost:3000/admin/field-reports/");
    expect(exported).toContain("https://example.com/research");

    const listResponse = requireResponse(
      await getNewsletterList(
      new Request("http://localhost:3000/api/v1/admin/newsletter", {
        headers: { cookie: fixture.adminCookie },
      }),
      ),
    );

    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { count: number };
    expect(listBody.count).toBeGreaterThan(0);
  });

  it("enforces publish guardrails (review + confirm + no double publish)", async () => {
    const createIssueResponse = requireResponse(
      await postCreateNewsletter(
      new Request("http://localhost:3000/api/v1/admin/newsletter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ title: "Ordo Brief", issue_date: "2026-09-08" }),
      }),
      ),
    );

    expect(createIssueResponse.status).toBe(201);
    const createdIssue = (await createIssueResponse.json()) as { id: string };

    const publishWithoutConfirm = requireResponse(
      await postPublishNewsletter(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(publishWithoutConfirm.status).toBe(412);

    const publishNotReviewed = requireResponse(
      await postPublishNewsletter(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ confirm: "PUBLISH" }),
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(publishNotReviewed.status).toBe(412);

    const reviewResponse = requireResponse(
      await postReviewNewsletter(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}/review`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(reviewResponse.status).toBe(200);

    const publishResponse = requireResponse(
      await postPublishNewsletter(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ confirm: "PUBLISH" }),
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(publishResponse.status).toBe(200);
    const published = (await publishResponse.json()) as { status: string };
    expect(published.status).toBe("PUBLISHED");

    const publishAgain = requireResponse(
      await postPublishNewsletter(
      new Request(`http://localhost:3000/api/v1/admin/newsletter/${createdIssue.id}/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ confirm: "PUBLISH" }),
      }),
      { params: Promise.resolve({ id: createdIssue.id }) },
      ),
    );

    expect(publishAgain.status).toBe(412);
  });
});
