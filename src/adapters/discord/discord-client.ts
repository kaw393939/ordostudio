export type DiscordGuildMember = {
  user_id: string;
  roles: string[];
};

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`${key}_missing`);
  }
  return value;
};

const discordBaseUrl = () => "https://discord.com/api/v10";

const discordHeaders = (): Record<string, string> => {
  const token = requireEnv("DISCORD_BOT_TOKEN");
  return {
    authorization: `Bot ${token}`,
    "content-type": "application/json",
  };
};

export const getGuildMemberRoles = async (input: {
  guildId: string;
  discordUserId: string;
}): Promise<DiscordGuildMember> => {
  const response = await fetch(`${discordBaseUrl()}/guilds/${input.guildId}/members/${input.discordUserId}`, {
    headers: discordHeaders(),
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`discord_member_fetch_failed_${response.status}`);
  }

  const body = (await response.json()) as { roles?: string[] };
  return {
    user_id: input.discordUserId,
    roles: Array.isArray(body.roles) ? body.roles : [],
  };
};

export const addGuildMemberRole = async (input: {
  guildId: string;
  discordUserId: string;
  roleId: string;
}): Promise<void> => {
  const response = await fetch(
    `${discordBaseUrl()}/guilds/${input.guildId}/members/${input.discordUserId}/roles/${input.roleId}`,
    {
      headers: discordHeaders(),
      method: "PUT",
    },
  );

  if (!response.ok) {
    throw new Error(`discord_role_add_failed_${response.status}`);
  }
};

export const removeGuildMemberRole = async (input: {
  guildId: string;
  discordUserId: string;
  roleId: string;
}): Promise<void> => {
  const response = await fetch(
    `${discordBaseUrl()}/guilds/${input.guildId}/members/${input.discordUserId}/roles/${input.roleId}`,
    {
      headers: discordHeaders(),
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(`discord_role_remove_failed_${response.status}`);
  }
};

export const requireDiscordGuildId = (): string => requireEnv("DISCORD_GUILD_ID");
