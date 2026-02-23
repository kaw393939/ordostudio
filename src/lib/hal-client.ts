export interface HalLink {
  href: string;
  [key: string]: unknown;
}

export interface HalResource {
  _links: Record<string, HalLink>;
  [key: string]: unknown;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  request_id?: string;
  errors?: string[];
  [key: string]: unknown;
}

export type HalResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: ProblemDetails };

const acceptHeader = "application/hal+json, application/problem+json, application/json";

const isProblem = (value: unknown): value is ProblemDetails => {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "status" in value &&
    typeof (value as { title: unknown }).title === "string" &&
    typeof (value as { status: unknown }).status === "number"
  );
};

export const follow = (resource: HalResource, rel: string): HalLink | null => {
  return resource._links[rel] ?? null;
};

const safeJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const requestHal = async <T>(
  href: string,
  init?: RequestInit,
): Promise<HalResult<T>> => {
  const response = await fetch(href, {
    ...init,
    credentials: "include",
    headers: {
      accept: acceptHeader,
      ...(init?.headers ?? {}),
    },
  });

  const body = await safeJson(response);

  if (!response.ok) {
    if (isProblem(body)) {
      return { ok: false, problem: body };
    }

    return {
      ok: false,
      problem: {
        type: "about:blank",
        title: "Request Failed",
        status: response.status,
        detail: "Request failed and no problem details were returned.",
      },
    };
  }

  return {
    ok: true,
    data: body as T,
  };
};

export const getRoot = async (): Promise<HalResult<HalResource>> => {
  return requestHal<HalResource>("/api/v1");
};
