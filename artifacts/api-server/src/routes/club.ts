import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, clubsTable, clubSportsTable, sportsTable, clubSportCategoriesTable, usersTable } from "@workspace/db";
import { isSuperAdminUser, isClubAdminUser } from "../middlewares/requireCommunity";

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

    const isStaff = isSuperAdminUser(req.user) || Boolean((req.user as any).isClubAdmin);

    res.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      plan: club.plan,
      active: club.active,
      createdAt: club.createdAt ? (club.createdAt as Date).toISOString() : null,
      sports: clubSports,
      inviteCode: isStaff ? ((club as any).inviteCode || null) : null,
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

// GET /clubs/public/:slug — perfil público del club, sin autenticación (sin exponer inviteCode ni datos privados)
router.get("/clubs/public/:slug", async (req, res): Promise<void> => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ error: "Slug de club requerido" });
      return;
    }

    const [club] = await db
      .select()
      .from(clubsTable)
      .where(and(eq(clubsTable.slug, slug), eq(clubsTable.active, true)));

    if (!club) {
      res.status(404).json({ error: "Club no encontrado" });
      return;
    }

    let sports: any[] = [];
    try {
      sports = await db
        .select({
          id: sportsTable.id,
          name: sportsTable.name,
          slug: sportsTable.slug,
          active: clubSportsTable.active,
        })
        .from(clubSportsTable)
        .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
        .where(eq(clubSportsTable.clubId, club.id));
    } catch (e) {
      console.error("⚠️ Error cargando deportes del club público:", e);
    }

    res.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      logoUrl: (club as any).logoUrl || null,
      primaryColor: (club as any).primaryColor || null,
      secondaryColor: (club as any).secondaryColor || null,
      // Se omite explícitamente el código de invitación privado en respuestas públicas
      inviteCode: null,
      country: (club as any).country || "Chile",
      state: (club as any).state || null,
      city: (club as any).city || null,
      address: (club as any).address || null,
      mapUrl: (club as any).mapUrl || null,
      defaultLanguage: (club as any).defaultLanguage || "es",
      sports,
      // Se omiten datos privados personales del administrador en endpoint público
      adminName: null,
      adminEmail: null,
      adminPhone: null,
      adminWhatsappAlias: (club as any).adminWhatsappAlias || null,
    });
  } catch (error) {
    console.error("Error en GET /clubs/public/:slug:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /clubs/current — Devuelve el club actual respetando rol y derivación de sesión
router.get("/clubs/current", async (req, res): Promise<void> => {
  try {
    const user = req.user as any;
    let targetClub: any = null;

    if (user) {
      if (isSuperAdminUser(user)) {
        const headerClubId = req.headers["x-club-id"] ? Number(req.headers["x-club-id"]) : null;
        const queryClubId = req.query.clubId ? Number(req.query.clubId) : headerClubId;
        if (queryClubId && !Number.isNaN(queryClubId)) {
          const [club] = await db
            .select()
            .from(clubsTable)
            .where(eq(clubsTable.id, queryClubId));
          if (club) targetClub = club;
        }
        if (!targetClub && user.clubId) {
          const [club] = await db
            .select()
            .from(clubsTable)
            .where(eq(clubsTable.id, user.clubId));
          if (club) targetClub = club;
        }
      } else {
        // Usuario autenticado regular: derivar club obligatoriamente de la sesión
        if (user.clubId) {
          const [club] = await db
            .select()
            .from(clubsTable)
            .where(eq(clubsTable.id, user.clubId));
          if (club) targetClub = club;
        }
      }
    } else {
      // Petición pública no autenticada
      const headerClubId = req.headers["x-club-id"] ? Number(req.headers["x-club-id"]) : null;
      const queryClubId = req.query.clubId ? Number(req.query.clubId) : headerClubId;
      if (queryClubId && !Number.isNaN(queryClubId)) {
        const [club] = await db
          .select()
          .from(clubsTable)
          .where(eq(clubsTable.id, queryClubId));
        if (club) targetClub = club;
      }
    }

    if (!targetClub) {
      const [firstClub] = await db.select().from(clubsTable).orderBy(clubsTable.id).limit(1);
      targetClub = firstClub;
    }

    if (!targetClub) {
      res.json(null);
      return;
    }

    let sports: any[] = [];
    try {
      sports = await db
        .select({
          id: sportsTable.id,
          name: sportsTable.name,
          slug: sportsTable.slug,
          useSets: sportsTable.useSets,
        })
        .from(clubSportsTable)
        .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
        .where(
          and(
            eq(clubSportsTable.clubId, targetClub.id),
            eq(clubSportsTable.active, true),
            eq(sportsTable.active, true)
          )
        );
    } catch {}

    // Priorizar orden de deportes: Pádel primero, Tenis segundo, Fútbol tercero
    sports.sort((a, b) => {
      const order: Record<string, number> = { padel: 1, tenis: 2, futbol: 3 };
      return (order[a.slug] || 99) - (order[b.slug] || 99);
    });

    const hasFootball = sports.some((s) => s.slug === "futbol" || s.name.toLowerCase().includes("fútbol"));
    const hasRacketSports = sports.some((s) => s.slug === "padel" || s.slug === "tenis" || s.useSets);

    // Solo se considera club 100% fútbol si NO tiene deportes de raqueta
    const isFootball =
      (hasFootball && !hasRacketSports) ||
      (targetClub.name.toLowerCase().includes("fútbol") && !hasRacketSports) ||
      targetClub.id === 3;

    // Solo exponer inviteCode al personal autorizado del club o Super Admin
    const isStaff = isSuperAdminUser(user) || (user?.isClubAdmin && user.clubId === targetClub.id);

    res.json({
      ...targetClub,
      inviteCode: isStaff ? targetClub.inviteCode : null,
      sports,
      isFootball,
      hasRacketSports,
      hasFootball,
    });
  } catch (error) {
    console.error("⚠️ Error atrapado de forma segura en GET /clubs/current:", error);
    res.json(null);
  }
});

// PATCH /club/settings — Actualiza parámetros del club (nombre, colores, logo, ciudad, etc.)
router.patch("/club/settings", async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const user = req.user as any;
    const isSuperAdmin = isSuperAdminUser(user);

    // Si es Super Admin puede indicar clubId; si no, se deriva estrictamente de req.user.clubId
    const clubId = isSuperAdmin ? (Number(req.body.clubId) || user.clubId) : user.clubId;

    if (!clubId) {
      res.status(400).json({ error: "Club no especificado o usuario sin club asignado" });
      return;
    }

    // Verificar si el usuario tiene rol de administrador del club o Super Admin
    if (!isSuperAdmin && !user.isClubAdmin) {
      res.status(403).json({ error: "Solo los administradores del club pueden modificar la configuración" });
      return;
    }

    const { name, logoUrl, primaryColor, secondaryColor, city, country, address, mapUrl, defaultLanguage } = req.body;

    const updateData: Record<string, any> = {};
    if (name) updateData.name = String(name).trim();
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl ? String(logoUrl).trim() : null;
    if (primaryColor) updateData.primaryColor = String(primaryColor).trim();
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor ? String(secondaryColor).trim() : null;
    if (city) updateData.city = String(city).trim();
    if (country) updateData.country = String(country).trim();
    if (address !== undefined) updateData.address = address ? String(address).trim() : null;
    if (mapUrl !== undefined) updateData.mapUrl = mapUrl ? String(mapUrl).trim() : null;
    if (defaultLanguage && ["es", "en", "pt"].includes(String(defaultLanguage))) {
      updateData.defaultLanguage = String(defaultLanguage).trim();
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No se proporcionaron datos para actualizar" });
      return;
    }

    const [updated] = await db
      .update(clubsTable)
      .set(updateData)
      .where(eq(clubsTable.id, clubId))
      .returning();

    res.json({ success: true, club: updated });
  } catch (error: any) {
    console.error("Error en PATCH /club/settings:", error);
    res.status(500).json({ error: error?.message || "Error al actualizar la configuración del club" });
  }
});

// PATCH /club/sports — activa o desactiva un deporte para el club (Solo Admin/Staff)
router.patch("/club/sports", async (req, res): Promise<void> => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const user = req.user as any;
  const isSuperAdmin = isSuperAdminUser(user);
  if (!isSuperAdmin && !user.isClubAdmin) {
    res.status(403).json({ error: "Solo administradores pueden configurar los deportes del club" });
    return;
  }

  const clubId = isSuperAdmin ? (Number(req.body.clubId) || user.clubId) : user.clubId;
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

  const user = req.user as any;
  const isSuperAdmin = isSuperAdminUser(user);
  if (!isSuperAdmin && !user.isClubAdmin) {
    res.status(403).json({ error: "Solo los administradores del club pueden crear categorías" });
    return;
  }

  const clubId = isSuperAdmin ? (Number(req.body.clubId) || user.clubId) : user.clubId;
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

// POST /clubs/register — Registro autoservicio para nuevos clubes con 14 días gratis
router.post("/clubs/register", async (req, res): Promise<void> => {
  try {
    const {
      clubName,
      sportId = 1,
      city = "Santiago",
      country = "Chile",
      adminName,
      adminEmail,
      adminPhone,
    } = req.body as any;

    if (!clubName || !adminName || !adminEmail) {
      res.status(400).json({
        error: "Nombre del club, nombre del administrador y correo electrónico son requeridos",
      });
      return;
    }

    const baseSlug =
      clubName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `club-${Date.now()}`;

    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const [existing] = await db
        .select()
        .from(clubsTable)
        .where(eq(clubsTable.slug, finalSlug));
      if (!existing) break;
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sId = Number(sportId) || 1;
    const primaryColor = sId === 3 ? "#1e40af" : sId === 2 ? "#ea580c" : "#10b981";

    try {
      await db.execute(sql`SELECT setval('clubs_id_seq', COALESCE((SELECT MAX(id) FROM clubs), 1))`);
    } catch (seqErr) {
      console.warn("Advertencia sincronizando secuencia clubs_id_seq:", seqErr);
    }

    const [newClub] = await db
      .insert(clubsTable)
      .values({
        name: clubName.trim(),
        slug: finalSlug,
        plan: "pro", // 14 días de prueba incluidos
        active: true,
        inviteCode,
        city: city.trim(),
        country: country.trim(),
        primaryColor,
        defaultLanguage: "es",
      })
      .returning();

    // Asociar deporte principal seleccionado
    try {
      await db.insert(clubSportsTable).values({
        clubId: newClub.id,
        sportId: sId,
        active: true,
      });
    } catch (sErr) {
      console.warn("Advertencia al vincular deporte inicial:", sErr);
    }

    // Crear o actualizar usuario administrador
    const emailNorm = adminEmail.toLowerCase().trim();
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailNorm));
    if (!user) {
      [user] = await db
        .insert(usersTable)
        .values({
          email: emailNorm,
          name: adminName.trim(),
          phone: adminPhone ? String(adminPhone).trim() : null,
          clubId: newClub.id,
          isClubAdmin: 1,
          active: 1,
        })
        .returning();
    } else {
      await db
        .update(usersTable)
        .set({ clubId: newClub.id, isClubAdmin: 1 })
        .where(eq(usersTable.id, user.id));
    }

    res.status(201).json({
      success: true,
      club: newClub,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clubId: newClub.id,
        isClubAdmin: 1,
      },
      inviteCode,
      slug: finalSlug,
      trialDaysRemaining: 14,
    });
  } catch (err: any) {
    console.error("Error en POST /clubs/register:", err);
    res.status(500).json({ error: err?.message || "No se pudo registrar el club" });
  }
});

export default router;
