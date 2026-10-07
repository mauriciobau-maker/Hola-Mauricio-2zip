import type { Request, Response, NextFunction } from "express";
import { db, clubsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function resolveEffectiveClubId(req: Request): Promise<number | null> {
  // 1. Authenticated user clubId
  const userClubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  if (userClubId) return userClubId;

  // 2. Query param ?clubId=
  if (req.query.clubId) {
    const parsed = Number(req.query.clubId);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 3. Query param ?club= (slug)
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

  // 4. Default: first active club in DB
  try {
    const [firstActive] = await db
      .select({ id: clubsTable.id })
      .from(clubsTable)
      .where(eq(clubsTable.active, true))
      .orderBy(clubsTable.id)
      .limit(1);

    if (firstActive?.id) return firstActive.id;

    const [firstClub] = await db
      .select({ id: clubsTable.id })
      .from(clubsTable)
      .orderBy(clubsTable.id)
      .limit(1);

    return firstClub?.id ?? null;
  } catch {
    return 1;
  }
}

export function isSuperAdminUser(
  user: { isAdmin?: number | boolean | null; role?: string | null } | undefined,
): boolean {
  return (
    user?.isAdmin === 1 ||
    user?.isAdmin === true ||
    user?.role === "superadmin" ||
    user?.role === "admin" ||
    user?.role === "SUPER_ADMIN"
  );
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
 * Example usage (do not apply yet — P0-003-B):
 *
 *   import { requireAuth, requireClub } from "../middlewares/requireCommunity";
 *
 *   // Protect an entire router:
 *   router.use("/encuentros", requireAuth, requireClub, encuentrosRouter);
 *
 *   // Protect a single endpoint:
 *   router.delete("/matches/:id", requireAuth, requireClub, async (req, res) => { ... });
 */
