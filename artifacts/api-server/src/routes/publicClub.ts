import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clubsTable, clubSportsTable, sportsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

// GET /clubs/public/:slug — perfil público del club, sin autenticación
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

    let admin: any = null;
    try {
      const [clubAdmin] = await db
        .select({
          name: usersTable.name,
          nickname: usersTable.nickname,
          email: usersTable.email,
          phone: usersTable.phone,
        })
        .from(usersTable)
        .where(and(eq(usersTable.clubId, club.id), eq(usersTable.isClubAdmin, 1)))
        .limit(1);

      if (clubAdmin) admin = clubAdmin;
    } catch (e) {
      console.error("⚠️ Error cargando contacto del administrador público:", e);
    }

    res.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      logoUrl: (club as any).logoUrl || null,
      primaryColor: (club as any).primaryColor || null,
      secondaryColor: (club as any).secondaryColor || null,
      inviteCode: (club as any).inviteCode || null,
      country: (club as any).country || "Chile",
      state: (club as any).state || null,
      city: (club as any).city || null,
      address: (club as any).address || null,
      mapUrl: (club as any).mapUrl || null,
      defaultLanguage: (club as any).defaultLanguage || "es",
      sports,
      adminName: admin?.name || admin?.nickname || null,
      adminEmail: admin?.email || null,
      adminPhone: admin?.phone || null,
      adminWhatsappAlias: (club as any).adminWhatsappAlias || null,
    });
  } catch (error) {
    console.error("Error en GET /clubs/public/:slug:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
