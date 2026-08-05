import type { Request, Response, NextFunction } from "express";

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
