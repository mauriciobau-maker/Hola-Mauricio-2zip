import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clubsTable, clubSportsTable, sportsTable, usersTable } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

const router: IRouter = Router();

// Middleware super-admin
function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: "Acceso restringido a super-administradores" });
    return;
  }
  next();
}

// GET /admin/clubs — lista todos los clubs con sus deportes
router.get("/admin/clubs", requireSuperAdmin, async (_req, res): Promise<void> => {
  const clubs = await db.select().from(clubsTable).orderBy(clubsTable.id);

  const result = await Promise.all(clubs.map(async (club) => {
    const sports = await db
      .select({
        id: sportsTable.id,
        name: sportsTable.name,
        slug: sportsTable.slug,
        active: clubSportsTable.active,
      })
      .from(clubSportsTable)
      .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
      .where(eq(clubSportsTable.clubId, club.id));

    return { ...club, sports };
  }));

  res.json(result);
});

// POST /admin/clubs — crea un club nuevo
router.post("/admin/clubs", requireSuperAdmin, async (req, res): Promise<void> => {
  const { name, slug, plan, sports } = req.body as {
    name?: string;
    slug?: string;
    plan?: string;
    sports?: number[];
  };

  if (!name || !slug) {
    res.status(400).json({ error: "name y slug son requeridos" });
    return;
  }

  const [existing] = await db.select().from(clubsTable).where(eq(clubsTable.slug, slug));
  if (existing) {
    res.status(409).json({ error: "Ya existe un club con ese slug" });
    return;
  }

  const [club] = await db
    .insert(clubsTable)
    .values({ name, slug, plan: plan ?? "basic", active: true })
    .returning();

  // Asignar deportes si se especifican
  if (sports && sports.length > 0) {
    await db.insert(clubSportsTable).values(
      sports.map((sportId) => ({ clubId: club.id, sportId, active: true }))
    );
  }

  // Devolver club con deportes
  const clubSports = await db
    .select({ id: sportsTable.id, name: sportsTable.name, slug: sportsTable.slug, active: clubSportsTable.active })
    .from(clubSportsTable)
    .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
    .where(eq(clubSportsTable.clubId, club.id));

  res.status(201).json({ ...club, sports: clubSports });
});

// PATCH /admin/clubs/:id — edita nombre, plan o active
router.patch("/admin/clubs/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { name, plan, active } = req.body as { name?: string; plan?: string; active?: boolean };
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (plan !== undefined) updates.plan = plan;
  if (active !== undefined) updates.active = active;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No hay campos para actualizar" });
    return;
  }

  const [updated] = await db
    .update(clubsTable)
    .set(updates)
    .where(eq(clubsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Club no encontrado" }); return; }

  res.json(updated);
});

// PATCH /admin/clubs/:id/sports — activa/desactiva deporte en un club
router.patch("/admin/clubs/:id/sports", requireSuperAdmin, async (req, res): Promise<void> => {
  const clubId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(clubId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { sportId, active } = req.body as { sportId?: unknown; active?: unknown };
  if (typeof sportId !== "number" || typeof active !== "boolean") {
    res.status(400).json({ error: "sportId (número) y active (boolean) son requeridos" });
    return;
  }

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
    await db.insert(clubSportsTable).values({ clubId, sportId, active });
  }

  const [sport] = await db.select().from(sportsTable).where(eq(sportsTable.id, sportId));
  res.json({ clubId, sportId, sportName: sport?.name, active });
});

// POST /admin/clubs/:id/users — asigna usuario a un club
router.post("/admin/clubs/:id/users", requireSuperAdmin, async (req, res): Promise<void> => {
  const clubId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(clubId)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { userId, isAdmin } = req.body as { userId?: string; isAdmin?: boolean };
  if (!userId) {
    res.status(400).json({ error: "userId es requerido" });
    return;
  }

  const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, clubId));
  if (!club) { res.status(404).json({ error: "Club no encontrado" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ clubId, isAdmin: isAdmin ? 1 : 0 })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Usuario no encontrado" }); return; }

  res.json({ userId, clubId, isAdmin: !!isAdmin });
});

// GET /admin/sports — lista todos los deportes disponibles
router.get("/admin/sports", requireSuperAdmin, async (_req, res): Promise<void> => {
  const sports = await db.select().from(sportsTable).orderBy(sportsTable.id);
  res.json(sports);
});

export default router;