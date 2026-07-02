import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clubsTable, clubSportsTable, sportsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /club — devuelve el club + deportes activos del usuario autenticado
router.get("/club", async (req, res): Promise<void> => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const clubId = (req.user as { clubId?: number | null }).clubId;
  if (!clubId) {
    res.status(403).json({ error: "El usuario no pertenece a ningún club" });
    return;
  }

  const [club] = await db
    .select()
    .from(clubsTable)
    .where(eq(clubsTable.id, clubId));

  if (!club) {
    res.status(404).json({ error: "Club no encontrado" });
    return;
  }

  const clubSports = await db
    .select({
      id: sportsTable.id,
      name: sportsTable.name,
      slug: sportsTable.slug,
      teamSize: sportsTable.teamSize,
      useSets: sportsTable.useSets,
      active: clubSportsTable.active,
    })
    .from(clubSportsTable)
    .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
    .where(eq(clubSportsTable.clubId, clubId));

  res.json({
    id: club.id,
    name: club.name,
    slug: club.slug,
    plan: club.plan,
    active: club.active,
    createdAt: club.createdAt.toISOString(),
    sports: clubSports,
  });
});

// PATCH /club/sports — activa o desactiva un deporte para el club
router.patch("/club/sports", async (req, res): Promise<void> => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const clubId = (req.user as { clubId?: number | null }).clubId;
  if (!clubId) {
    res.status(403).json({ error: "El usuario no pertenece a ningún club" });
    return;
  }

  const { sportId, active } = req.body as { sportId?: unknown; active?: unknown };

  if (typeof sportId !== "number" || typeof active !== "boolean") {
    res.status(400).json({ error: "Se requiere sportId (número) y active (boolean)" });
    return;
  }

  // Verificar que el deporte existe en el sistema
  const [sport] = await db
    .select()
    .from(sportsTable)
    .where(eq(sportsTable.id, sportId));

  if (!sport) {
    res.status(404).json({ error: "Deporte no encontrado" });
    return;
  }

  // Upsert: si ya existe la relación club_sport, actualiza; si no, crea
  const [existing] = await db
    .select()
    .from(clubSportsTable)
    .where(and(eq(clubSportsTable.clubId, clubId), eq(clubSportsTable.sportId, sportId)));

  if (existing) {
    await db
      .update(clubSportsTable)
      .set({ active })
      .where(and(eq(clubSportsTable.clubId, clubId), eq(clubSportsTable.sportId, sportId)));
  } else {
    await db
      .insert(clubSportsTable)
      .values({ clubId, sportId, active });
  }

  res.json({
    clubId,
    sportId,
    sportName: sport.name,
    active,
  });
});

export default router;
