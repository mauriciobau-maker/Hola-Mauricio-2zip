import type { Request, Response, NextFunction } from "express";
import { db, clubsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function isSuperAdminUser(
  user: { isAdmin?: number | boolean | null; role?: string | null; email?: string | null } | undefined,
): boolean {
  if (!user) return false;
  const SUPER_ADMINS = [
    "mauricio.bau@gmail.com",
    "pedidosltdc@gmail.com",
    "admin@padeltracker.com",
    "mbau73@hotmail.com"
  ];
  if (user.email && SUPER_ADMINS.includes(user.email.toLowerCase())) {
    return true;
  }
  return (
    Number(user.isAdmin) >= 1 ||
    user.isAdmin === true ||
    user.role === "superadmin" ||
    user.role === "admin" ||
    user.role === "SUPER_ADMIN"
  );
}

export function isClubAdminUser(
  user: { isAdmin?: number | boolean | null; isClubAdmin?: number | boolean | null; role?: string | null; email?: string | null; clubId?: number | null } | undefined,
  targetClubId?: number | null,
): boolean {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;

  const isClubAdmin =
    Number(user.isClubAdmin) >= 1 ||
    user.isClubAdmin === true ||
    user.role === "club_admin" ||
    user.role === "adminclub" ||
    user.role === "colaborador" ||
    user.role === "staff";

  if (!isClubAdmin) return false;
  if (targetClubId != null && user.clubId != null) {
    return user.clubId === targetClubId;
  }
  return true;
}

export async function resolveEffectiveClubId(req: Request): Promise<number | null> {
  const user = req.user as { clubId?: number | null } | undefined;

  // 1. Authenticated user
  if (user) {
    // Solo un Super Admin puede consultar o alternar de club mediante parámetros de petición
    if (isSuperAdminUser(req.user)) {
      if (req.query.clubId) {
        const parsed = Number(req.query.clubId);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      const headerClubId = req.headers["x-club-id"];
      if (headerClubId) {
        const parsed = Number(Array.isArray(headerClubId) ? headerClubId[0] : headerClubId);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (req.body && typeof req.body === "object" && (req.body as any).clubId) {
        const parsed = Number((req.body as any).clubId);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (typeof req.query.club === "string" && req.query.club.trim()) {
        try {
          const [found] = await db
            .select({ id: clubsTable.id })
            .from(clubsTable)
            .where(eq(clubsTable.slug, req.query.club.trim()))
            .limit(1);
          if (found?.id) return found.id;
        } catch {}
      }
      // Si el Super Admin no envió override explícito, usar su clubId asignado
      if (user.clubId) return user.clubId;
    } else {
      // Usuario autenticado regular: EL CLUB SE DERIVA ESTRICTAMENTE DE LA SESIÓN.
      // Se ignoran tajantemente manipulaciones de ?clubId= o cabeceras x-club-id externas.
      return user.clubId ?? null;
    }
  }

  // 2. Unauthenticated / Public access (ej. landing page pública por slug)
  if (typeof req.query.club === "string" && req.query.club.trim()) {
    try {
      const [found] = await db
        .select({ id: clubsTable.id })
        .from(clubsTable)
        .where(
          and(
            eq(clubsTable.slug, req.query.club.trim()),
            eq(clubsTable.active, true)
          )
        )
        .limit(1);
      if (found?.id) return found.id;
    } catch {}
  }

  return null;
}

/**
 * requireAuth
 *
 * Rejects requests with no active session.
 * Must be applied before any handler that accesses user-specific data.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/**
 * requireClub
 *
 * Rejects authenticated requests where the user has not yet joined a community.
 * Depends on requireAuth having run first (or an equivalent check).
 */
export function requireClub(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  if (clubId == null) {
    res.status(403).json({ error: "Community membership required" });
    return;
  }
  next();
}

/**
 * Requires authentication and a community scope, except for Super Admins.
 * Super Admins intentionally keep global access without a clubId.
 */
export function requireCommunityAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (isSuperAdminUser(req.user)) {
    next();
    return;
  }

  const clubId = (req.user as { clubId?: number | null }).clubId;
  if (clubId == null) {
    res.status(403).json({ error: "Community membership required" });
    return;
  }

  next();
}

/**
 * Rejects requests if user is not Club Admin or Super Admin.
 */
export function requireClubAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (isSuperAdminUser(req.user)) {
    next();
    return;
  }

  if (isClubAdminUser(req.user)) {
    next();
    return;
  }

  res.status(403).json({ error: "Club Admin role required" });
}

/**
 * Rejects requests if user is not Super Admin.
 */
export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (isSuperAdminUser(req.user)) {
    next();
    return;
  }

  res.status(403).json({ error: "Super Admin role required" });
}
