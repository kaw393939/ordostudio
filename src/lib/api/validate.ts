import { z } from "zod";
import { problem } from "./response";

/**
 * Parse and validate a request payload against a Zod schema.
 * Returns either the validated data or a pre-built RFC 7807 problem response (422).
 */
export function parsePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  request?: Request,
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    response: problem(
      {
        type: "https://lms-219.dev/problems/validation-error",
        title: "Validation Error",
        status: 422,
        detail: "Request body failed validation.",
        errors: result.error.issues.map((i) => ({
          path: i.path.map(String).join("."),
          message: i.message,
        })),
      },
      request,
    ),
  };
}
