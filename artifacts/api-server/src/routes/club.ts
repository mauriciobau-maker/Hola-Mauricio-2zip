import { Router, type IRouter, type Request } from "express";
import { eq, and } from "drizzle-orm";
import { db, clubsTable, clubSportsTable, sportsTable, clubSportCategoriesTable } from "@workspace/db";
import { getCurrentClubId, isSuperAdminUser, requireCommunityAccess } from "../middlewares/requireCommunity";

const router: IRouter = Router();

function currentClubId(req: Request): number | null {
  return getCurrentClubId(req);
}

router.get("/club", requireCommunityAccess, async (req, res): Promise<void> => {
  try {
    const clubId = currentClubId(req);
    if (!clubId) { res.status(403).json({ error: "El usuario no pertenece a ningún club" }); return; }
    const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, clubId));
    if (!club) { res.status(404).json({ error: "Club no encontrado" }); return; }
    let clubSports: any[] = [];
    try {
      clubSports = await db.select({ id: sportsTable.id, name: sportsTable.name, slug: sportsTable.slug, teamSize: sportsTable.teamSize, useSets: sportsTable.useSets, active: clubSportsTable.active }).from(clubSportsTable).innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id)).where(eq(clubSportsTable.clubId, clubId));
    } catch (e) { console.error("⚠️ Error cargando deportes del club:", e); }
    res.json({
      id: club.id, name: club.name, slug: club.slug, plan: club.plan, active: club.active,
      createdAt: club.createdAt ? (club.createdAt as Date).toISOString() : null,
      sports: clubSports, inviteCode: (club as any).inviteCode || null,
      logoUrl: (club as any).logoUrl || null, country: (club as any).country || "Chile",
      state: (club as any).state || null, city: (club as any).city || null,
      address: (club as any).address || null, mapUrl: (club as any).mapUrl || null,
      defaultLanguage: (club as any).defaultLanguage || "es",
      adminWhatsappAlias: (club as any).adminWhatsappAlias || null,
      contactPreference: (club as any).contactPreference || "whatsapp",
      primaryColor: (club as any).primaryColor || null, secondaryColor: (club as any).secondaryColor || null,
    });
  } catch (error) { console.error("Error en GET /club:", error); res.status(500).json({ error: "Error interno del servidor" }); }
});

router.get("/clubs/public/:slug", async (req, res): Promise<void> => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) { res.status(400).json({ error: "Slug de club requerido" }); return; }
    const [club] = await db.select().from(clubsTable).where(eq(clubsTable.slug, slug));
    if (!club || !(club as any).active) { res.status(404).json({ error: "Club no encontrado" }); return; }
    let sports: any[] = [];
    try { sports = await db.select({ id: sportsTable.id, name: sportsTable.name, slug: sportsTable.slug, active: clubSportsTable.active }).from(clubSportsTable).innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id)).where(eq(clubSportsTable.clubId, club.id)); } catch (e) { console.error("⚠️ Error cargando deportes del club público:", e); }
    res.json({
      id: club.id, name: club.name, slug: club.slug, logoUrl: (club as any).logoUrl || null,
      primaryColor: (club as any).primaryColor || null, secondaryColor: (club as any).secondaryColor || null,
      inviteCode: (club as any).inviteCode || null, country: (club as any).country || "Chile",
      state: (club as any).state || null, city: (club as any).city || null,
      address: (club as any).address || null, mapUrl: (club as any).mapUrl || null,
      defaultLanguage: (club as any).defaultLanguage || "es",
      adminWhatsappAlias: (club as any).adminWhatsappAlias || null,
      contactPreference: (club as any).contactPreference || "whatsapp",
      adminName: (club as any).adminName || (club as any).admin_name || null,
      adminEmail: (club as any).adminEmail || (club as any).admin_email || null,
      adminPhone: (club as any).adminPhone || (club as any).admin_phone || null,
    });
  } catch (error) { console.error("Error en GET /clubs/public/:slug:", error); res.status(500).json({ error: "Error interno del servidor" }); }
});

router.post("/clubs/public/:slug/enter", async (req, res): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
    const slug = String(req.params.slug || "").trim();
    if (!slug) { res.status(400).json({ error: "Slug de club requerido" }); return; }
    const [club] = await db.select().from(clubsTable).where(eq(clubsTable.slug, slug));
    if (!club || !(club as any).active) { res.status(404).json({ error: "Club no encontrado" }); return; }
    const user = req.user as { clubId?: number | null; isAdmin?: number | boolean | string | null };
    const isSuperAdmin = isSuperAdminUser(user);
    if (!isSuperAdmin && user.clubId !== club.id) { res.status(403).json({ error: "No tienes acceso a este club" }); return; }

    // The active club is a navigation context, not a membership record.
    // It is a session cookie and is intentionally readable by the frontend so
    // the API client can propagate the selected context on every API request.
    res.cookie("padel_tracker_active_club_id", String(club.id), {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
    });

    res.json({ success: true, club: { id: club.id, name: club.name, slug: club.slug }, superAdminContext: isSuperAdmin });
  } catch (error) { console.error("Error entrando al club:", error); res.status(500).json({ error: "Error interno del servidor" }); }
});

router.post("/clubs/active/clear", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  if (!isSuperAdminUser(req.user as { isAdmin?: number | boolean | string | null })) { res.json({ success: true, cleared: false }); return; }
  res.clearCookie("padel_tracker_active_club_id", { httpOnly: false, secure: true, sameSite: "lax", path: "/" });
  res.json({ success: true, cleared: true });
});

/** Lista de clubes disponibles para que el Super Admin cambie de contexto. */
router.get("/clubs/available", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  if (!isSuperAdminUser(req.user as { isAdmin?: number | boolean | string | null })) {
    res.status(403).json({ error: "Super Admin required" });
    return;
  }
  try {
    const clubs = await db.select({
      id: clubsTable.id,
      name: clubsTable.name,
      slug: clubsTable.slug,
      logoUrl: (clubsTable as any).logoUrl,
      primaryColor: (clubsTable as any).primaryColor,
      secondaryColor: (clubsTable as any).secondaryColor,
      active: clubsTable.active,
    }).from(clubsTable).where(eq(clubsTable.active, true)).orderBy(clubsTable.name);
    res.json(clubs);
  } catch (error) {
    console.error("Error listando clubes disponibles:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/clubs/current", requireCommunityAccess, async (req, res): Promise<void> => {
  try {
    const clubId = currentClubId(req);
    if (!clubId) { res.json(null); return; }
    const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, clubId));
    res.json(club || null);
  } catch (error) { console.error("⚠️ Error atrapado de forma segura en GET /clubs/current:", error); res.json(null); }
});

router.patch("/club/sports", requireCommunityAccess, async (req, res): Promise<void> => {
  const clubId = currentClubId(req);
  if (!clubId) { res.status(403).json({ error: "El usuario no pertenece a ningún club" }); return; }
  const { sportId, active } = req.body;
  if (typeof sportId !== "number" || typeof active !== "boolean") { res.status(400).json({ error: "Se requiere sportId (número) y active (boolean)" }); return; }
  try {
    const [sport] = await db.select().from(sportsTable).where(eq(sportsTable.id, sportId));
    if (!sport) { res.status(404).json({ error: "Deporte no encontrado" }); return; }
    const [existing] = await db.select().from(clubSportsTable).where(and(eq(clubSportsTable.clubId, clubId), eq(clubSportsTable.sportId, sportId)));
    if (existing) await db.update(clubSportsTable).set({ active }).where(and(eq(clubSportsTable.clubId, clubId), eq(clubSportsTable.sportId, sportId)));
    else await db.insert(clubSportsTable).values({ clubId, sportId, active });
    res.json({ clubId, sportId, sportName: sport.name, active });
  } catch (error) { console.error("Error en PATCH /club/sports:", error); res.status(500).json({ error: "Error interno al actualizar deportes" }); }
});

router.get("/club/categories", requireCommunityAccess, async (req, res) => {
  const clubId = currentClubId(req);
  if (!clubId) { res.status(403).json({ error: "El usuario no pertenece a ningún club" }); return; }
  try {
    const categories = await db.select({ id: clubSportCategoriesTable.id, clubSportId: clubSportCategoriesTable.clubSportId, sportId: sportsTable.id, name: clubSportCategoriesTable.name }).from(clubSportCategoriesTable).innerJoin(clubSportsTable, eq(clubSportCategoriesTable.clubSportId, clubSportsTable.id)).innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id)).where(eq(clubSportsTable.clubId, clubId));
    res.json(categories);
  } catch (error) { console.error("Error en GET /club/categories:", error); res.status(500).json({ error: "Error interno al obtener categorías" }); }
});

router.post("/club/categories", requireCommunityAccess, async (req, res) => {
  const clubId = currentClubId(req);
  if (!clubId) { res.status(403).json({ error: "El usuario no pertenece a ningún club" }); return; }
  const { clubSportId, name } = req.body;
  if (typeof clubSportId !== "number" || typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "Se requiere clubSportId (número) y name (texto válido)" }); return; }
  try {
    const [clubSport] = await db.select().from(clubSportsTable).where(and(eq(clubSportsTable.id, clubSportId), eq(clubSportsTable.clubId, clubId)));
    if (!clubSport) { res.status(404).json({ error: "El deporte del club no existe o no pertenece a tu club" }); return; }
    const [newCategory] = await db.insert(clubSportCategoriesTable).values({ clubSportId, name: name.trim() }).returning();
    res.status(201).json(newCategory);
  } catch (error) { console.error("Error en POST /club/categories:", error); res.status(500).json({ error: "Error interno al crear categoría" }); }
});

export default router;
