import { resolveConfig } from "@/platform/config";
import { openCliDb } from "@/platform/runtime";

function normalizeCode(code: string): string {
  return code.toUpperCase();
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return Response.json({ error: "code is required" }, { status: 400 });
  }

  let db;
  try {
    const config = resolveConfig({ envVars: process.env });
    db = openCliDb(config);

    const row = db
      .prepare(
        `SELECT u.display_name
         FROM referral_codes rc
         JOIN users u ON u.id = rc.user_id
         WHERE rc.code = ?`,
      )
      .get(normalizeCode(code)) as { display_name: string | null } | undefined;

    if (!row) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    return Response.json({ display_name: row.display_name ?? null });
  } catch {
    return Response.json({ error: "internal error" }, { status: 500 });
  } finally {
    db?.close();
  }
}
