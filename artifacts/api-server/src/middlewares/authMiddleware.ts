import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
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

  req.user = refreshed.user;

  // Sincronizar permisos en tiempo real desde la base de datos
  if (req.user?.id || req.user?.email) {
    try {
      const { db, usersTable } = await import("@workspace/db");
      const { eq, or } = await import("drizzle-orm");
      const conditions = [];
      if (req.user.id) conditions.push(eq(usersTable.id, req.user.id));
      if (req.user.email) conditions.push(eq(usersTable.email, req.user.email));

      const [dbUser] = await db
        .select()
        .from(usersTable)
        .where(or(...conditions))
        .limit(1);

      if (dbUser) {
        req.user = {
          ...req.user,
          isAdmin: Number(dbUser.isAdmin) >= 1 ? 1 : 0,
          isClubAdmin: Number(dbUser.isClubAdmin) >= 1 ? 1 : 0,
          clubId: dbUser.clubId ?? (req.user as any).clubId,
        };
      }
    } catch {}
  }

  // Lista de Super Administradores maestros garantizados
  const SUPER_ADMINS = [
    "mauricio.bau@gmail.com",
    "pedidosltdc@gmail.com",
    "admin@padeltracker.com",
    "mbau73@hotmail.com"
  ];
  if (req.user?.email && SUPER_ADMINS.includes(req.user.email.toLowerCase())) {
    req.user.isAdmin = 1;
    req.user.isClubAdmin = 1;
  }

  next();
}
