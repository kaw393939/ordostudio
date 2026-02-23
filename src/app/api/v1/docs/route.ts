import { openApiDocument } from "../../../../lib/api/openapi";
import { withRequestLogging } from "../../../../lib/api/request-logging";

async function _GET() {
  return Response.json(openApiDocument, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export const GET = withRequestLogging(_GET);
