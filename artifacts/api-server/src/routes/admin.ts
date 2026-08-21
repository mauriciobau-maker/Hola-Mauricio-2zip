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
 * Middleware de seguridad (RBAC) con soporte dual para banderas e identificadores de rol en texto
 */
function checkRole(requiredRole: "SUPER_ADMIN" | "CLUB_ADMIN") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as any;

    if (!user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const isSuperAdmin =
      user.isAdmin === 1 ||
      user.role === "superadmin" ||
      user.role === "admin";

    if (isSuperAdmin) {
      next();
      return;
    }

    const isClubAdmin =
      user.isClubAdmin === 1 ||
      user.role === "club_admin" ||
      user.isClubAdmin === true;

    if (requiredRole === "CLUB_ADMIN" && isClubAdmin) {
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

// --- CURRENT CLUB ROUTE ---

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
  async (req, res): Promise<void> => {
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
            // Buscar primero un usuario asignado al club
            const clubUsers = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.clubId, club.id));

            // Si hay más de un usuario, preferir el que no sea SuperAdmin general
            adminUser = clubUsers.find((u: any) => u.isAdmin === 0) || clubUsers[0] || null;
          } catch (e) {
            // Ignorar error
          }

          const dbInviteCode = (club as any).inviteCode || (club as any).invite_code;

          const resolvedAdminName =
            adminUser?.name ||
            (club as any).adminName ||
            null;

          const resolvedAdminEmail =
            adminUser?.email ||
            (club as any).adminEmail ||
            null;

          const resolvedAdminPhone =
            adminUser?.phone ||
            (club as any).adminPhone ||
            null;

          return {
            ...club,
            inviteCode: dbInviteCode || `PROMO-${club.id * 100}`,
            sports,
            adminName: resolvedAdminName,
            adminEmail: resolvedAdminEmail,
            adminPhone: resolvedAdminPhone,
            admin: resolvedAdminName || resolvedAdminEmail
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

      const adminMode = req.body.adminMode || "new";
      const selectedAdminId = req.body.selectedAdminId
        ? String(req.body.selectedAdminId)
        : null;
      const adminEmail = req.body.adminEmail || req.body.admin?.email || null;
      const adminName = req.body.adminName || req.body.admin?.name || null;
      const adminNickname = req.body.adminNickname || null;
      const adminPhone = req.body.adminPhone || req.body.phone || req.body.admin?.phone || null;

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
      };

      if (logoUrl) clubInsertData.logoUrl = logoUrl;
      if (primaryColor) clubInsertData.primaryColor = primaryColor;
      if (secondaryColor) clubInsertData.secondaryColor = secondaryColor;

      const [club] = await db
        .insert(clubsTable)
        .values(clubInsertData as any)
        .returning();

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
              console.error(`⚠️ No se pudo asociar el deporte ${sportId}:`, e?.message);
            }
          }
        }
      }

      if (adminMode === "existing") {
        if (!selectedAdminId) {
          res.status(400).json({ error: "Debe seleccionar un administrador existente" });
          return;
        }

        try {
          const [existingUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, selectedAdminId));

          if (!existingUser) {
            res.status(404).json({ error: "El administrador seleccionado no existe" });
            return;
          }

          await db
            .update(usersTable)
            .set({
              clubId: club.id,
              isClubAdmin: 1,
              name: adminName || (existingUser as any).name || undefined,
              nickname: adminNickname || (existingUser as any).nickname || undefined,
              phone: adminPhone || (existingUser as any).phone || undefined,
            } as any)
            .where(eq(usersTable.id, selectedAdminId));
        } catch (userErr: any) {
          console.error("⚠️ Error asociando administrador existente:", userErr?.message);
          res.status(500).json({
            error: "Error al asociar el administrador seleccionado",
            detalleTecnico: userErr?.message || String(userErr),
          });
          return;
        }
      } else if (adminEmail) {
        try {
          const [existingUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, adminEmail));

          if (existingUser) {
            // Solo actualizamos el club y el rol de club-admin.
            // NO tocamos isAdmin para no sobreescribir a un super-admin existente.
            await db
              .update(usersTable)
              .set({
                clubId: club.id,
                isClubAdmin: 1,
                name: adminName || (existingUser as any).name || undefined,
                nickname: adminNickname || (existingUser as any).nickname || undefined,
                phone: adminPhone || (existingUser as any).phone || undefined,
              } as any)
              .where(eq(usersTable.id, (existingUser as any).id));
          } else {
            await db.insert(usersTable).values({
              email: adminEmail,
              name: adminName || null,
              nickname: adminNickname || null,
              phone: adminPhone || null,
              clubId: club.id,
              isAdmin: 0,
              isClubAdmin: 1,
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
        adminName: adminName,
        adminEmail: adminEmail,
        adminPhone: adminPhone,
        admin: {
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
        },
      });
    } catch (error: any) {
      console.error("🚨 Error en POST /admin/clubs:", error);
      res.status(500).json({
        error: "Error al crear el club",
        detalleTecnico: error?.message || String(error),
      });
    }
  },
);

// PATCH /admin/clubs/:id — Edición segura sin colisión de columnas
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
      const body = req.body || {};
      const { sports, admin } = body;

      // 1. Extraer datos del Administrador
      const adminEmail = body.adminEmail || body.admin_email || admin?.email || body.correoAdmin;
      const adminName = body.adminName || body.admin_name || admin?.name || body.nombreAdmin;
      const adminPhone = body.adminPhone || body.admin_phone || admin?.phone || body.phone;
      const adminNickname = body.adminNickname || body.nickname || body.apodo;
      const currentUser = req.user as any;
      const isSuperAdmin =
        currentUser?.isAdmin === 1 ||
        currentUser?.role === "superadmin" ||
        currentUser?.role === "admin";

      if (adminEmail && !isSuperAdmin) {
        res.status(403).json({
          error: "Solo un Super Admin puede modificar privilegios administrativos",
        });
        return;
      }

      // 2. Extraer ÚNICAMENTE campos nativos de la tabla `clubsTable`
      const clubUpdate: Record<string, any> = {};
      if (body.name || body.nombre) clubUpdate.name = body.name || body.nombre;
      if (body.slug) clubUpdate.slug = body.slug;
      if (body.plan) clubUpdate.plan = body.plan;
      if (body.logoUrl || body.logo) clubUpdate.logoUrl = body.logoUrl || body.logo;
      if (body.active !== undefined) clubUpdate.active = body.active;
      if (body.country) clubUpdate.country = body.country;
      if (body.state) clubUpdate.state = body.state;
      if (body.city) clubUpdate.city = body.city;
      if (body.address) clubUpdate.address = body.address;
      if (body.mapUrl) clubUpdate.mapUrl = body.mapUrl;
      if (body.primaryColor) clubUpdate.primaryColor = body.primaryColor;
      if (body.secondaryColor) clubUpdate.secondaryColor = body.secondaryColor;

      let updatedClub = null;
      if (Object.keys(clubUpdate).length > 0) {
        try {
          const [resUpdate] = await db
            .update(clubsTable)
            .set(clubUpdate as any)
            .where(eq(clubsTable.id, id))
            .returning();
          updatedClub = resUpdate;
        } catch (dbErr) {
          console.warn("⚠️ Advertencia al actualizar clubsTable:", dbErr);
        }
      }

      if (!updatedClub) {
        const [existing] = await db.select().from(clubsTable).where(eq(clubsTable.id, id));
        updatedClub = existing;
      }

      // 3. Sincronizar usuario Administrador en `usersTable`
      if (adminEmail) {
        try {
          const [existingUserByEmail] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, adminEmail));

          if (existingUserByEmail) {
            // Actualizamos datos del usuario existente sin tocar su isAdmin (preservar super-admins)
            await db
              .update(usersTable)
              .set({
                clubId: id,
                isClubAdmin: 1,
                name: adminName || (existingUserByEmail as any).name || undefined,
                phone: adminPhone || (existingUserByEmail as any).phone || undefined,
                nickname: adminNickname || (existingUserByEmail as any).nickname || undefined,
              } as any)
              .where(eq(usersTable.id, (existingUserByEmail as any).id));
          } else {
            // Buscar club admin existente (por isClubAdmin, no isAdmin para no confundir con super-admin)
            const [existingClubAdmin] = await db
              .select()
              .from(usersTable)
              .where(and(eq(usersTable.clubId, id), eq(usersTable.isClubAdmin, 1)));

            if (existingClubAdmin) {
              await db
                .update(usersTable)
                .set({
                  email: adminEmail,
                  name: adminName || (existingClubAdmin as any).name || undefined,
                  phone: adminPhone || (existingClubAdmin as any).phone || undefined,
                  nickname: adminNickname || (existingClubAdmin as any).nickname || undefined,
                } as any)
                .where(eq(usersTable.id, (existingClubAdmin as any).id));
            } else {
              await db.insert(usersTable).values({
                email: adminEmail,
                name: adminName || null,
                phone: adminPhone || null,
                nickname: adminNickname || null,
                clubId: id,
                isAdmin: 0,
                isClubAdmin: 1,
              } as any);
            }
          }
        } catch (uErr) {
          console.error("⚠️ Error actualizando usuario admin en usersTable:", uErr);
        }
      }

      // 4. Actualizar deportes del club
      if (Array.isArray(sports)) {
        for (const sportItem of sports) {
          const sportId =
            typeof sportItem === "object" && sportItem !== null
              ? Number(sportItem.id)
              : Number(sportItem);
          if (!isNaN(sportId) && sportId > 0) {
            try {
              const [existing] = await db
                .select()
                .from(clubSportsTable)
                .where(
                  and(
                    eq(clubSportsTable.clubId, id),
                    eq(clubSportsTable.sportId, sportId)
                  )
                );
              if (!existing) {
                await db
                  .insert(clubSportsTable)
                  .values({ clubId: id, sportId, active: true });
              }
            } catch (sErr) {
              // Ignorar duplicados
            }
          }
        }
      }

      res.json({
        ...updatedClub,
        adminName,
        adminEmail,
        adminPhone,
        admin: {
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
        },
      });
    } catch (error: any) {
      console.error("🚨 Error en PATCH /admin/clubs/:id:", error);
      res.status(500).json({
        error: "Error interno al actualizar",
        detalle: error?.message || String(error),
      });
    }
  },
);

// PATCH /admin/clubs/:id/sports
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

// POST /admin/clubs/:id/users
router.post(
  "/admin/clubs/:id/users",
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const rawId = req.params.id;
    const clubId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const { userId, isAdmin } = req.body;

    try {
      const [updated] = await db
        .update(usersTable)
        .set({ clubId, isClubAdmin: isAdmin ? 1 : 0 })
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

// --- GASTOS Y OTROS ---

router.get(
  "/admin/sports",
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    try {
      const sports = await db.select().from(sportsTable).orderBy(sportsTable.id);
      res.json(sports);
    } catch (error) {
      console.error("Error al obtener deportes:", error);
      res.status(500).json({ error: "Error al obtener deportes" });
    }
  },
);

router.get(
  "/admin/gastos",
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    try {
      const gastos = await db.select().from(gastosTable).orderBy(gastosTable.id);
      res.json(gastos);
    } catch (error) {
      console.error("Error al obtener gastos:", error);
      res.status(500).json({ error: "Error al obtener los gastos" });
    }
  },
);

router.post(
  "/admin/gastos",
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    try {
      // Extraemos solo los campos válidos del body para evitar errores 500 por columnas extra
      const {
        encuentroId, clubId, arriendo, implementos, bebidas,
        alimentos, otros, descripcionOtros, total,
      } = req.body;

      const [nuevoGasto] = await db
        .insert(gastosTable)
        .values({
          encuentroId: encuentroId ?? null,
          clubId: clubId ?? null,
          arriendo: Number(arriendo ?? 0),
          implementos: Number(implementos ?? 0),
          bebidas: Number(bebidas ?? 0),
          alimentos: Number(alimentos ?? 0),
          otros: Number(otros ?? 0),
          descripcionOtros: descripcionOtros ?? null,
          total: Number(total ?? 0),
          creadoPor: (req.user as any)?.firstName || (req.user as any)?.name || "Admin",
        })
        .returning();
      res.status(201).json(nuevoGasto);
    } catch (error: any) {
      console.error("Error al crear gasto:", error);
      res.status(500).json({ error: "Error al crear el gasto", detalle: error?.message });
    }
  },
);

// --- DEV ONLY ---
router.get("/admin/hacer-admin", requireSuperAdmin, async (req, res): Promise<void> => {
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
