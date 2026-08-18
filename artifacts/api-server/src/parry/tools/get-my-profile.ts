import type {
  ParryProfile,
  ParryTool,
  ParryToolContext,
  ParryToolResult,
} from "../parry.types";

export type ParryProfileReader = {
  getProfile: (input: {
    userId: string;
    playerId: number;
    clubId: number;
  }) => Promise<ParryProfile | null>;
};

/**
 * First Parry tool. The data reader is injected so this module does not
 * couple Parry to Drizzle, PostgreSQL, or any existing route.
 */
export function createGetMyProfileTool(
  reader: ParryProfileReader,
): ParryTool<Record<string, never>, ParryProfile> {
  return {
    name: "get_my_profile",
    description: "Returns the authenticated player's basic profile within the authorized club context.",
    execute: async (
      _args: Record<string, never>,
      context: ParryToolContext,
    ): Promise<ParryToolResult<ParryProfile>> => {
      if (!context.playerId) {
        return {
          ok: false,
          error: "NO_PLAYER",
          message: "The authenticated account is not linked to a player.",
        };
      }

      if (!context.clubId) {
        return {
          ok: false,
          error: "NO_CLUB",
          message: "The authenticated account has no authorized club context.",
        };
      }

      const profile = await reader.getProfile({
        userId: context.userId,
        playerId: context.playerId,
        clubId: context.clubId,
      });

      if (!profile || profile.clubId !== context.clubId || profile.playerId !== context.playerId) {
        return {
          ok: false,
          error: "NOT_FOUND",
          message: "Player profile not found in the authorized context.",
        };
      }

      return { ok: true, data: profile };
    },
  };
}
