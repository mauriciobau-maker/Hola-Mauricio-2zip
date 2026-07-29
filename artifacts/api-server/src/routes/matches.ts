import { Router, type IRouter } from "express";
import { eq, desc, asc, and, inArray } from "drizzle-orm";
import { db, matchesTable, playersTable, eloHistoryTable, matchPlayersTable, sportsTable, clubSportsTable } from "@workspace/db";
import { calculateMatchEloChanges, STARTING_ELO } from "../elo";

const router: IRouter = Router();

/**
 * Recalcula todo el Elo desde cero considerando ÚNICAMENTE partidos confirmados.
 */
async function recalculateAllElo(): Promise<void> {
  await db.update(playersTable).set({ elo: STARTING_ELO });
  await db.delete(eloHistoryTable);

  // Obtener solo partidos con resultado confirmado/oficial
  const allMatches = await db.select().from(matchesTable).orderBy(asc(matchesTable.playedAt));
  const matches = allMatches.filter((m: any) => !m.status || m.status === "confirmed");

  if (matches.length === 0) return;

  const players = await db.select().from(playersTable);
  const eloMap: Record<number, number> = {};
  for (const p of players) eloMap[p.id] = STARTING_ELO;

  for (const match of matches) {
    const matchPlayers = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, match.id));

    const team1 = matchPlayers
      .filter((mp) => mp.team === "team1")
      .map((mp) => ({ id: mp.playerId, elo: eloMap[mp.playerId] ?? STARTING_ELO }));

    const team2 = matchPlayers
      .filter((mp) => mp.team === "team2")
      .map((mp) => ({ id: mp.playerId, elo: eloMap[mp.playerId] ?? STARTING_ELO }));

    if (team1.length === 0 || team2.length === 0) continue;

    const team1Won = match.result === "team1";
    const isDraw = match.result === "draw";

    const changes = isDraw
      ? calculateMatchEloChanges(team1, team2, false, true)
      : calculateMatchEloChanges(team1, team2, team1Won);

    await db.insert(eloHistoryTable).values(
      changes.map((c) => ({
        playerId: c.playerId,
        matchId: match.id,
        sportId: match.sportId,
        eloBefore: c.eloBefore,
        eloAfter: c.eloAfter,
        eloChange: c.eloChange,
      }))
    );

    for (const c of changes) {
      eloMap[c.playerId] = c.eloAfter;
    }
  }

  for (const [playerIdStr, elo] of Object.entries(eloMap)) {
    await db
      .update(playersTable)
      .set({ elo })
      .where(eq(playersTable.id, parseInt(playerIdStr)));
  }
}

/**
 * Enriquece un partido con jugadores, deporte y cambios de Elo.
 */
async function enrichMatch(m: typeof matchesTable.$inferSelect) {
  const matchPlayers = await db
    .select()
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.matchId, m.id));

  const allPlayers = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of allPlayers) playerMap[p.id] = p.name;

  const [sport] = await db.select().from(sportsTable).where(eq(sportsTable.id, m.sportId));

  const history = await db
    .select()
    .from(eloHistoryTable)
    .where(eq(eloHistoryTable.matchId, m.id));

  const eloChanges = history.map((h) => ({
    playerId: h.playerId,
    playerName: playerMap[h.playerId] ?? "Desconocido",
    eloBefore: h.eloBefore,
    eloAfter: h.eloAfter,
    eloChange: h.eloChange,
  }));

  const team1Players = matchPlayers
    .filter((mp) => mp.team === "team1")
    .map((mp) => ({ id: mp.playerId, name: playerMap[mp.playerId] ?? "Desconocido" }));

  const team2Players = matchPlayers
    .filter((mp) => mp.team === "team2")
    .map((mp) => ({ id: mp.playerId, name: playerMap[mp.playerId] ?? "Desconocido" }));

  return {
    id: m.id,
    sportId: m.sportId,
    sportName: sport?.name ?? "Desconocido",
    sportSlug: sport?.slug ?? "",
    team1Players,
    team2Players,
    team1Score: m.team1Score,
    team2Score: m.team2Score,
    sets: m.sets,
    result: m.result,
    status: (m as any).status || "confirmed",
    reportedBy: (m as any).reportedBy || null,
    encuentroId: (m as any).encuentroId || null,
    playedAt: m.playedAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
    eloChanges,
  };
}

// GET /matches
router.get("/matches", async (req, res): Promise<void> => {
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  const matches = clubId
    ? await db.select().from(matchesTable).where(eq(matchesTable.clubId, clubId)).orderBy(desc(matchesTable.playedAt))
    : await db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt));
  const result = await Promise.all(matches.map((m) => enrichMatch(m)));
  res.json(result);
});

// POST /matches - Carga inicial del partido (estado por defecto: pending_confirmation)
router.post("/matches", async (req, res): Promise<void> => {
  const { sportId, team1PlayerIds, team2PlayerIds, team1Score, team2Score, sets, playedAt, encuentroId, autoConfirm } = req.body;

  if (!sportId || !team1PlayerIds || !team2PlayerIds || !playedAt) {
    res.status(400).json({ error: "Faltan campos requeridos: sportId, team1PlayerIds, team2PlayerIds, playedAt" });
    return;
  }

  if (!Array.isArray(team1PlayerIds) || !Array.isArray(team2PlayerIds)) {
    res.status(400).json({ error: "team1PlayerIds y team2PlayerIds deben ser arrays" });
    return;
  }

  const allIds = [...team1PlayerIds, ...team2PlayerIds];
  if (new Set(allIds).size !== allIds.length) {
    res.status(400).json({ error: "Un jugador no puede estar en ambos equipos" });
    return;
  }

  const [sport] = await db.select().from(sportsTable).where(eq(sportsTable.id, sportId));
  if (!sport) {
    res.status(404).json({ error: "Deporte no encontrado" });
    return;
  }

  const t1Score = team1Score ?? 0;
  const t2Score = team2Score ?? 0;
  let result = "draw";
  if (t1Score > t2Score) result = "team1";
  else if (t2Score > t1Score) result = "team2";

  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId ?? null;
  const status = autoConfirm ? "confirmed" : "pending_confirmation";

  const [match] = await db
    .insert(matchesTable)
    .values({
      sportId,
      clubId,
      team1Score: t1Score,
      team2Score: t2Score,
      sets: sets ?? null,
      result,
      status,
      encuentroId: encuentroId ?? null,
      playedAt: new Date(playedAt),
    } as any)
    .returning();

  const matchPlayerValues = [
    ...team1PlayerIds.map((pid: number) => ({ matchId: match.id, playerId: pid, team: "team1" })),
    ...team2PlayerIds.map((pid: number) => ({ matchId: match.id, playerId: pid, team: "team2" })),
  ];
  await db.insert(matchPlayersTable).values(matchPlayerValues);

  // Solo recalculamos ELO si nació como confirmado
  if (status === "confirmed") {
    await recalculateAllElo();
  }

  res.status(201).json(await enrichMatch(match));
});

// POST /matches/:id/confirm - Confirmación por parte de los participantes
router.post("/matches/:id/confirm", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Partido no encontrado" }); return; }

  const [updated] = await db
    .update(matchesTable)
    .set({ status: "confirmed" } as any)
    .where(eq(matchesTable.id, id))
    .returning();

  // Al confirmar el partido, se impacta en la tabla global de ELO y parejas
  await recalculateAllElo();
  res.json(await enrichMatch(updated));
});

// GET /matches/:id
router.get("/matches/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
  if (!match) { res.status(404).json({ error: "Partido no encontrado" }); return; }

  res.json(await enrichMatch(match));
});

// PATCH /matches/:id
router.patch("/matches/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Partido no encontrado" }); return; }

  const { team1PlayerIds, team2PlayerIds, team1Score, team2Score, sets, playedAt, status } = req.body;

  const updates: Record<string, unknown> = {};
  if (team1Score !== undefined) updates.team1Score = team1Score;
  if (team2Score !== undefined) updates.team2Score = team2Score;
  if (sets !== undefined) updates.sets = sets;
  if (playedAt !== undefined) updates.playedAt = new Date(playedAt);
  if (status !== undefined) updates.status = status;

  const t1 = team1Score ?? existing.team1Score;
  const t2 = team2Score ?? existing.team2Score;
  updates.result = t1 > t2 ? "team1" : t2 > t1 ? "team2" : "draw";

  const [updated] = await db
    .update(matchesTable)
    .set(updates)
    .where(eq(matchesTable.id, id))
    .returning();

  if (team1PlayerIds || team2PlayerIds) {
    await db.delete(matchPlayersTable).where(eq(matchPlayersTable.matchId, id));
    const t1Ids = team1PlayerIds ?? [];
    const t2Ids = team2PlayerIds ?? [];
    if (t1Ids.length > 0 || t2Ids.length > 0) {
      await db.insert(matchPlayersTable).values([
        ...t1Ids.map((pid: number) => ({ matchId: id, playerId: pid, team: "team1" })),
        ...t2Ids.map((pid: number) => ({ matchId: id, playerId: pid, team: "team2" })),
      ]);
    }
  }

  await recalculateAllElo();
  res.json(await enrichMatch(updated));
});

// DELETE /matches/:id
router.delete("/matches/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [deleted] = await db
    .delete(matchesTable)
    .where(eq(matchesTable.id, id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Partido no encontrado" }); return; }

  await recalculateAllElo();
  res.sendStatus(204);
});

// GET /sports
router.get("/sports", async (req, res): Promise<void> => {
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;

  if (clubId) {
    const sports = await db
      .select({
        id: sportsTable.id,
        name: sportsTable.name,
        slug: sportsTable.slug,
        teamSize: sportsTable.teamSize,
        useSets: sportsTable.useSets,
        active: sportsTable.active,
      })
      .from(sportsTable)
      .innerJoin(clubSportsTable, eq(clubSportsTable.sportId, sportsTable.id))
      .where(
        and(
          eq(clubSportsTable.clubId, clubId),
          eq(clubSportsTable.active, true),
          eq(sportsTable.active, true),
        ),
      );
    res.json(sports);
    return;
  }

  const sports = await db.select().from(sportsTable).where(eq(sportsTable.active, true));
  res.json(sports);
});

export default router;