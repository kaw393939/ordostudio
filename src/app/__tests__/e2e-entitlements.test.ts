import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const discordClient = vi.hoisted(() => {
  return {
    getGuildMemberRoles: vi.fn(async () => ({ user_id: "123456789012345678", roles: [] as string[] })),
    addGuildMemberRole: vi.fn(async () => {}),
    removeGuildMemberRole: vi.fn(async () => {}),
    requireDiscordGuildId: vi.fn(() => "guild_test"),
  };
});

vi.mock("@/adapters/discord/discord-client", () => discordClient);

import { GET as getEntitlements, POST as postEntitlements } from "../api/v1/admin/entitlements/route";
import { POST as postDiscordLink } from "../api/v1/admin/entitlements/discord-link/route";
import { GET as getDiscordPlan, POST as postDiscordApply } from "../api/v1/admin/entitlements/discord-sync/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e entitlements + Discord mapping", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
    process.env.DISCORD_GUILD_ID = "guild_test";
    process.env.DISCORD_ENTITLEMENT_ROLE_MAP_JSON = JSON.stringify({ COMMUNITY: "role_community" });
    process.env.DISCORD_BOT_TOKEN = "bot_test";

    discordClient.getGuildMemberRoles.mockClear();
    discordClient.addGuildMemberRole.mockClear();
    discordClient.removeGuildMemberRole.mockClear();
  });

  afterEach(async () => {
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_ENTITLEMENT_ROLE_MAP_JSON;
    delete process.env.DISCORD_BOT_TOKEN;
    await cleanupStandardE2EFixtures();
  });

  it("grants/revokes entitlements and can plan/apply Discord role sync", async () => {
    const grant = await postEntitlements(
      new Request("http://localhost:3000/api/v1/admin/entitlements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          action: "grant",
          user_id: fixture.userId,
          entitlement_key: "COMMUNITY",
          reason: "Member",
        }),
      }),
    );

    expect(grant.status).toBe(200);
    const grantBody = (await grant.json()) as { status: string; entitlement_key: string };
    expect(grantBody.status).toBe("GRANTED");
    expect(grantBody.entitlement_key).toBe("COMMUNITY");

    const list = await getEntitlements(
      new Request(`http://localhost:3000/api/v1/admin/entitlements?user_id=${fixture.userId}`, {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
    );

    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { count: number; items: Array<{ entitlement_key: string; status: string }> };
    expect(listBody.count).toBeGreaterThan(0);
    expect(listBody.items.some((item) => item.entitlement_key === "COMMUNITY" && item.status === "GRANTED")).toBe(true);

    const link = await postDiscordLink(
      new Request("http://localhost:3000/api/v1/admin/entitlements/discord-link", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          user_id: fixture.userId,
          discord_user_id: "123456789012345678",
        }),
      }),
    );

    expect(link.status).toBe(200);

    const plan = await getDiscordPlan(
      new Request("http://localhost:3000/api/v1/admin/entitlements/discord-sync", {
        headers: { cookie: fixture.adminCookie },
      }),
    );

    expect(plan.status).toBe(200);
    const planBody = (await plan.json()) as { count: number; items: Array<{ add_role_ids: string[] }> };
    expect(planBody.count).toBe(1);
    expect(planBody.items[0].add_role_ids).toContain("role_community");

    const applyWithoutConfirm = await postDiscordApply(
      new Request("http://localhost:3000/api/v1/admin/entitlements/discord-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ confirm: false }),
      }),
    );

    expect(applyWithoutConfirm.status).toBe(412);

    const apply = await postDiscordApply(
      new Request("http://localhost:3000/api/v1/admin/entitlements/discord-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ confirm: true }),
      }),
    );

    expect(apply.status).toBe(200);
    expect(discordClient.addGuildMemberRole).toHaveBeenCalledWith({
      guildId: "guild_test",
      discordUserId: "123456789012345678",
      roleId: "role_community",
    });

    const revoke = await postEntitlements(
      new Request("http://localhost:3000/api/v1/admin/entitlements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          action: "revoke",
          user_id: fixture.userId,
          entitlement_key: "COMMUNITY",
          reason: "Expired",
        }),
      }),
    );

    expect(revoke.status).toBe(200);
    const revokeBody = (await revoke.json()) as { status: string };
    expect(revokeBody.status).toBe("REVOKED");
  });

  it("grantEntitlementAdmin is idempotent — granting same key twice does not throw and returns GRANTED both times", async () => {
    const first = await postEntitlements(
      new Request("http://localhost:3000/api/v1/admin/entitlements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          action: "grant",
          user_id: fixture.userId,
          entitlement_key: "IDEMPOTENCY_TEST",
        }),
      }),
    );
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { status: string };
    expect(firstBody.status).toBe("GRANTED");

    // Second grant of the same key — must return 200 GRANTED, not 500.
    const second = await postEntitlements(
      new Request("http://localhost:3000/api/v1/admin/entitlements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          action: "grant",
          user_id: fixture.userId,
          entitlement_key: "IDEMPOTENCY_TEST",
        }),
      }),
    );
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { status: string };
    expect(secondBody.status).toBe("GRANTED");
  });
});
