import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, clubsTable, clubSportsTable, sportsTable, usersTable } from "@workspace/db";
import { isSuperAdminUser } from "../middlewares/requireCommunity";

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

    // Solo el nombre del admin es público. Email y teléfono son datos
    // personales y no deben quedar expuestos sin autenticación.
    let admin: any = null;
    try {
      const [clubAdmin] = await db
        .select({
          name: usersTable.name,
          nickname: usersTable.nickname,
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
      adminWhatsappAlias: (club as any).adminWhatsappAlias || null,
    });
  } catch (error) {
    console.error("Error en GET /clubs/public/:slug:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /clubs/public/:slug/enter — valida la sesión de la aplicación para
// permitir que un usuario ya autenticado entre al club sin iniciar OIDC otra vez.
// Super Admin puede entrar a cualquier club; un usuario normal solo al suyo.
router.get("/clubs/public/:slug/enter", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ error: "Slug de club requerido" });
      return;
    }

    const [club] = await db
      .select({ id: clubsTable.id, name: clubsTable.name, slug: clubsTable.slug, active: clubsTable.active })
      .from(clubsTable)
      .where(and(eq(clubsTable.slug, slug), eq(clubsTable.active, true)));

    if (!club) {
      res.status(404).json({ error: "Club no encontrado" });
      return;
    }

    const user = req.user as { clubId?: number | null; isAdmin?: number | boolean | null };
    const canEnter = isSuperAdminUser(user) || user.clubId === club.id;
    if (!canEnter) {
      res.status(403).json({ error: "No tienes acceso a este club" });
      return;
    }

    // El contexto seleccionado es temporal y no modifica la membresía persistida.
    res.cookie("padel_tracker_active_club_id", String(club.id), {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
    });

    res.json({ success: true, club });
  } catch (error) {
    console.error("Error en GET /clubs/public/:slug/enter:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
