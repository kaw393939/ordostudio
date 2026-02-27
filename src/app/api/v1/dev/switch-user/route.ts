import { randomUUID, createHash } from "node:crypto";
import { resolveConfig } from "@/platform/config";
import { openCliDb } from "@/platform/runtime";
import { buildSessionCookie } from "@/lib/api/auth";
import {
  insertApiSession,
  listUserRoleNames,
} from "@/adapters/sqlite/auth-queries";
import { ensureAuthSchema } from "@/adapters/sqlite/auth-schema";

const SESSION_DAYS = 7;

export async function POST(request: Request): Promise<Response> {
  const config = resolveConfig({ envVars: process.env });

  if (config.env !== "local") {
    return new Response(null, { status: 404 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!email) {
    return Response.json({ error: "email is required" }, { status: 400 });
  }

  const db = openCliDb(config);
  try {
    ensureAuthSchema(db);

    const user = db
      .prepare("SELECT id, email, status FROM users WHERE LOWER(email) = ?")
      .get(email) as { id: string; email: string; status: string } | undefined;

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const sessionToken = `sess_${randomUUID().replace(/-/g, "")}`;
    const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + SESSION_DAYS);

    insertApiSession(db, {
      id: randomUUID(),
      userId: user.id,
      sessionTokenHash: tokenHash,
      createdAtIso: now.toISOString(),
      expiresAtIso: expires.toISOString(),
      lastSeenAtIso: now.toISOString(),
      ipAddress: "dev-switcher",
      userAgent: "dev-switcher",
    });

    const roles = listUserRoleNames(db, user.id);

    return Response.json(
      { user: { id: user.id, email: user.email, roles } },
      {
        headers: {
          "set-cookie": buildSessionCookie(sessionToken, config.env),
        },
      },
    );
  } finally {
    db.close();
  }
}
