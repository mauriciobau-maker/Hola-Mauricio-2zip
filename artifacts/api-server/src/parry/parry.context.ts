import type { ParryContext } from "./parry.types";

type ContextUser = {
  id?: number;
  playerId?: number | null;
  clubId?: number | null;
  role?: string | null;
  language?: string | null;
};

/**
 * Builds the minimum trusted context Parry is allowed to use.
 * The club is derived from the authenticated user; callers must not
 * take clubId from the user's prompt as an authorization source.
 */
export function buildParryContext(user: ContextUser | null | undefined): ParryContext | null {
  if (!user?.id) return null;

  return {
    userId: user.id,
    playerId: user.playerId ?? null,
    clubId: user.clubId ?? null,
    role: user.role ?? null,
    language: user.language || "es",
  };
}

export function requireParryContext(
  context: ParryContext | null,
): ParryContext {
  if (!context) {
    throw new Error("Parry requires an authenticated user context");
  }
  return context;
}
