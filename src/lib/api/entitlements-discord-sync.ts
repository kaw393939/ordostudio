import { openCliDb, appendAuditLog } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import {
  addGuildMemberRole,
  getGuildMemberRoles,
  removeGuildMemberRole,
  requireDiscordGuildId,
} from "@/adapters/discord/discord-client";

export type DiscordEntitlementPlanItem = {
  user_id: string;
  discord_user_id: string;
  entitlement_keys: string[];
  desired_role_ids: string[];
  current_role_ids: string[];
  add_role_ids: string[];
  remove_role_ids: string[];
};

export class DiscordSyncConfigError extends Error {
  constructor(public readonly reason: string) {
    super(`Discord sync config error: ${reason}`);
    this.name = "DiscordSyncConfigError";
  }
}

export class DiscordSyncPreconditionError extends Error {
  constructor(public readonly reason: "confirm_required") {
    super(`Discord sync precondition failed: ${reason}`);
    this.name = "DiscordSyncPreconditionError";
  }
}

const normalizeKey = (input: string): string => input.trim().toUpperCase();

const parseRoleMap = (): Record<string, string> => {
  const raw = process.env.DISCORD_ENTITLEMENT_ROLE_MAP_JSON;
  if (!raw || raw.trim().length === 0) {
    throw new DiscordSyncConfigError("role_map_missing");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DiscordSyncConfigError("role_map_invalid_json");
  }

  if (typeof parsed !== "object" || !parsed) {
    throw new DiscordSyncConfigError("role_map_invalid");
  }

  const map: Record<string, string> = {};
  for (const [key, roleId] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof roleId !== "string") continue;
    const normalizedKey = normalizeKey(key);
    const normalizedRole = roleId.trim();
    if (normalizedKey.length === 0 || normalizedRole.length === 0) continue;
    map[normalizedKey] = normalizedRole;
  }

  if (Object.keys(map).length === 0) {
    throw new DiscordSyncConfigError("role_map_empty");
  }

  return map;
};

const unique = (values: string[]): string[] => Array.from(new Set(values));

export const planDiscordRoleSyncAdmin = async (input: {
  actorId: string;
  requestId: string;
}): Promise<{ count: number; items: DiscordEntitlementPlanItem[] }> => {
  const roleMap = parseRoleMap();
  const mappedKeys = Object.keys(roleMap);
  const guildId = requireDiscordGuildId();

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const rows = db
      .prepare(
        `
SELECT e.user_id as user_id,
       uda.discord_user_id as discord_user_id,
       e.entitlement_key as entitlement_key
FROM entitlements e
JOIN user_discord_accounts uda ON uda.user_id = e.user_id
WHERE e.status = 'GRANTED'
ORDER BY e.updated_at DESC
LIMIT 200
`,
      )
      .all() as { user_id: string; discord_user_id: string; entitlement_key: string }[];

    const grouped = new Map<string, { discord_user_id: string; entitlement_keys: string[] }>();
    for (const row of rows) {
      const normalizedKey = normalizeKey(row.entitlement_key);
      if (!mappedKeys.includes(normalizedKey)) {
        continue;
      }

      const existing = grouped.get(row.user_id);
      if (!existing) {
        grouped.set(row.user_id, { discord_user_id: row.discord_user_id, entitlement_keys: [normalizedKey] });
      } else {
        existing.entitlement_keys.push(normalizedKey);
      }
    }

    const items: DiscordEntitlementPlanItem[] = [];

    for (const [userId, record] of grouped.entries()) {
      const desiredRoles = unique(record.entitlement_keys.map((key) => roleMap[key]).filter(Boolean));

      const member = await getGuildMemberRoles({
        guildId,
        discordUserId: record.discord_user_id,
      });

      const currentRoles = unique(member.roles);
      const addRoles = desiredRoles.filter((roleId) => !currentRoles.includes(roleId));
      const removeRoles = currentRoles.filter((roleId) => Object.values(roleMap).includes(roleId) && !desiredRoles.includes(roleId));

      items.push({
        user_id: userId,
        discord_user_id: record.discord_user_id,
        entitlement_keys: unique(record.entitlement_keys),
        desired_role_ids: desiredRoles,
        current_role_ids: currentRoles,
        add_role_ids: addRoles,
        remove_role_ids: removeRoles,
      });
    }

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "admin.discord.sync.plan",
      targetType: "discord",
      requestId: input.requestId,
      metadata: { count: items.length },
    });

    return { count: items.length, items };
  } finally {
    db.close();
  }
};

export const applyDiscordRoleSyncAdmin = async (input: {
  actorId: string;
  requestId: string;
  confirm: boolean;
}): Promise<{ count: number; items: DiscordEntitlementPlanItem[] }> => {
  if (!input.confirm) {
    throw new DiscordSyncPreconditionError("confirm_required");
  }

  const guildId = requireDiscordGuildId();
  const plan = await planDiscordRoleSyncAdmin({ actorId: input.actorId, requestId: input.requestId });

  for (const item of plan.items) {
    for (const roleId of item.add_role_ids) {
      await addGuildMemberRole({ guildId, discordUserId: item.discord_user_id, roleId });
    }
    for (const roleId of item.remove_role_ids) {
      await removeGuildMemberRole({ guildId, discordUserId: item.discord_user_id, roleId });
    }
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "admin.discord.sync.apply",
      targetType: "discord",
      requestId: input.requestId,
      metadata: { count: plan.items.length },
    });
  } finally {
    db.close();
  }

  return plan;
};
