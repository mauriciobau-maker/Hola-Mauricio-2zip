import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, clubsTable, playersTable } from "@workspace/db";
import { isSuperAdminUser } from "../middlewares/requireCommunity";

const router: IRouter = Router();

async function getUserWithClub(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;

  let club = null;
  if (user.clubId) {
    const [c] = await db
      .select({ id: clubsTable.id, name: clubsTable.name, slug: clubsTable.slug, plan: clubsTable.plan })
      .from(clubsTable)
      .where(eq(clubsTable.id, user.clubId));
    club = c ?? null;
  }

  return { ...user, club };
}

// GET /api/auth/user — el frontend la llama para saber quién está logueado
// y con qué club/rol/jugador queda asociado. authMiddleware ya dejó
// req.user resuelto (o vacío) antes de llegar acá.
router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    res.json({ user: null });
    return;
  }
  res.json({ user: await getUserWithClub(req.user.id) });
});

// POST /api/auth/link-player — vincula la cuenta logueada a un jugador
// existente del club (sin esto, un usuario tiene login pero no participa).
router.post("/auth/link-player", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const { playerId } = req.body;
  if (!playerId || typeof playerId !== "number") {
    res.status(400).json({ error: "playerId requerido" });
    return;
  }

  const sessionUser = req.user as { clubId?: number | null; isAdmin?: number | boolean | null };
  const [player] = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(
      isSuperAdminUser(sessionUser)
        ? eq(playersTable.id, playerId)
        : and(eq(playersTable.id, playerId), eq(playersTable.clubId, sessionUser.clubId!)),
    );

  if (!player) {
    res.status(404).json({ error: "Jugador no encontrado" });
    return;
  }

  const [linkedUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.playerId, playerId))
    .limit(1);

  if (linkedUser) {
    res.status(409).json({ error: "Este jugador ya está vinculado a otra cuenta" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ playerId, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  res.json({ user: updated });
});

// POST /api/auth/join-club — el flujo de Onboarding: el usuario escribe un
// código de invitación y queda asociado a ese club.
router.post("/auth/join-club", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const { inviteCode } = req.body;
  if (!inviteCode || typeof inviteCode !== "string") {
    res.status(400).json({ error: "Código de invitación requerido" });
    return;
  }

  const [club] = await db
    .select()
    .from(clubsTable)
    .where(eq(clubsTable.inviteCode, inviteCode.toUpperCase().trim()));

  if (!club) {
    res.status(404).json({ error: "Código de invitación inválido" });
    return;
  }
  if (!club.active) {
    res.status(403).json({ error: "Este club no está activo" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ clubId: club.id, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  res.json({ success: true, club: { id: club.id, name: club.name, slug: club.slug }, user: updated });
});

export default router;
