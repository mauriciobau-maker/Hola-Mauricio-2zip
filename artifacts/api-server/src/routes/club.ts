import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clubsTable, clubSportsTable, sportsTable, clubSportCategoriesTable } from "@workspace/db";

const router: IRouter = Router();

// GET /club — devuelve el club + deportes activos del usuario autenticado con todos los campos
router.get("/club", async (req, res): Promise<void> => {
  try {
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

    let clubSports: any[] = [];
    try {
      clubSports = await db
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
    } catch (e) {
      console.error("⚠️ Error cargando deportes del club:", e);
    }

    res.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      plan: club.plan,
      active: club.active,
      createdAt: club.createdAt ? (club.createdAt as Date).toISOString() : null,
      sports: clubSports,
      // Campos estéticos, marca blanca, contacto y ubicación completos:
      inviteCode: (club as any).inviteCode || null,
      logoUrl: (club as any).logoUrl || null,
      country: (club as any).country || "Chile",
      state: (club as any).state || null,
      city: (club as any).city || null,
      address: (club as any).address || null,
      mapUrl: (club as any).mapUrl || null,
      defaultLanguage: (club as any).defaultLanguage || "es",
      adminWhatsappAlias: (club as any).adminWhatsappAlias || null,
      contactPreference: (club as any).contactPreference || "whatsapp",
      primaryColor: (club as any).primaryColor || null,
      secondaryColor: (club as any).secondaryColor || null,
    });
  } catch (error) {
    console.error("Error en GET /club:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /clubs/current — Devuelve el club actual respetando estrictamente los roles de usuario
router.get("/clubs/current", async (req, res): Promise<void> => {
  try {
    const user = req.user as any;

    // Si no hay sesión iniciada, responder null
    if (!user) {
      res.json(null);
      return;
    }

    // 1. Si el usuario (sea quien sea) tiene un clubId explícito asignado
    if (user.clubId) {
      const [club] = await db
        .select()
        .from(clubsTable)
        .where(eq(clubsTable.id, user.clubId));

      if (club) {
        res.json(club);
        return;
      }
    }

    // 2. EXCLUSIVO SUPER ADMIN: Si eres Super Admin y no tienes clubId asignado,
    // se carga el primer club registrado para permitir la carga del panel general.
    const isSuperAdmin = user.isAdmin === 1 || user.role === "SUPER_ADMIN";

    if (isSuperAdmin) {
      const [firstClub] = await db.select().from(clubsTable).limit(1);
      res.json(firstClub || null);
      return;
    }

    // 3. Usuarios normales / Club Admins sin club asignado:
    // Retorna null de forma limpia sin exponer datos de otros clubes.
    res.json(null);
  } catch (error) {
    console.error("⚠️ Error atrapado de forma segura en GET /clubs/current:", error);
    res.json(null);
  }
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

  try {
    const [sport] = await db
      .select()
      .from(sportsTable)
      .where(eq(sportsTable.id, sportId));

    if (!sport) {
      res.status(404).json({ error: "Deporte no encontrado" });
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
  } catch (error) {
    console.error("Error en PATCH /club/sports:", error);
    res.status(500).json({ error: "Error interno al actualizar deportes" });
  }
});

// GET /club/categories — devuelve todas las categorías creadas para los deportes del club
router.get("/club/categories", async (req, res): Promise<void> => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const clubId = (req.user as { clubId?: number | null }).clubId;
  if (!clubId) {
    res.status(403).json({ error: "El usuario no pertenece a ningún club" });
    return;
  }

  try {
    const categories = await db
      .select({
        id: clubSportCategoriesTable.id,
        clubSportId: clubSportCategoriesTable.clubSportId,
        name: clubSportCategoriesTable.name,
      })
      .from(clubSportCategoriesTable)
      .innerJoin(clubSportsTable, eq(clubSportCategoriesTable.clubSportId, clubSportsTable.id))
      .where(eq(clubSportsTable.clubId, clubId));

    res.json(categories);
  } catch (error) {
    console.error("Error en GET /club/categories:", error);
    res.status(500).json({ error: "Error interno al obtener categorías" });
  }
});

// POST /club/categories — permite al administrador crear una categoría para un deporte del club
router.post("/club/categories", async (req, res): Promise<void> => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const clubId = (req.user as { clubId?: number | null }).clubId;
  if (!clubId) {
    res.status(403).json({ error: "El usuario no pertenece a ningún club" });
    return;
  }

  const { clubSportId, name } = req.body as { clubSportId?: unknown; name?: unknown };

  if (typeof clubSportId !== "number" || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Se requiere clubSportId (número) y name (texto válido)" });
    return;
  }

  try {
    // Validar que el clubSport pertenece al club actual
    const [clubSport] = await db
      .select()
      .from(clubSportsTable)
      .where(and(eq(clubSportsTable.id, clubSportId), eq(clubSportsTable.clubId, clubId)));

    if (!clubSport) {
      res.status(404).json({ error: "El deporte del club no existe o no pertenece a tu club" });
      return;
    }

    const [newCategory] = await db
      .insert(clubSportCategoriesTable)
      .values({ clubSportId, name: name.trim() })
      .returning();

    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Error en POST /club/categories:", error);
    res.status(500).json({ error: "Error interno al crear la categoría" });
  }
});

export default router;