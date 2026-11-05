import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
  isDemoLoginAllowed,
  type SessionData,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {
      role?: string;
      memberships?: Array<{
        id: number;
        clubId: number;
        role: string;
        playerId?: number | null;
        clubName?: string;
        clubSlug?: string;
        clubLogoUrl?: string | null;
        clubPlan?: string | null;
        status: string;
      }>;
      activeMembership?: any;
    }

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

  let session = await getSession(sid);

  // Soporte para tokens de demostración / cross-origin sin cookies de terceros (limitado a entorno demo)
  const allowDemo = isDemoLoginAllowed();

  if (!session?.user?.id && sid.startsWith("demo-token-") && allowDemo) {
    const role = sid.replace("demo-token-", "").toLowerCase();
    if (role === "superadmin" || role === "admin" || role === "mauricio") {
      session = {
        user: {
          id: "usr_superadmin_mauricio",
          email: "mauricio.bau@gmail.com",
          firstName: "Mauricio",
          lastName: "Bau",
          profileImageUrl: null,
          clubId: 1,
          playerId: 9,
          isAdmin: 1,
          isClubAdmin: 1,
        },
        access_token: sid,
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
      };
    } else if (role === "admin_central" || role === "colaborador") {
      session = {
        user: {
          id: "usr_colaborador_demo",
          email: "admin.club@padeltracker.com",
          firstName: "Admin",
          lastName: "Pádel Central",
          profileImageUrl: null,
          clubId: 1,
          isAdmin: 0,
          isClubAdmin: 1,
        },
        access_token: sid,
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
      };
    } else if (role === "admin_tenis") {
      session = {
        user: {
          id: "usr_admin_tenis",
          email: "admin.tenis@club.com",
          firstName: "Admin",
          lastName: "Real Tenis Club",
          profileImageUrl: null,
          clubId: 2,
          isAdmin: 0,
          isClubAdmin: 1,
        },
        access_token: sid,
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
      };
    } else if (role === "admin_futbol") {
      session = {
        user: {
          id: "usr_admin_futbol",
          email: "admin.futbol@club.com",
          firstName: "Admin",
          lastName: "Liga Fútbol 5 & 7",
          profileImageUrl: null,
          clubId: 3,
          isAdmin: 0,
          isClubAdmin: 1,
        },
        access_token: sid,
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
      };
    } else if (role === "admin_multi") {
      session = {
        user: {
          id: "usr_admin_multi",
          email: "admin.multisport@club.com",
          firstName: "Admin",
          lastName: "Multisport Arena",
          profileImageUrl: null,
          clubId: 4,
          isAdmin: 0,
          isClubAdmin: 1,
        },
        access_token: sid,
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
      };
    } else {
      session = {
        user: {
          id: "usr_jugador_demo",
          email: "jugador@padeltracker.com",
          firstName: "Carlos",
          lastName: "Ruiz",
          profileImageUrl: null,
          clubId: 1,
          playerId: 1,
          isAdmin: 0,
          isClubAdmin: 0,
        },
        access_token: sid,
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
      };
    }
  }

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

  // Sincronizar membresías y permisos en tiempo real desde la base de datos
  if (req.user?.id || req.user?.email) {
    try {
      const { db, usersTable, membershipsTable, clubsTable } = await import("@workspace/db");
      const { eq, or, and } = await import("drizzle-orm");
      const conditions = [];
      if (req.user.id) conditions.push(eq(usersTable.id, req.user.id));
      if (req.user.email) conditions.push(eq(usersTable.email, req.user.email));

      const [dbUser] = await db
        .select()
        .from(usersTable)
        .where(or(...conditions))
        .limit(1);

      if (dbUser) {
        // Lista de Super Administradores maestros garantizados
        const SUPER_ADMINS = [
          "mauricio.bau@gmail.com",
          "pedidosltdc@gmail.com",
          "admin@padeltracker.com",
          "mbau73@hotmail.com"
        ];
        const isMasterSuperAdmin = Boolean(
          (dbUser.email && SUPER_ADMINS.includes(dbUser.email.toLowerCase())) ||
          Number(dbUser.isAdmin) >= 1
        );

        // Consultar todas las membresías activas del usuario en clubes activos
        const userMemberships = await db
          .select({
            id: membershipsTable.id,
            clubId: membershipsTable.clubId,
            role: membershipsTable.role,
            playerId: membershipsTable.playerId,
            status: membershipsTable.status,
            clubName: clubsTable.name,
            clubSlug: clubsTable.slug,
            clubLogoUrl: clubsTable.logoUrl,
            clubPlan: clubsTable.plan,
          })
          .from(membershipsTable)
          .innerJoin(clubsTable, eq(membershipsTable.clubId, clubsTable.id))
          .where(
            and(
              eq(membershipsTable.userId, dbUser.id),
              eq(membershipsTable.status, "active"),
              eq(clubsTable.active, true)
            )
          );

        // Determinar club activo:
        // 1. Si es Super Admin y envió x-club-id o query clubId
        // 2. session.activeClubId
        // 3. dbUser.clubId (último club activo persistido)
        // 4. Primera membresía activa disponible
        let targetClubId: number | null = null;

        if (isMasterSuperAdmin) {
          const headerClubId = req.headers["x-club-id"];
          if (headerClubId) {
            const parsed = Number(Array.isArray(headerClubId) ? headerClubId[0] : headerClubId);
            if (!isNaN(parsed) && parsed > 0) targetClubId = parsed;
          }
          if (!targetClubId && req.query.clubId) {
            const parsed = Number(req.query.clubId);
            if (!isNaN(parsed) && parsed > 0) targetClubId = parsed;
          }
        }

        if (!targetClubId) {
          targetClubId = (session as any).activeClubId ?? dbUser.clubId ?? userMemberships[0]?.clubId ?? null;
        }

        // Buscar la membresía específica para el club activo
        const activeMembership = userMemberships.find((m) => m.clubId === targetClubId) ?? null;

        if (isMasterSuperAdmin) {
          req.user = {
            ...req.user,
            id: dbUser.id,
            email: dbUser.email,
            isAdmin: 1,
            isClubAdmin: 1,
            role: "superadmin",
            clubId: targetClubId ?? dbUser.clubId ?? null,
            playerId: activeMembership?.playerId ?? dbUser.playerId ?? null,
            memberships: userMemberships,
            activeMembership,
          };
        } else if (activeMembership) {
          // El rol y la ficha se derivan estrictamente de la membresía activa en ese club
          const isClubAdmin = activeMembership.role === "club_admin" || activeMembership.role === "admin" ? 1 : 0;
          req.user = {
            ...req.user,
            id: dbUser.id,
            email: dbUser.email,
            isAdmin: 0,
            isClubAdmin,
            role: activeMembership.role,
            clubId: activeMembership.clubId,
            playerId: activeMembership.playerId ?? null,
            memberships: userMemberships,
            activeMembership,
          };
        } else {
          // Usuario sin membresía activa en el club solicitado
          req.user = {
            ...req.user,
            id: dbUser.id,
            email: dbUser.email,
            isAdmin: 0,
            isClubAdmin: 0,
            role: "player",
            clubId: null,
            playerId: null,
            memberships: userMemberships,
            activeMembership: null,
          };
        }
      }
    } catch (e) {
      console.error("Error sincronizando membresías en authMiddleware:", e);
    }
  }

  next();
}
