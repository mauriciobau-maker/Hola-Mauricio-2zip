import type { Request, Response, NextFunction } from "express";

/**
 * SUPER_ADMIN has global authority. isClubAdmin may coexist as legacy/secondary
 * role data and must never downgrade a Super Admin to club-admin scope.
 *
 * The database flag is the canonical authority. Legacy role text and string
 * values are accepted only as compatibility inputs while older sessions/code
 * are being normalized at the authentication boundary.
 */
export function isSuperAdminUser(
  user: {
    isAdmin?: number | boolean | string | null;
    isClubAdmin?: number | boolean | string | null;
    role?: string | null;
  } | undefined,
): boolean {
  return (
    user?.isAdmin === 1 ||
    user?.isAdmin === true ||
    user?.isAdmin === "1" ||
    user?.role === "superadmin" ||
    user?.role === "admin"
  );
}

/** Selected club context for the current request. Super Admin keeps global privileges,
 * but club-facing endpoints can operate on the selected club. */
export function getCurrentClubId(req: Request): number | null {
  const user = req.user as {
    clubId?: number | null;
    isAdmin?: number | boolean | string | null;
    isClubAdmin?: number | boolean | string | null;
    role?: string | null;
  } | undefined;
  if (!isSuperAdminUser(user)) return user?.clubId ?? null;

  // Once requireCommunityAccess has resolved the active Super Admin context,
  // prefer that request-scoped value. This prevents individual routes from
  // re-resolving the cookie independently and guarantees they see the same
  // community scope for the lifetime of the request.
  const scopedClubId = Number(user?.clubId);
  if (Number.isInteger(scopedClubId) && scopedClubId > 0) return scopedClubId;

  const requestedClubId = Number(req.query?.clubId);
  if (Number.isInteger(requestedClubId) && requestedClubId > 0) return requestedClubId;

  const activeClubId = Number(req.cookies?.padel_tracker_active_club_id);
  return Number.isInteger(activeClubId) && activeClubId > 0 ? activeClubId : null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  next();
}

export function requireClub(req: Request, res: Response, next: NextFunction): void {
  if (isSuperAdminUser(req.user)) { next(); return; }
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  if (clubId == null) { res.status(403).json({ error: "Community membership required" }); return; }
  next();
}

export function requireCommunityAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }

  if (isSuperAdminUser(req.user)) {
    // Keep the persisted session unchanged. This assignment is request-scoped and
    // lets legacy club-facing handlers that read req.user.clubId honor the selected
    // Super Admin club without turning the Super Admin into a club member.
    const selectedClubId = getCurrentClubId(req);
    if (selectedClubId) {
      (req.user as { clubId?: number | null }).clubId = selectedClubId;
    }
    next();
    return;
  }

  const clubId = (req.user as { clubId?: number | null }).clubId;
  if (clubId == null) { res.status(403).json({ error: "Community membership required" }); return; }
  next();
}
