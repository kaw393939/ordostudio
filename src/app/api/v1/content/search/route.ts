import { searchContent } from "../../../../../lib/api/content-search";
import { withRequestLogging } from "../../../../../lib/api/request-logging";

async function _GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "5"), 20);

  if (!q) {
    return Response.json(
      {
        type: "https://lms-219.dev/problems/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Query parameter 'q' is required.",
      },
      { status: 400 }
    );
  }

  const results = await searchContent(q, limit);
  return Response.json({ results }, { status: 200 });
}

export const GET = withRequestLogging(_GET);
