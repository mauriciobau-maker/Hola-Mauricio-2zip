import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
  type SessionData,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) return null;

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(
      config,
      session.refresh_token,
    );
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at = tokens.expiresIn()
      ? now + tokens.expiresIn()!
      : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

/**
 * The session contains a snapshot of the user. Authorization attributes that
 * live in the application database must not become stale after an admin/club
 * change, so refresh them for each authenticated request.
 *
 * Authorization flags are normalized here to the canonical numeric form used
 * by the existing RBAC layer. This prevents a boolean/string representation
 * mismatch from making the same Super Admin appear authorized in the client
 * but unauthorized to a protected API route.
 */
async function hydrateCurrentUser(session: SessionData): Promise<SessionData> {
  const [dbUser] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      clubId: usersTable.clubId,
      isAdmin: usersTable.isAdmin,
      isClubAdmin: usersTable.isClubAdmin,
      playerId: usersTable.playerId,
    })
    .from(usersTable)
    .where(eq(usersTable.id, session.user.id));

  if (!dbUser) return session;

  session.user = {
    ...session.user,
    ...dbUser,
    isAdmin: dbUser.isAdmin ? 1 : 0,
    isClubAdmin: dbUser.isClubAdmin ? 1 : 0,
  } as AuthUser;

  return session;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  try {
    const hydrated = await hydrateCurrentUser(refreshed);
    req.user = hydrated.user;
  } catch (error) {
    console.error("Error actualizando autorización del usuario:", error);
    req.user = refreshed.user;
  }

  next();
}
