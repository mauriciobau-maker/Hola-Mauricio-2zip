import { Router, type Request, type Response } from "express";
import { db, pool, cobrosTable, playersTable, torneoCalculosTable, usersTable, clubsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireClub } from "../middlewares/requireCommunity";

const router = Router();

// Auto-verificación de columnas y tabla torneo_calculos
let dbSchemaChecked = false;
async function ensureDbSchema() {
  if (dbSchemaChecked) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS torneo_calculos (
        id SERIAL PRIMARY KEY,
        club_id INTEGER REFERENCES clubs(id),
        nombre TEXT NOT NULL,
        items JSONB NOT NULL,
        jugadores JSONB NOT NULL,
        aplicado BOOLEAN NOT NULL DEFAULT false,
        creado_por TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE cobros ADD COLUMN IF NOT EXISTS items JSONB;
      ALTER TABLE cobros ADD COLUMN IF NOT EXISTS notas TEXT;
      ALTER TABLE cobros ADD COLUMN IF NOT EXISTS pagado_at TIMESTAMPTZ;
      ALTER TABLE cobros ADD COLUMN IF NOT EXISTS comprobante_url TEXT;
      ALTER TABLE cobros ADD COLUMN IF NOT EXISTS confirmado_por TEXT;
    `);
    dbSchemaChecked = true;
  } catch (err) {
    console.error("⚠️ Error asegurando esquema de cobros:", err);
  }
}

function isStaffUser(user: any): boolean {
  if (!user) return false;
  return (
    user.isAdmin === 1 ||
    user.isAdmin === true ||
    user.isClubAdmin === 1 ||
    user.isClubAdmin === true ||
    user.role === "superadmin" ||
    user.role === "admin" ||
    user.role === "colaborador" ||
    user.role === "adminclub" ||
    user.role === "club_admin" ||
    user.role === "SUPER_ADMIN"
  );
}

// All cobros routes require an authenticated user with a community assignment
router.use(requireAuth, requireClub);

// GET /api/cobros/stats — Métricas del club para los administradores o jugador
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDbSchema();
    const clubId = (req.user as { clubId: number }).clubId;
    const isStaff = isStaffUser(req.user);
    const playerId = (req.user as { playerId?: number | null }).playerId;

    const baseCondition = isStaff
      ? eq(cobrosTable.clubId, clubId)
      : and(eq(cobrosTable.clubId, clubId), eq(cobrosTable.playerId, playerId ?? -1));

    const rows = await db
      .select({
        monto: cobrosTable.monto,
        estado: cobrosTable.estado,
        playerId: cobrosTable.playerId,
      })
      .from(cobrosTable)
      .where(baseCondition);

    let totalRecaudado = 0;
    let totalPendiente = 0;
    const deudoresSet = new Set<number>();

    for (const r of rows) {
      if (r.estado === "pagado") {
        totalRecaudado += r.monto || 0;
      } else {
        totalPendiente += r.monto || 0;
        deudoresSet.add(r.playerId);
      }
    }

    // Buscar teléfono y nombre de contacto del administrador del club
    let adminPhone: string | null = null;
    let adminName: string | null = null;

    try {
      const adminUsers = await db
        .select({
          name: usersTable.name,
          phone: usersTable.phone,
          playerId: usersTable.playerId,
        })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.clubId, clubId),
            sql`(${usersTable.isClubAdmin} = 1 OR ${usersTable.isAdmin} = 1)`
          )
        );

      for (const u of adminUsers) {
        if (u.phone) {
          adminPhone = u.phone;
          adminName = u.name;
          break;
        }
        if (u.playerId) {
          const [p] = await db
            .select({ name: playersTable.name, phone: playersTable.phone })
            .from(playersTable)
            .where(eq(playersTable.id, u.playerId));
          if (p?.phone) {
            adminPhone = p.phone;
            adminName = p.name;
            break;
          }
        }
      }

      if (!adminPhone) {
        const [c] = await db.select().from(clubsTable).where(eq(clubsTable.id, clubId));
        if (c) {
          adminPhone = (c as any).adminWhatsappAlias || (c as any).phone || null;
          adminName = c.name;
        }
      }
    } catch (e) {
      console.warn("Error buscando contacto del admin:", e);
    }

    res.json({
      totalRecaudado,
      totalPendiente,
      totalCobros: rows.length,
      deudoresCount: deudoresSet.size,
      isStaff,
      adminPhone,
      adminName,
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas de cobros:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// GET /api/cobros — Listar cobros con datos enriquecidos de jugadores
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDbSchema();
    const clubId = (req.user as { clubId: number }).clubId;
    const isStaff = isStaffUser(req.user);
    const userPlayerId = (req.user as { playerId?: number | null }).playerId;

    // Si es jugador regular y no es staff, solo ve sus propios cobros
    const condition = isStaff
      ? eq(cobrosTable.clubId, clubId)
      : and(eq(cobrosTable.clubId, clubId), eq(cobrosTable.playerId, userPlayerId ?? -1));

    const cobros = await db
      .select({
        id: cobrosTable.id,
        playerId: cobrosTable.playerId,
        clubId: cobrosTable.clubId,
        encuentroId: cobrosTable.encuentroId,
        gastoId: cobrosTable.gastoId,
        monto: cobrosTable.monto,
        items: cobrosTable.items,
        estado: cobrosTable.estado,
        comprobanteUrl: cobrosTable.comprobanteUrl,
        confirmadoPor: cobrosTable.confirmadoPor,
        notas: cobrosTable.notas,
        pagadoAt: cobrosTable.pagadoAt,
        createdAt: cobrosTable.createdAt,
        playerName: playersTable.name,
        playerNickname: playersTable.nickname,
        playerPhone: playersTable.phone,
      })
      .from(cobrosTable)
      .leftJoin(playersTable, eq(cobrosTable.playerId, playersTable.id))
      .where(condition)
      .orderBy(desc(cobrosTable.createdAt));

    res.json(cobros);
  } catch (error) {
    console.error("Error al obtener cobros:", error);
    res.status(500).json({ error: "Error al obtener cobros" });
  }
});

// POST /api/cobros — Registrar un nuevo cobro individual (Solo Staff)
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDbSchema();
    if (!isStaffUser(req.user)) {
      res.status(403).json({ error: "No tienes permisos para registrar cobros" });
      return;
    }

    const clubId = (req.user as { clubId: number }).clubId;
    const { playerId, monto, concepto, items, notas } = req.body;

    if (!playerId) {
      res.status(400).json({ error: "Debes seleccionar un jugador" });
      return;
    }

    const parsedMonto = Number(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      res.status(400).json({ error: "El monto debe ser un número mayor a 0" });
      return;
    }

    // Formatear items si viene concepto simple o array
    let cobroItems = items;
    if (!Array.isArray(cobroItems) || cobroItems.length === 0) {
      cobroItems = [{ concepto: (concepto || "Cobro directo").trim(), monto: parsedMonto }];
    }

    const [newCobro] = await db
      .insert(cobrosTable)
      .values({
        playerId,
        clubId,
        monto: parsedMonto,
        items: cobroItems,
        notas: notas?.trim() || null,
        estado: "pendiente",
      })
      .returning();

    // Obtener datos del jugador para devolver completo
    const [player] = await db
      .select({ name: playersTable.name, nickname: playersTable.nickname, phone: playersTable.phone })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    res.json({
      ...newCobro,
      playerName: player?.name ?? "Jugador",
      playerNickname: player?.nickname ?? null,
      playerPhone: player?.phone ?? null,
    });
  } catch (error) {
    console.error("Error al crear cobro:", error);
    res.status(500).json({ error: "Error al crear cobro" });
  }
});

// POST /api/cobros/torneo-calcular — Calculadora de torneo y reparto en partes iguales (Solo Staff)
router.post("/torneo-calcular", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDbSchema();
    if (!isStaffUser(req.user)) {
      res.status(403).json({ error: "No tienes permisos para usar la calculadora de torneo" });
      return;
    }

    const clubId = (req.user as { clubId: number }).clubId;
    const { nombre, items, jugadores } = req.body;

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      res.status(400).json({ error: "El nombre del evento es requerido (ej: 3er Torneo)" });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Debes ingresar al menos un costo compartido" });
      return;
    }

    if (!Array.isArray(jugadores) || jugadores.length === 0) {
      res.status(400).json({ error: "Debes seleccionar al menos un jugador para repartir los costos" });
      return;
    }

    // Mapear qué ítems aplican a cada jugador
    const allSelectedPlayerIds = jugadores.map((j: any) => Number(j.playerId));
    const playerItemsMap = new Map<number, { concepto: string; monto: number }[]>();
    for (const pid of allSelectedPlayerIds) {
      playerItemsMap.set(pid, []);
    }

    let totalCostos = 0;
    const validItems: { concepto: string; monto: number; playerIds?: number[] }[] = [];

    for (const it of items) {
      const c = (it.concepto || "").trim();
      const m = Number(it.monto) || 0;
      if (!c || m <= 0) continue;

      validItems.push({ concepto: c, monto: m, playerIds: it.playerIds });
      totalCostos += m;

      // Jugadores asignados a este ítem en particular
      let itemTargetPlayers =
        Array.isArray(it.playerIds) && it.playerIds.length > 0
          ? it.playerIds.map(Number).filter((pid: number) => allSelectedPlayerIds.includes(pid))
          : allSelectedPlayerIds;

      if (itemTargetPlayers.length === 0) {
        itemTargetPlayers = allSelectedPlayerIds;
      }

      const costPerAssignedPlayer = Math.round(m / itemTargetPlayers.length);
      for (const pid of itemTargetPlayers) {
        const list = playerItemsMap.get(pid);
        if (list) {
          list.push({
            concepto: c,
            monto: costPerAssignedPlayer,
          });
        }
      }
    }

    if (totalCostos <= 0 || validItems.length === 0) {
      res.status(400).json({ error: "La suma de los costos debe ser mayor a 0" });
      return;
    }

    const createdCobros: any[] = [];

    for (const j of jugadores) {
      const playerId = Number(j.playerId);
      const ajuste = Number(j.ajuste) || 0;
      const baseItems = playerItemsMap.get(playerId) || [];

      let totalBase = 0;
      for (const bi of baseItems) {
        totalBase += bi.monto;
      }

      const playerItems = [
        ...baseItems,
        ...(ajuste !== 0
          ? [{ concepto: ajuste < 0 ? "Descuento aplicado" : "Saldo / Ajuste adicional", monto: ajuste }]
          : []),
      ];

      const montoFinal = Math.max(0, totalBase + ajuste);

      const [cobro] = await db
        .insert(cobrosTable)
        .values({
          playerId,
          clubId,
          monto: montoFinal,
          items: playerItems,
          notas: `Reparto evento "${nombre.trim()}" (Total: $${totalCostos.toLocaleString("es-CL")})`,
          estado: "pendiente",
        })
        .returning();

      createdCobros.push(cobro);
    }

    // Registrar en torneoCalculosTable para auditoría
    try {
      await db.insert(torneoCalculosTable).values({
        clubId,
        nombre: nombre.trim(),
        items: validItems,
        jugadores,
        aplicado: true,
        creadoPor: (req.user as any)?.firstName || (req.user as any)?.email || "Staff",
      });
    } catch (e) {
      console.warn("Auditoría de torneoCalculos no guardada:", e);
    }

    res.json({
      success: true,
      count: createdCobros.length,
      totalCostos,
      basePerPlayer,
      message: `Se generaron exitosamente ${createdCobros.length} cobros individuales.`,
    });
  } catch (error) {
    console.error("Error al calcular y generar cobros de torneo:", error);
    res.status(500).json({ error: "Error al procesar los cobros de torneo" });
  }
});

// PATCH /api/cobros/:id — Cambiar estado a pagado / pendiente o adjuntar comprobante
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDbSchema();
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const clubId = (req.user as { clubId: number }).clubId;
    const isStaff = isStaffUser(req.user);
    const userPlayerId = (req.user as { playerId?: number | null }).playerId;

    const [existing] = await db
      .select()
      .from(cobrosTable)
      .where(and(eq(cobrosTable.id, id), eq(cobrosTable.clubId, clubId)));

    if (!existing) {
      res.status(404).json({ error: "Cobro no encontrado" });
      return;
    }

    const { estado, notas, comprobanteUrl } = req.body;

    // Si el usuario no es staff, solo puede adjuntar comprobante a su propio cobro
    if (!isStaff) {
      if (existing.playerId !== userPlayerId) {
        res.status(403).json({ error: "No tienes permiso para modificar este cobro" });
        return;
      }
      if (comprobanteUrl !== undefined) {
        const [updated] = await db
          .update(cobrosTable)
          .set({ comprobanteUrl })
          .where(eq(cobrosTable.id, id))
          .returning();
        res.json(updated);
        return;
      }
      res.status(403).json({ error: "Solo los administradores pueden confirmar pagos" });
      return;
    }

    // Si es Staff, puede actualizar estado, notas y comprobante
    const updatePayload: Record<string, any> = {};
    if (estado !== undefined) {
      const nuevoEstado = estado === "pagado" ? "pagado" : "pendiente";
      updatePayload.estado = nuevoEstado;
      updatePayload.pagadoAt = nuevoEstado === "pagado" ? new Date() : null;
      updatePayload.confirmadoPor =
        nuevoEstado === "pagado" ? (req.user as any)?.firstName || "Staff" : null;
    }
    if (notas !== undefined) {
      updatePayload.notas = notas;
    }
    if (comprobanteUrl !== undefined) {
      updatePayload.comprobanteUrl = comprobanteUrl;
    }

    const [updated] = await db
      .update(cobrosTable)
      .set(updatePayload)
      .where(eq(cobrosTable.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error al actualizar cobro:", error);
    res.status(500).json({ error: "Error al actualizar cobro" });
  }
});

// POST /api/cobros/:id/comprobante — Adjuntar comprobante de pago (Clip de pago)
router.post("/:id/comprobante", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDbSchema();
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const clubId = (req.user as { clubId: number }).clubId;
    const isStaff = isStaffUser(req.user);
    const userPlayerId = (req.user as { playerId?: number | null }).playerId;

    const [existing] = await db
      .select()
      .from(cobrosTable)
      .where(and(eq(cobrosTable.id, id), eq(cobrosTable.clubId, clubId)));

    if (!existing) {
      res.status(404).json({ error: "Cobro no encontrado" });
      return;
    }

    // Permitir al jugador dueño del cobro o a cualquier staff
    if (!isStaff && existing.playerId !== userPlayerId) {
      res.status(403).json({ error: "No tienes permiso para adjuntar comprobante a este cobro" });
      return;
    }

    const { comprobanteUrl } = req.body;
    if (!comprobanteUrl) {
      res.status(400).json({ error: "Debes enviar un comprobante (imagen o URL)" });
      return;
    }

    const [updated] = await db
      .update(cobrosTable)
      .set({ comprobanteUrl })
      .where(eq(cobrosTable.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error al guardar comprobante:", error);
    res.status(500).json({ error: "Error al adjuntar comprobante" });
  }
});

// DELETE /api/cobros/:id — Eliminar un cobro (Solo Staff)
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDbSchema();
    const isStaff = isStaffUser(req.user);
    if (!isStaff) {
      res.status(403).json({ error: "No tienes permisos para eliminar cobros" });
      return;
    }

    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const clubId = (req.user as { clubId: number }).clubId;

    const [deleted] = await db
      .delete(cobrosTable)
      .where(and(eq(cobrosTable.id, id), eq(cobrosTable.clubId, clubId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Cobro no encontrado" });
      return;
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error("Error al eliminar cobro:", error);
    res.status(500).json({ error: "Error al eliminar cobro" });
  }
});

export default router;
