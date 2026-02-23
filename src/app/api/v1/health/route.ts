import { withRequestLogging } from "../../../../lib/api/request-logging";

async function _GET() {
  return Response.json({
    status: "ok",
    version: process.env.npm_package_version ?? "unknown",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

export const GET = withRequestLogging(_GET);
