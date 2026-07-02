import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, encuentrosTable, asistenciaTable, playersTable, usersTable } from "@workspace/db";
import * as z from "zod";

const router: IRouter = Router();

const EncuentroInputSchema = z.object({
  title: z.string().min(1),
  dateTime: z.string(),
  location: z.string().min(1),
  maxSpots: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  playerIds: z.array(z.number().int()).optional(),
  notificationEmail: z.boolean().optional(),
  notificationWhatsapp: z.boolean().optional(),
});

const EncuentroUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  dateTime: z.string().optional(),
  location: z.string().min(1).optional(),
  maxSpots: z.number().int().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
  notificationEmail: z.boolean().optional(),
  notificationWhatsapp: z.boolean().optional(),
});

const RsvpSchema = z.object({
  status: z.enum(["confirmed", "declined", "pending"]),
});

async function enrichEncuentro(e: typeof encuentrosTable.$inferSelect) {
  return {
    id: e.id,
    title: e.title,
    dateTime: e.dateTime.toISOString(),
    location: e.location,
    maxSpots: e.maxSpots ?? null,
    notes: e.notes ?? null,
    organizerId: e.organizerId ?? null,
    notificationEmail: e.notificationEmail,
    notificationWhatsapp: e.notificationWhatsapp,
    createdAt: e.createdAt.toISOString(),
  };
}

async function getAsistenciaList(encuentroId: number) {
  const players = await db.select().from(playersTable);
  const playerMap: Record<number, { name: string; nickname: string | null }> = {};
  for (const p of players) playerMap[p.id] = { name: p.name, nickname: p.nickname ?? null };

  const rows = await db
    .select()
    .from(asistenciaTable)
    .where(eq(asistenciaTable.encuentroId, encuentroId));

  return rows.map((r) => ({
    id: r.id,
    encuentroId: r.encuentroId,
    playerId: r.playerId,
    playerName: playerMap[r.playerId]?.name ?? "Desconocido",
    playerNickname: playerMap[r.playerId]?.nickname ?? null,
    status: r.status,
    respondedAt: r.respondedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

// GET /encuentros
router.get("/encuentros", async (req, res): Promise<void> => {
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  const rows = clubId
    ? await db.select().from(encuentrosTable).where(eq(encuentrosTable.clubId, clubId)).orderBy(desc(encuentrosTable.dateTime))
    : await db.select().from(encuentrosTable).orderBy(desc(encuentrosTable.dateTime));
  const result = await Promise.all(rows.map(enrichEncuentro));
  res.json(result);
});

// POST /encuentros
router.post("/encuentros", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const parsed = EncuentroInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, dateTime, location, maxSpots, notes, playerIds, notificationEmail, notificationWhatsapp } = parsed.data;

  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId ?? null;

  const [encuentro] = await db
    .insert(encuentrosTable)
    .values({
      title,
      dateTime: new Date(dateTime),
      location,
      maxSpots: maxSpots ?? null,
      notes: notes ?? null,
      organizerId: req.user.id,
      clubId,
      notificationEmail: notificationEmail ?? false,
      notificationWhatsapp: notificationWhatsapp ?? false,
    })
    .returning();

  // Auto-create asistencia entries for invited players
  if (playerIds && playerIds.length > 0) {
    await db.insert(asistenciaTable).values(
      playerIds.map((pid: number) => ({
        encuentroId: encuentro.id,
        playerId: pid,
        status: "pending" as const,
      }))
    );
  }

  res.status(201).json(await enrichEncuentro(encuentro));
});

// GET /encuentros/:id
router.get("/encuentros/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  const whereClause = clubId
    ? and(eq(encuentrosTable.id, id), eq(encuentrosTable.clubId, clubId))
    : eq(encuentrosTable.id, id);
  const [encuentro] = await db.select().from(encuentrosTable).where(whereClause);
  if (!encuentro) { res.status(404).json({ error: "No encontrado" }); return; }

  const asistencia = await getAsistenciaList(id);
  res.json({ encuentro: await enrichEncuentro(encuentro), asistencia });
});

// PATCH /encuentros/:id
router.patch("/encuentros/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = EncuentroUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(encuentrosTable).where(eq(encuentrosTable.id, id));
  if (!existing) { res.status(404).json({ error: "No encontrado" }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.dateTime !== undefined) updates.dateTime = new Date(parsed.data.dateTime);
  if (parsed.data.location !== undefined) updates.location = parsed.data.location;
  if (parsed.data.maxSpots !== undefined) updates.maxSpots = parsed.data.maxSpots;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.notificationEmail !== undefined) updates.notificationEmail = parsed.data.notificationEmail;
  if (parsed.data.notificationWhatsapp !== undefined) updates.notificationWhatsapp = parsed.data.notificationWhatsapp;

  const [updated] = await db
    .update(encuentrosTable)
    .set(updates)
    .where(eq(encuentrosTable.id, id))
    .returning();

  res.json(await enrichEncuentro(updated));
});

// DELETE /encuentros/:id
router.delete("/encuentros/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [deleted] = await db.delete(encuentrosTable).where(eq(encuentrosTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "No encontrado" }); return; }

  res.sendStatus(204);
});

// POST /encuentros/:id/rsvp
router.post("/encuentros/:id/rsvp", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = RsvpSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [encuentro] = await db.select().from(encuentrosTable).where(eq(encuentrosTable.id, id));
  if (!encuentro) { res.status(404).json({ error: "Encuentro no encontrado" }); return; }

  // Get playerId from user's linked player
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
  if (!user?.playerId) {
    res.status(400).json({ error: "Tu cuenta no está vinculada a un jugador" });
    return;
  }

  const playerId = user.playerId;
  const status = parsed.data.status;
  const now = new Date();

  // Upsert asistencia
  const [existing] = await db
    .select()
    .from(asistenciaTable)
    .where(eq(asistenciaTable.encuentroId, id));

  let row;
  const existingForPlayer = (await db.select().from(asistenciaTable)
    .where(eq(asistenciaTable.encuentroId, id)))
    .find((a) => a.playerId === playerId);

  if (existingForPlayer) {
    const [updated] = await db
      .update(asistenciaTable)
      .set({ status, respondedAt: status !== "pending" ? now : null })
      .where(eq(asistenciaTable.id, existingForPlayer.id))
      .returning();
    row = updated;
  } else {
    const [created] = await db
      .insert(asistenciaTable)
      .values({ encuentroId: id, playerId, status, respondedAt: status !== "pending" ? now : null })
      .returning();
    row = created;
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, playerId));
  res.json({
    id: row.id,
    encuentroId: row.encuentroId,
    playerId: row.playerId,
    playerName: player?.name ?? "Desconocido",
    playerNickname: player?.nickname ?? null,
    status: row.status,
    respondedAt: row.respondedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
