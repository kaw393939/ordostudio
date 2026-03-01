import { resolveConfig } from "@/platform/config";
import { openCliDb } from "@/platform/runtime";

export async function GET(): Promise<Response> {
  const config = resolveConfig({ envVars: process.env });

  if (config.env !== "local") {
    return new Response(null, { status: 404 });
  }

  const db = openCliDb(config);
  try {
    const rows = db.prepare(`
      SELECT u.id, u.email, u.status,
        GROUP_CONCAT(r.name) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.status = 'ACTIVE'
      GROUP BY u.id
      ORDER BY u.email
      LIMIT 50
    `).all() as Array<{ id: string; email: string; status: string; roles: string | null }>;

    const users = rows.map((r) => ({
      id: r.id,
      email: r.email,
      status: r.status,
      roles: r.roles ? r.roles.split(",") : [],
    }));

    return Response.json({ users });
  } finally {
    db.close();
  }
}
