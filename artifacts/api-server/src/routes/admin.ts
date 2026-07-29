import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  clubsTable,
  clubSportsTable,
  sportsTable,
  usersTable,
  gastosTable,
} from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

const router: IRouter = Router();

// --- HELPERS ---

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Middleware de seguridad (RBAC)
 */
function checkRole(requiredRole: "SUPER_ADMIN" | "CLUB_ADMIN") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as any;

    if (!user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    if (user.isAdmin === 1) {
      next();
      return;
    }

    if (requiredRole === "CLUB_ADMIN" && user.isClubAdmin === 1) {
      const rawId = req.params.id;
      const routeId = rawId ? parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10) : null;
      if (routeId !== null && !isNaN(routeId) && user.clubId !== routeId) {
        res
          .status(403)
          .json({ error: "No tienes permiso para gestionar este club" });
        return;
      }
      next();
      return;
    }

    res
      .status(403)
      .json({ error: "Acceso denegado: requieres rol superior" });
  };
}

const requireSuperAdmin = checkRole("SUPER_ADMIN");
const requireClubAdmin = checkRole("CLUB_ADMIN");

// --- CURRENT CLUB ROUTE (Evita el Error 500 en Layout.tsx) ---

router.get(
  ["/clubs/current", "/admin/clubs/current"],
  async (req, res): Promise<void> => {
    try {
      const user = req.user as any;

      if (user?.clubId) {
        const [club] = await db
          .select()
          .from(clubsTable)
          .where(eq(clubsTable.id, user.clubId));
        if (club) {
          res.json(club);
          return;
        }
      }

      const [firstClub] = await db.select().from(clubsTable).limit(1);
      if (firstClub) {
        res.json(firstClub);
        return;
      }

      res.json(null);
    } catch (error) {
      console.error("Error en GET /clubs/current:", error);
      res.json(null);
    }
  },
);

// --- CLUBS ROUTES ---

// GET /admin/clubs — Solo Super Admins
router.get(
  "/admin/clubs",
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    try {
      const clubs = await db.select().from(clubsTable).orderBy(clubsTable.id);

      const result = await Promise.all(
        clubs.map(async (club) => {
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
          } catch (sportErr) {
            console.error(`⚠️ No se pudieron cargar deportes para el club ${club.id}`);
          }

          let adminUser = null;
          try {
            const [foundUser] = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.clubId, club.id));
            adminUser = foundUser;
          } catch (e) {
            // Ignorar error
          }

          const dbInviteCode = (club as any).inviteCode || (club as any).invite_code;

          const resolvedAdminName =
            (adminUser as any)?.name ||
            (club as any).adminName ||
            (club as any).admin_name ||
            null;

          const resolvedAdminEmail =
            (adminUser as any)?.email ||
            (club as any).adminEmail ||
            (club as any).admin_email ||
            null;

          const resolvedAdminPhone =
            (adminUser as any)?.phone ||
            (club as any).adminPhone ||
            (club as any).admin_phone ||
            null;

          const resolvedWhatsappAlias =
            (club as any).adminWhatsappAlias ||
            (club as any).admin_whatsapp_alias ||
            null;

          const resolvedContactPreference =
            (club as any).contactPreference ||
            (club as any).contact_preference ||
            "whatsapp";

          return {
            ...club,
            inviteCode: dbInviteCode || `PROMO-${club.id * 100}`,
            sports,
            adminName: resolvedAdminName,
            adminEmail: resolvedAdminEmail,
            adminPhone: resolvedAdminPhone,
            adminWhatsappAlias: resolvedWhatsappAlias,
            contactPreference: resolvedContactPreference,
            admin: resolvedAdminName
              ? {
                  name: resolvedAdminName,
                  email: resolvedAdminEmail,
                  phone: resolvedAdminPhone,
                }
              : null,
          };
        }),
      );

      res.json(result);
    } catch (error) {
      console.error("Error al obtener la lista de clubes:", error);
      res.status(500).json({ error: "Error interno al obtener los clubes" });
    }
  },
);

// POST /admin/clubs — Solo Super Admins
router.post(
  "/admin/clubs",
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    console.log(
      "👉 [POST /admin/clubs] Payload recibido:",
      JSON.stringify(req.body, null, 2),
    );

    try {
      const clubName = req.body.name || req.body.clubName || req.body.nombre;
      if (!clubName) {
        res.status(400).json({ error: "El nombre del club es obligatorio" });
        return;
      }

      let logoUrl = req.body.logoUrl || req.body.logo || null;

      const rawSlug = req.body.slug;
      const plan = req.body.plan || "basic";
      const sports = req.body.sports || [];
      const primaryColor = req.body.primaryColor || null;
      const secondaryColor = req.body.secondaryColor || null;

      const country = req.body.country || "Chile";
      const state = req.body.state || null;
      const city = req.body.city || null;
      const address = req.body.address || null;
      const mapUrl = req.body.mapUrl || null;
      const defaultLanguage = req.body.defaultLanguage || "es";
      const adminWhatsappAlias = req.body.adminWhatsappAlias || null;
      const contactPreference = req.body.contactPreference || "whatsapp";

      const adminEmail = req.body.adminEmail || req.body.email;
      const adminName = req.body.adminName || clubName;
      const adminNickname = req.body.adminNickname || null;
      const adminPhone = req.body.adminPhone || req.body.phone || null;

      const baseSlug =
        (rawSlug || clubName)
          .toString()
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

      const generatedInviteCode = generateInviteCode();

      const clubInsertData: Record<string, any> = {
        name: clubName,
        slug: finalSlug,
        plan: plan,
        active: true,
        inviteCode: generatedInviteCode,
        country,
        state,
        city,
        address,
        mapUrl,
        defaultLanguage,
        adminWhatsappAlias,
        contactPreference,
        adminName,
        adminEmail,
        adminPhone,
      };

      if (logoUrl) clubInsertData.logoUrl = logoUrl;
      if (primaryColor) clubInsertData.primaryColor = primaryColor;
      if (secondaryColor) clubInsertData.secondaryColor = secondaryColor;

      const [club] = await db
        .insert(clubsTable)
        .values(clubInsertData as any)
        .returning();
      console.log("✅ Club guardado con ID:", club.id);

      if (Array.isArray(sports) && sports.length > 0) {
        for (const sportItem of sports) {
          const sportId =
            typeof sportItem === "object" && sportItem !== null
              ? Number((sportItem as any).id)
              : Number(sportItem);
          if (!isNaN(sportId) && sportId > 0) {
            try {
              await db.insert(clubSportsTable).values({
                clubId: club.id,
                sportId: sportId,
                active: true,
              });
            } catch (e: any) {
              console.error(
                `⚠️ No se pudo asociar el deporte ${sportId}:`,
                e?.message,
              );
            }
          }
        }
      }

      let savedAdminName = adminName;
      let savedAdminEmail = adminEmail;
      let savedAdminPhone = adminPhone;

      if (adminEmail) {
        try {
          const [existingUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, adminEmail));
          if (existingUser) {
            await db
              .update(usersTable)
              .set({ clubId: club.id, isAdmin: 1, nickname: adminNickname } as any)
              .where(eq(usersTable.id, (existingUser as any).id));
            savedAdminName = (existingUser as any).name || (existingUser as any).firstName || adminName;
          } else {
            await db.insert(usersTable).values({
              email: adminEmail,
              name: adminName,
              nickname: adminNickname,
              phone: adminPhone,
              clubId: club.id,
              isAdmin: 1,
            } as any);
          }
        } catch (userErr: any) {
          console.error("⚠️ Error guardando usuario admin:", userErr?.message);
        }
      }

      res.status(201).json({
        ...club,
        inviteCode: generatedInviteCode,
        invite_code: generatedInviteCode,
        slug: finalSlug,
        adminName: savedAdminName,
        adminEmail: savedAdminEmail,
        adminPhone: savedAdminPhone,
        adminWhatsappAlias: adminWhatsappAlias,
        contactPreference: contactPreference,
        admin: {
          name: savedAdminName,
          email: savedAdminEmail,
          phone: savedAdminPhone,
        },
      });
    } catch (error: any) {
      console.error("🚨 Error grave en POST /admin/clubs:", error);
      res.status(500).json({
        error: "Error al crear el club",
        detalleTecnico: error?.message || String(error),
      });
    }
  },
);

// PATCH /admin/clubs/:id — Club Admin o Super Admin
router.patch(
  "/admin/clubs/:id",
  requireClubAdmin,
  async (req, res): Promise<void> => {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    try {
      const updateData: Record<string, any> = { ...req.body };

      if (updateData.logo && !updateData.logoUrl) {
        updateData.logoUrl = updateData.logo;
      }
      delete updateData.logo;
      delete updateData.id;

      const [updated] = await db
        .update(clubsTable)
        .set(updateData)
        .where(eq(clubsTable.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Club no encontrado" });
        return;
      }
      res.json(updated);
    } catch (error: any) {
      console.error("🚨 Error en PATCH /admin/clubs/:id:", error);
      res.status(500).json({ error: "Error interno al actualizar", detalle: error?.message });
    }
  },
);

// PATCH /admin/clubs/:id/sports — Club Admin o Super Admin
router.patch(
  "/admin/clubs/:id/sports",
  requireClubAdmin,
  async (req, res): Promise<void> => {
    const rawId = req.params.id;
    const clubId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const { sportId, active } = req.body;

    try {
      const [existing] = await db
        .select()
        .from(clubSportsTable)
        .where(
          and(
            eq(clubSportsTable.clubId, clubId),
            eq(clubSportsTable.sportId, sportId),
          ),
        );
      if (existing) {
        await db
          .update(clubSportsTable)
          .set({ active })
          .where(
            and(
              eq(clubSportsTable.clubId, clubId),
              eq(clubSportsTable.sportId, sportId),
            ),
          );
      } else {
        await db.insert(clubSportsTable).values({ clubId, sportId, active });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al asociar el deporte" });
    }
  },
);

// POST /admin/clubs/:id/users — Club Admin o Super Admin
router.post(
  "/admin/clubs/:id/users",
  requireClubAdmin,
  async (req, res): Promise<void> => {
    const rawId = req.params.id;
    const clubId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const { userId, isAdmin } = req.body;

    try {
      const [updated] = await db
        .update(usersTable)
        .set({ clubId, isAdmin: isAdmin ? 1 : 0 })
        .where(eq(usersTable.id, userId))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Club no encontrado / Usuario no encontrado" });
        return;
      }
      res.json({ userId, clubId });
    } catch (error) {
      res.status(500).json({ error: "Error al asignar usuario" });
    }
  },
);

// --- USERS ROUTES ---

router.get(
  ["/users", "/admin/users"],
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    try {
      const users = await db.select().from(usersTable);
      res.json(users);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.json([]);
    }
  },
);

// --- GASTOS Y OTROS (Solo Super Admins) ---

router.get(
  "/admin/sports",
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    const sports = await db.select().from(sportsTable).orderBy(sportsTable.id);
    res.json(sports);
  },
);

router.get(
  "/admin/gastos",
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    const gastos = await db.select().from(gastosTable).orderBy(gastosTable.id);
    res.json(gastos);
  },
);

router.post(
  // @ts-ignore
  "/admin/gastos",
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const [nuevoGasto] = await db
      .insert(gastosTable)
      .values({
        ...req.body,
        creadoPor: (req.user as any)?.name || "Admin",
      })
      .returning();
    res.status(201).json(nuevoGasto);
  },
);

// --- DEV ONLY ---
router.get("/admin/hacer-admin", async (req, res): Promise<void> => {
  const user = req.user as any;
  if (!user) {
    res.status(400).send("No autenticado");
    return;
  }
  await db
    .update(usersTable)
    .set({ isAdmin: 1 })
    .where(eq(usersTable.id, user.id));
  res.send("Admin otorgado");
});

export default router;