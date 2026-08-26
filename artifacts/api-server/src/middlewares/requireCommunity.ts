import type { Request, Response, NextFunction } from "express";

export function isSuperAdminUser(
  user: { isAdmin?: number | boolean | null } | undefined,
): boolean {
  // Global access is intentionally tied only to the persisted super-admin flag.
  // Roles are not part of the authenticated user contract and must not grant it.
  return user?.isAdmin === 1 || user?.isAdmin === true;
}

/**
 * Returns the club selected in the current request.
 *
 * Normal users are always scoped by their persisted membership.
 * Super Admins may temporarily select a club through the server-set/client
 * context cookie used by the public-club flow. This does NOT change their
 * global admin privileges; it only scopes club-facing queries for this request.
 */
export function getCurrentClubId(req: Request): number | null {
  const user = req.user as
    | { clubId?: number | null; isAdmin?: number | boolean | null }
    | undefined;

  if (!isSuperAdminUser(user)) {
    return user?.clubId ?? null;
  }

  const requestedClubId = Number(req.query?.clubId);
  if (Number.isInteger(requestedClubId) && requestedClubId > 0) {
    return requestedClubId;
  }

  const activeClubId = Number(req.cookies?.padel_tracker_active_club_id);
  return Number.isInteger(activeClubId) && activeClubId > 0 ? activeClubId : null;
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
  if (isSuperAdminUser(req.user)) {
    next();
    return;
  }

  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  if (clubId == null) {
    res.status(403).json({ error: "Community membership required" });
    return;
  }
  next();
}

/**
 * Requires authentication and a community scope, except for Super Admins.
 * Super Admins intentionally keep global access without a persisted clubId.
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
