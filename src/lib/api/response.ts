type HalLinks = Record<string, { href: string; [key: string]: unknown }>;

type HalOptions = {
  status?: number;
  requestId?: string;
  headers?: HeadersInit;
};

type ProblemInput = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
};

type ProblemOptions = {
  requestId?: string;
  headers?: HeadersInit;
};

const HAL_CONTENT_TYPE = "application/hal+json";
const PROBLEM_CONTENT_TYPE = "application/problem+json";

const createRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const withCommonHeaders = (
  requestId: string,
  contentType: string,
  headers?: HeadersInit,
) => {
  const merged = new Headers(headers);
  merged.set("content-type", contentType);
  merged.set("x-request-id", requestId);
  return merged;
};

export const hal = (
  payload: Record<string, unknown>,
  links: HalLinks,
  options: HalOptions = {},
) => {
  const requestId = options.requestId ?? createRequestId();
  return Response.json(
    {
      ...payload,
      _links: links,
    },
    {
      status: options.status ?? 200,
      headers: withCommonHeaders(requestId, HAL_CONTENT_TYPE, options.headers),
    },
  );
};

export const problem = (
  issue: ProblemInput,
  request?: Request,
  options: ProblemOptions = {},
) => {
  const requestId = options.requestId ?? createRequestId();
  return Response.json(
    {
      ...issue,
      instance: issue.instance ?? request?.url,
      request_id: requestId,
    },
    {
      status: issue.status,
      headers: withCommonHeaders(
        requestId,
        PROBLEM_CONTENT_TYPE,
        options.headers,
      ),
    },
  );
};

export const mediaTypes = {
  hal: HAL_CONTENT_TYPE,
  problem: PROBLEM_CONTENT_TYPE,
} as const;
