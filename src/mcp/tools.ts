import type { ApiActor } from "../lib/api/actor";
import { updateIntakeRequest, getIntakeRequestById, listIntakeRequests } from "../lib/api/intake";
import { approveDealAdmin, assignDealAdmin, listDealsAdmin, type DealStatus } from "../lib/api/deals";
import { getFieldReportAdmin, listFieldReportsAdmin, setFieldReportFeatured } from "../lib/api/field-reports";
import {
  createNewsletterIssue,
  exportNewsletterMarkdown,
  generateNewsletterDraft,
  scheduleNewsletterSend,
} from "../lib/api/newsletter";
import { listAuditEntries } from "../lib/api/audit";

type JsonSchema = Record<string, unknown>;

type ToolContext = {
  actor: ApiActor;
  requestId: string;
};

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

type ToolHandler = (args: unknown, ctx: ToolContext) => Promise<unknown> | unknown;

type Tool = ToolDefinition & { handler: ToolHandler };

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

const isToolResult = (value: unknown): value is ToolResult => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.content)) return false;
  return record.content.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return row.type === "text" && typeof row.text === "string";
  });
};

const textResult = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }] };
};

const requireConfirm = (expected: string, provided: unknown) => {
  if (typeof provided !== "string" || provided !== expected) {
    throw new Error(`confirmation_required:${expected}`);
  }
};

const toolError = (message: string) => ({ content: [{ type: "text", text: message }], isError: true });

export const createToolRegistry = () => {
  const tools: Tool[] = [
    {
      name: "list_intake",
      description: "List intake requests (admin).",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string" },
          audience: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
        },
        additionalProperties: false,
      },
      handler: (args) => {
        const input = (args ?? {}) as Record<string, unknown>;
        return listIntakeRequests({
          status: typeof input.status === "string" ? input.status : undefined,
          audience: typeof input.audience === "string" ? input.audience : undefined,
          limit: typeof input.limit === "number" ? input.limit : undefined,
          offset: typeof input.offset === "number" ? input.offset : undefined,
        });
      },
    },
    {
      name: "get_intake",
      description: "Get an intake request with history by id (admin).",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
      handler: (args) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.id !== "string" || input.id.trim().length === 0) throw new Error("id_required");
        return getIntakeRequestById(input.id);
      },
    },
    {
      name: "triage_intake",
      description: "Triage an intake request (sets status=TRIAGED) with explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          owner_user_id: { type: ["string", "null"] },
          priority: { type: "number" },
          note: { type: "string" },
          confirm: { type: "string" },
        },
        required: ["id", "confirm"],
        additionalProperties: false,
      },
      handler: (args, ctx) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.id !== "string" || input.id.trim().length === 0) throw new Error("id_required");
        requireConfirm(`triage_intake:${input.id}`, input.confirm);

        const ownerUserId =
          input.owner_user_id === null || typeof input.owner_user_id === "string" ? (input.owner_user_id as string | null) : undefined;

        return updateIntakeRequest(input.id, {
          status: "TRIAGED",
          ownerUserId,
          priority: typeof input.priority === "number" ? input.priority : undefined,
          note: typeof input.note === "string" ? input.note : undefined,
          actor: ctx.actor,
          requestId: ctx.requestId,
        });
      },
    },
    {
      name: "list_deals",
      description: "List deals (admin).",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string" },
          intake_id: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
        },
        additionalProperties: false,
      },
      handler: (args) => {
        const input = (args ?? {}) as Record<string, unknown>;
        return listDealsAdmin({
          status: typeof input.status === "string" ? (input.status as DealStatus) : undefined,
          intakeId: typeof input.intake_id === "string" ? input.intake_id : undefined,
          limit: typeof input.limit === "number" ? input.limit : undefined,
          offset: typeof input.offset === "number" ? input.offset : undefined,
        });
      },
    },
    {
      name: "assign_deal",
      description: "Assign a deal (provider + maestro) with explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          deal_id: { type: "string" },
          provider_user_id: { type: "string" },
          maestro_user_id: { type: "string" },
          note: { type: ["string", "null"] },
          confirm: { type: "string" },
        },
        required: ["deal_id", "provider_user_id", "maestro_user_id", "confirm"],
        additionalProperties: false,
      },
      handler: (args, ctx) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.deal_id !== "string" || input.deal_id.trim().length === 0) throw new Error("deal_id_required");
        requireConfirm(`assign_deal:${input.deal_id}`, input.confirm);

        if (typeof input.provider_user_id !== "string" || input.provider_user_id.trim().length === 0) throw new Error("provider_user_id_required");
        if (typeof input.maestro_user_id !== "string" || input.maestro_user_id.trim().length === 0) throw new Error("maestro_user_id_required");

        return assignDealAdmin({
          dealId: input.deal_id,
          providerUserId: input.provider_user_id,
          maestroUserId: input.maestro_user_id,
          note: typeof input.note === "string" ? input.note : null,
          actor: ctx.actor,
          requestId: ctx.requestId,
        });
      },
    },
    {
      name: "approve_deal",
      description: "Maestro-approve a deal with explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          deal_id: { type: "string" },
          note: { type: ["string", "null"] },
          confirm: { type: "string" },
        },
        required: ["deal_id", "confirm"],
        additionalProperties: false,
      },
      handler: (args, ctx) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.deal_id !== "string" || input.deal_id.trim().length === 0) throw new Error("deal_id_required");
        requireConfirm(`approve_deal:${input.deal_id}`, input.confirm);

        return approveDealAdmin({
          dealId: input.deal_id,
          note: typeof input.note === "string" ? input.note : null,
          actor: ctx.actor,
          requestId: ctx.requestId,
        });
      },
    },
    {
      name: "list_field_reports",
      description: "List field reports (admin).",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" },
          offset: { type: "number" },
        },
        additionalProperties: false,
      },
      handler: (args) => {
        const input = (args ?? {}) as Record<string, unknown>;
        return listFieldReportsAdmin({
          limit: typeof input.limit === "number" ? input.limit : undefined,
          offset: typeof input.offset === "number" ? input.offset : undefined,
        });
      },
    },
    {
      name: "get_field_report",
      description: "Get a field report by id (admin).",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
      handler: (args) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.id !== "string" || input.id.trim().length === 0) throw new Error("id_required");
        return getFieldReportAdmin(input.id);
      },
    },
    {
      name: "feature_field_report",
      description: "Feature/unfeature a field report with explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          featured: { type: "boolean" },
          confirm: { type: "string" },
        },
        required: ["id", "featured", "confirm"],
        additionalProperties: false,
      },
      handler: (args, ctx) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.id !== "string" || input.id.trim().length === 0) throw new Error("id_required");
        requireConfirm(`feature_field_report:${input.id}`, input.confirm);
        if (typeof input.featured !== "boolean") throw new Error("featured_required");
        return setFieldReportFeatured({
          id: input.id,
          featured: input.featured,
          actor: ctx.actor,
          requestId: ctx.requestId,
        });
      },
    },
    {
      name: "create_newsletter_issue",
      description: "Create a newsletter issue (DRAFT) with explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          issue_date: { type: "string" },
          confirm: { type: "string" },
        },
        required: ["title", "issue_date", "confirm"],
        additionalProperties: false,
      },
      handler: (args, ctx) => {
        const input = (args ?? {}) as Record<string, unknown>;
        requireConfirm("create_newsletter_issue", input.confirm);
        return createNewsletterIssue({
          title: typeof input.title === "string" ? input.title : "",
          issueDate: typeof input.issue_date === "string" ? input.issue_date : "",
          actor: ctx.actor,
          requestId: ctx.requestId,
        });
      },
    },
    {
      name: "generate_newsletter",
      description: "Generate a newsletter draft from featured/selected field reports with explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          issue_id: { type: "string" },
          field_report_ids: { type: "array", items: { type: "string" } },
          research_sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                title: { type: ["string", "null"] },
              },
              required: ["url"],
              additionalProperties: false,
            },
          },
          confirm: { type: "string" },
        },
        required: ["issue_id", "confirm"],
        additionalProperties: false,
      },
      handler: (args, ctx) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.issue_id !== "string" || input.issue_id.trim().length === 0) throw new Error("issue_id_required");
        requireConfirm(`generate_newsletter:${input.issue_id}`, input.confirm);

        const fieldReportIds = Array.isArray(input.field_report_ids)
          ? input.field_report_ids.filter((id): id is string => typeof id === "string")
          : undefined;

        const researchUrls = Array.isArray(input.research_sources)
          ? input.research_sources
              .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
              .map((row) => ({
                url: typeof row.url === "string" ? row.url : "",
                title: row.title === null || typeof row.title === "string" ? (row.title as string | null) : null,
              }))
              .filter((row) => row.url.trim().length > 0)
          : undefined;

        return generateNewsletterDraft({
          id: input.issue_id,
          actor: ctx.actor,
          requestId: ctx.requestId,
          fieldReportIds,
          researchUrls,
        });
      },
    },
    {
      name: "schedule_newsletter",
      description: "Schedule a published newsletter issue send with explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          issue_id: { type: "string" },
          scheduled_for: { type: "string" },
          confirm: { type: "string" },
        },
        required: ["issue_id", "scheduled_for", "confirm"],
        additionalProperties: false,
      },
      handler: (args, ctx) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.issue_id !== "string" || input.issue_id.trim().length === 0) throw new Error("issue_id_required");
        requireConfirm(`schedule_newsletter:${input.issue_id}`, input.confirm);
        return scheduleNewsletterSend({
          issueId: input.issue_id,
          scheduledFor: typeof input.scheduled_for === "string" ? input.scheduled_for : "",
          actor: ctx.actor,
          requestId: ctx.requestId,
        });
      },
    },
    {
      name: "export_newsletter",
      description: "Export a newsletter issue as Markdown.",
      inputSchema: {
        type: "object",
        properties: { issue_id: { type: "string" }, base_url: { type: "string" } },
        required: ["issue_id"],
        additionalProperties: false,
      },
      handler: (args) => {
        const input = (args ?? {}) as Record<string, unknown>;
        if (typeof input.issue_id !== "string" || input.issue_id.trim().length === 0) throw new Error("issue_id_required");
        const markdown = exportNewsletterMarkdown({
          id: input.issue_id,
          baseUrl: typeof input.base_url === "string" ? input.base_url : undefined,
        });
        return textResult(markdown);
      },
    },
    {
      name: "get_audit_log",
      description: "List audit log entries.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          actor_id: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
        },
        additionalProperties: false,
      },
      handler: (args) => {
        const input = (args ?? {}) as Record<string, unknown>;
        return listAuditEntries({
          action: typeof input.action === "string" ? input.action : undefined,
          actor_id: typeof input.actor_id === "string" ? input.actor_id : undefined,
          from: typeof input.from === "string" ? input.from : undefined,
          to: typeof input.to === "string" ? input.to : undefined,
          limit: typeof input.limit === "number" ? input.limit : undefined,
          offset: typeof input.offset === "number" ? input.offset : undefined,
        });
      },
    },
  ];

  const byName = new Map(tools.map((t) => [t.name, t] as const));

  return {
    list: (): ToolDefinition[] =>
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    call: async (name: string, args: unknown, ctx: ToolContext) => {
      const tool = byName.get(name);
      if (!tool) {
        return toolError(`unknown_tool:${name}`);
      }

      try {
        const result = await tool.handler(args, ctx);
        if (isToolResult(result)) {
          return result;
        }
        return textResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return toolError(message);
      }
    },
  };
};
