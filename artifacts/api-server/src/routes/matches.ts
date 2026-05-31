import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, matchesTable, playersTable, eloHistoryTable } from "@workspace/db";
import {
  CreateMatchBody,
  GetMatchParams,
  UpdateMatchParams,
  UpdateMatchBody,
  DeleteMatchParams,
} from "@workspace/api-zod";
import { calculateMatchEloChanges, STARTING_ELO } from "../elo";

const router: IRouter = Router();

/**
 * Replays all matches in chronological order to compute accurate Elo for every player.
 * Called after any match create / update / delete to keep Elo consistent.
 */
async function recalculateAllElo(): Promise<void> {
  // Reset all players to starting Elo
  await db.update(playersTable).set({ elo: STARTING_ELO });
  // Clear all Elo history
  await db.delete(eloHistoryTable);

  // Get all matches in chronological order
  const matches = await db.select().from(matchesTable).orderBy(asc(matchesTable.playedAt));
  if (matches.length === 0) return;

  // Build an in-memory Elo map (all start at STARTING_ELO)
  const players = await db.select().from(playersTable);
  const eloMap: Record<number, number> = {};
  for (const p of players) eloMap[p.id] = STARTING_ELO;

  for (const match of matches) {
    const team1Won = match.team1SetsWon > match.team2SetsWon;
    const team1 = [
      { id: match.team1Player1Id, elo: eloMap[match.team1Player1Id] ?? STARTING_ELO },
      { id: match.team1Player2Id, elo: eloMap[match.team1Player2Id] ?? STARTING_ELO },
    ];
    const team2 = [
      { id: match.team2Player1Id, elo: eloMap[match.team2Player1Id] ?? STARTING_ELO },
      { id: match.team2Player2Id, elo: eloMap[match.team2Player2Id] ?? STARTING_ELO },
    ];

    const changes = calculateMatchEloChanges(team1, team2, team1Won);

    // Save Elo history
    await db.insert(eloHistoryTable).values(
      changes.map((c) => ({
        playerId: c.playerId,
        matchId: match.id,
        eloBefore: c.eloBefore,
        eloAfter: c.eloAfter,
        eloChange: c.eloChange,
      }))
    );

    // Update in-memory Elo map
    for (const c of changes) {
      eloMap[c.playerId] = c.eloAfter;
    }
  }

  // Persist final Elos to DB
  for (const [playerIdStr, elo] of Object.entries(eloMap)) {
    await db
      .update(playersTable)
      .set({ elo })
      .where(eq(playersTable.id, parseInt(playerIdStr)));
  }
}

/**
 * Enrich a match record with player names and Elo changes from history.
 */
async function enrichMatch(
  m: typeof matchesTable.$inferSelect,
  playerMap: Record<number, string>,
) {
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

  return {
    id: m.id,
    team1Player1Id: m.team1Player1Id,
    team1Player2Id: m.team1Player2Id,
    team2Player1Id: m.team2Player1Id,
    team2Player2Id: m.team2Player2Id,
    team1SetsWon: m.team1SetsWon,
    team2SetsWon: m.team2SetsWon,
    sets: m.sets as Array<{ setNumber: number; team1Games: number; team2Games: number }>,
    playedAt: m.playedAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
    team1Player1Name: playerMap[m.team1Player1Id] ?? null,
    team1Player2Name: playerMap[m.team1Player2Id] ?? null,
    team2Player1Name: playerMap[m.team2Player1Id] ?? null,
    team2Player2Name: playerMap[m.team2Player2Id] ?? null,
    eloChanges,
  };
}

router.get("/matches", async (_req, res): Promise<void> => {
  const matches = await db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt));
  const players = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of players) playerMap[p.id] = p.name;
  const result = await Promise.all(matches.map((m) => enrichMatch(m, playerMap)));
  res.json(result);
});

router.post("/matches", async (req, res): Promise<void> => {
  const parsed = CreateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id, sets, playedAt } =
    parsed.data;

  const playerIds = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id];
  if (new Set(playerIds).size !== 4) {
    res.status(400).json({ error: "Los cuatro jugadores deben ser diferentes" });
    return;
  }

  const setsData = sets as Array<{ setNumber: number; team1Games: number; team2Games: number }>;
  let team1SetsWon = 0;
  let team2SetsWon = 0;
  for (const s of setsData) {
    if (s.team1Games > s.team2Games) team1SetsWon++;
    else if (s.team2Games > s.team1Games) team2SetsWon++;
  }

  const [match] = await db
    .insert(matchesTable)
    .values({ team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id, team1SetsWon, team2SetsWon, sets: setsData, playedAt: new Date(playedAt) })
    .returning();

  // Recalculate Elo for all matches
  await recalculateAllElo();

  const players = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of players) playerMap[p.id] = p.name;

  res.status(201).json(await enrichMatch(match, playerMap));
});

router.get("/matches/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMatchParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, params.data.id));
  if (!match) {
    res.status(404).json({ error: "Partido no encontrado" });
    return;
  }
  const players = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of players) playerMap[p.id] = p.name;
  res.json(await enrichMatch(match, playerMap));
});

router.patch("/matches/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateMatchParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateMatchBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Partido no encontrado" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const setsData = body.data.sets as Array<{ setNumber: number; team1Games: number; team2Games: number }> | undefined;
  if (setsData) {
    let team1SetsWon = 0;
    let team2SetsWon = 0;
    for (const s of setsData) {
      if (s.team1Games > s.team2Games) team1SetsWon++;
      else if (s.team2Games > s.team1Games) team2SetsWon++;
    }
    updates.sets = setsData;
    updates.team1SetsWon = team1SetsWon;
    updates.team2SetsWon = team2SetsWon;
  }

  if (body.data.team1Player1Id !== undefined) updates.team1Player1Id = body.data.team1Player1Id;
  if (body.data.team1Player2Id !== undefined) updates.team1Player2Id = body.data.team1Player2Id;
  if (body.data.team2Player1Id !== undefined) updates.team2Player1Id = body.data.team2Player1Id;
  if (body.data.team2Player2Id !== undefined) updates.team2Player2Id = body.data.team2Player2Id;
  if (body.data.playedAt !== undefined) updates.playedAt = new Date(body.data.playedAt);

  const [updated] = await db
    .update(matchesTable)
    .set(updates)
    .where(eq(matchesTable.id, params.data.id))
    .returning();

  await recalculateAllElo();

  const allPlayers = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of allPlayers) playerMap[p.id] = p.name;

  res.json(await enrichMatch(updated, playerMap));
});

router.delete("/matches/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMatchParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(matchesTable)
    .where(eq(matchesTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Partido no encontrado" });
    return;
  }

  await recalculateAllElo();

  res.sendStatus(204);
});

export default router;
