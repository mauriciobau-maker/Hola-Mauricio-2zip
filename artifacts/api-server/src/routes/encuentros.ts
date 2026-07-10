import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, encuentrosTable, asistenciaTable, playersTable, usersTable, matchesTable, matchPlayersTable } from "@workspace/db";
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
// POST /encuentros/:id/generar-partidos
// Genera partidos automáticamente según el formato elegido
router.post("/encuentros/:id/generar-partidos", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { formato, sportId, parejas } = req.body as {
    formato: "americana" | "parejas_fijas";
    sportId: number;
    parejas?: Array<{ team1: number[]; team2: number[] }>;
  };

  if (!formato || !sportId) {
    res.status(400).json({ error: "formato y sportId son requeridos" });
    return;
  }

  const [encuentro] = await db.select().from(encuentrosTable).where(eq(encuentrosTable.id, id));
  if (!encuentro) { res.status(404).json({ error: "Encuentro no encontrado" }); return; }

  // Obtener jugadores confirmados
  const asistencia = await db
    .select()
    .from(asistenciaTable)
    .where(and(eq(asistenciaTable.encuentroId, id), eq(asistenciaTable.status, "confirmed")));

  const playerIds = asistencia.map((a) => a.playerId);

  if (playerIds.length < 4) {
    res.status(400).json({ error: "Se necesitan al menos 4 jugadores confirmados" });
    return;
  }

  // Actualizar encuentro con formato y deporte
  await db.update(encuentrosTable)
    .set({ formato, sportId, estado: "en_curso" })
    .where(eq(encuentrosTable.id, id));

  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId ?? null;
  const playedAt = encuentro.dateTime;
  const generatedMatches: number[] = [];

  if (formato === "americana") {
    // Algoritmo americana: todos contra todos rotando parejas
    // Con N jugadores genera N*(N-1)/4 partidos (para N par)
    const rounds = generateAmericana(playerIds);
    for (const round of rounds) {
      const [match] = await db.insert(matchesTable).values({
        sportId,
        encuentroId: id,
        team1Score: 0,
        team2Score: 0,
        result: "team1", // placeholder hasta ingresar marcador
        sets: null,
        playedAt,
        ...(clubId ? { clubId } : {}),
      } as any).returning();

      await db.insert(matchPlayersTable).values([
        ...round.team1.map((pid: number) => ({ matchId: match.id, playerId: pid, team: "team1" })),
        ...round.team2.map((pid: number) => ({ matchId: match.id, playerId: pid, team: "team2" })),
      ]);
      generatedMatches.push(match.id);
    }
  } else if (formato === "parejas_fijas" && parejas) {
    // Parejas definidas manualmente por el admin
    for (const pareja of parejas) {
      const [match] = await db.insert(matchesTable).values({
        sportId,
        encuentroId: id,
        team1Score: 0,
        team2Score: 0,
        result: "team1",
        sets: null,
        playedAt,
        ...(clubId ? { clubId } : {}),
      } as any).returning();

      await db.insert(matchPlayersTable).values([
        ...pareja.team1.map((pid: number) => ({ matchId: match.id, playerId: pid, team: "team1" })),
        ...pareja.team2.map((pid: number) => ({ matchId: match.id, playerId: pid, team: "team2" })),
      ]);
      generatedMatches.push(match.id);
    }
  }

  res.status(201).json({
    encuentroId: id,
    formato,
    matchesGenerated: generatedMatches.length,
    matchIds: generatedMatches,
  });
});

// GET /encuentros/:id/partidos — partidos de un encuentro
router.get("/encuentros/:id/partidos", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const matches = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.encuentroId, id))
    .orderBy(matchesTable.createdAt);

  const allPlayers = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of allPlayers) playerMap[p.id] = p.name;

  const result = await Promise.all(matches.map(async (m) => {
    const matchPlayers = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, m.id));

    const team1 = matchPlayers.filter((mp) => mp.team === "team1")
      .map((mp) => ({ id: mp.playerId, name: playerMap[mp.playerId] ?? "Desconocido" }));
    const team2 = matchPlayers.filter((mp) => mp.team === "team2")
      .map((mp) => ({ id: mp.playerId, name: playerMap[mp.playerId] ?? "Desconocido" }));

    return {
      id: m.id,
      team1Players: team1,
      team2Players: team2,
      team1Score: m.team1Score,
      team2Score: m.team2Score,
      result: m.result,
      sets: m.sets,
      pendingResult: m.team1Score === 0 && m.team2Score === 0,
      playedAt: m.playedAt.toISOString(),
    };
  }));

  res.json(result);
});

// PATCH /encuentros/:id/estado — cambiar estado del encuentro
router.patch("/encuentros/:id/estado", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "No autenticado" }); return; }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const { estado } = req.body as { estado: "abierto" | "en_curso" | "finalizado" };
  if (!["abierto", "en_curso", "finalizado"].includes(estado)) {
    res.status(400).json({ error: "Estado inválido" });
    return;
  }

  const [updated] = await db
    .update(encuentrosTable)
    .set({ estado })
    .where(eq(encuentrosTable.id, id))
    .returning();

  res.json(updated);
});

// Algoritmo americana: genera rondas rotando parejas
function generateAmericana(playerIds: number[]): Array<{ team1: number[]; team2: number[] }> {
  const n = playerIds.length;
  const rounds: Array<{ team1: number[]; team2: number[] }> = [];

  if (n === 4) {
    const [a, b, c, d] = playerIds;
    rounds.push({ team1: [a, b], team2: [c, d] });
    rounds.push({ team1: [a, c], team2: [b, d] });
    rounds.push({ team1: [a, d], team2: [b, c] });
  } else if (n === 8) {
    const [a, b, c, d, e, f, g, h] = playerIds;
    rounds.push({ team1: [a, b], team2: [c, d] });
    rounds.push({ team1: [e, f], team2: [g, h] });
    rounds.push({ team1: [a, c], team2: [e, g] });
    rounds.push({ team1: [b, d], team2: [f, h] });
    rounds.push({ team1: [a, e], team2: [b, f] });
    rounds.push({ team1: [c, g], team2: [d, h] });
    rounds.push({ team1: [a, f], team2: [c, h] });
  } else {
    // Para otros números, hacer round-robin simple
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j += 2) {
        if (j + 1 < n) {
          rounds.push({ team1: [playerIds[i], playerIds[j]], team2: [playerIds[i + 1] ?? playerIds[0], playerIds[j + 1]] });
        }
      }
    }
  }
  return rounds;
}

export default router;
