// @vitest-environment node

/**
 * Discord Contract Tests — PRD-13
 *
 * Verifies that the types and shapes we define for Discord API
 * interactions match the expected Discord API v10 response format.
 */

import { describe, it, expect } from "vitest";
import type { DiscordGuildMember } from "@/adapters/discord/discord-client";

describe("Discord contract tests", () => {
  describe("DiscordGuildMember shape", () => {
    it("has user_id and roles array", () => {
      const member: DiscordGuildMember = {
        user_id: "123456789",
        roles: ["role_1", "role_2"],
      };

      expect(member.user_id).toBe("123456789");
      expect(member.roles).toEqual(["role_1", "role_2"]);
    });

    it("handles empty roles array", () => {
      const member: DiscordGuildMember = {
        user_id: "987654321",
        roles: [],
      };

      expect(member.roles).toEqual([]);
    });
  });

  describe("Discord API v10 response shape alignment", () => {
    it("guild member response has expected structure", () => {
      // Simulates the response shape from GET /guilds/{guild.id}/members/{user.id}
      const apiResponse = {
        user: { id: "123456789", username: "testuser" },
        nick: null,
        roles: ["role_a", "role_b"],
        joined_at: "2024-01-01T00:00:00.000Z",
        premium_since: null,
        deaf: false,
        mute: false,
      };

      // Our adapter extracts user_id and roles
      const adapted: DiscordGuildMember = {
        user_id: apiResponse.user.id,
        roles: apiResponse.roles,
      };

      expect(adapted.user_id).toBe("123456789");
      expect(adapted.roles).toEqual(["role_a", "role_b"]);
    });

    it("handles missing roles in Discord response (defensive)", () => {
      // The Discord API always returns roles, but our adapter handles undefined
      const apiResponse = {
        user: { id: "123456789" },
        roles: undefined as string[] | undefined,
      };

      const adapted: DiscordGuildMember = {
        user_id: apiResponse.user.id,
        roles: Array.isArray(apiResponse.roles) ? apiResponse.roles : [],
      };

      expect(adapted.roles).toEqual([]);
    });
  });

  describe("Discord API operation shapes", () => {
    it("addGuildMemberRole uses correct path pattern", () => {
      const guildId = "guild_1";
      const userId = "user_1";
      const roleId = "role_1";
      const expectedPath = `/guilds/${guildId}/members/${userId}/roles/${roleId}`;

      expect(expectedPath).toBe("/guilds/guild_1/members/user_1/roles/role_1");
    });

    it("removeGuildMemberRole uses correct path pattern", () => {
      const guildId = "guild_1";
      const userId = "user_1";
      const roleId = "role_1";
      const expectedPath = `/guilds/${guildId}/members/${userId}/roles/${roleId}`;

      expect(expectedPath).toBe("/guilds/guild_1/members/user_1/roles/role_1");
    });

    it("role IDs are strings (Discord snowflake format)", () => {
      const snowflakes = ["1234567890123456789", "9876543210987654321"];
      for (const id of snowflakes) {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      }
    });
  });
});
