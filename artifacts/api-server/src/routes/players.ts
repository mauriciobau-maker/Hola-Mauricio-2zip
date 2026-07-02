import { Router, type IRouter } from "express";
import { eq, desc, asc, and } from "drizzle-orm";
import { db, playersTable, matchesTable, eloHistoryTable, matchPlayersTable } from "@workspace/db";
import {
  CreatePlayerBody,
  GetPlayerParams,
  UpdatePlayerParams,
  UpdatePlayerBody,
  DeletePlayerParams,
  GetPlayerStatsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toPlayerResponse(p: typeof playersTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    nickname: p.nickname ?? null,
    elo: p.elo,
    avatarInitials: p.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/players", async (req, res): Promise<void> => {
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  const players = clubId
    ? await db.select().from(playersTable).where(eq(playersTable.clubId, clubId)).orderBy(playersTable.name)
    : await db.select().from(playersTable).orderBy(playersTable.name);
  res.json(players.map(toPlayerResponse));
});

router.post("/players", async (req, res): Promise<void> => {
  const parsed = CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId ?? null;
  const [player] = await db.insert(playersTable).values({ ...parsed.data, clubId }).returning();
  res.status(201).json(toPlayerResponse(player));
});

router.get("/players/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPlayerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  const whereClause = clubId
    ? and(eq(playersTable.id, params.data.id), eq(playersTable.clubId, clubId))
    : eq(playersTable.id, params.data.id);
  const [player] = await db.select().from(playersTable).where(whereClause);
  if (!player) {
    res.status(404).json({ error: "Jugador no encontrado" });
    return;
  }
  res.json(toPlayerResponse(player));
});

router.patch("/players/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePlayerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdatePlayerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if ("nickname" in body.data) updates.nickname = body.data.nickname ?? null;

  const [updated] = await db
    .update(playersTable)
    .set(updates)
    .where(eq(playersTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Jugador no encontrado" });
    return;
  }
  res.json(toPlayerResponse(updated));
});

router.delete("/players/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePlayerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(playersTable).where(eq(playersTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Jugador no encontrado" });
    return;
  }
  res.sendStatus(204);
});

router.get("/players/:id/stats", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPlayerStatsParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const playerId = params.data.id;
  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, playerId));
  if (!player) {
    res.status(404).json({ error: "Jugador no encontrado" });
    return;
  }

  // Obtener entradas de match_players para este jugador
  const playerMatchEntries = await db
    .select()
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.playerId, playerId));

  const matchIds = playerMatchEntries.map((mp) => mp.matchId);

  if (matchIds.length === 0) {
    res.json({
      playerId,
      playerName: player.name,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      points: 0,
      setsWon: 0,
      setsLost: 0,
      currentStreak: 0,
      recentMatches: [],
    });
    return;
  }

  const [allMatches, allMatchPlayers, allPlayersList] = await Promise.all([
    db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt)),
    db.select().from(matchPlayersTable),
    db.select().from(playersTable),
  ]);

  const playerMatches = allMatches.filter((m) => matchIds.includes(m.id));

  const mpByMatchId: Record<number, typeof matchPlayersTable.$inferSelect[]> = {};
  for (const mp of allMatchPlayers) {
    if (matchIds.includes(mp.matchId)) {
      if (!mpByMatchId[mp.matchId]) mpByMatchId[mp.matchId] = [];
      mpByMatchId[mp.matchId].push(mp);
    }
  }

  const playerMap: Record<number, string> = {};
  for (const p of allPlayersList) playerMap[p.id] = p.name;

  let wins = 0, losses = 0, draws = 0, setsWon = 0, setsLost = 0;
  for (const match of playerMatches) {
    const matchPlayers = mpByMatchId[match.id] ?? [];
    const myEntry = matchPlayers.find((mp) => mp.playerId === playerId);
    if (!myEntry) continue;
    const onTeam1 = myEntry.team === "team1";

    if (match.result === "draw") {
      draws++;
    } else {
      const won = onTeam1 ? match.result === "team1" : match.result === "team2";
      if (won) wins++; else losses++;
    }
    setsWon += onTeam1 ? match.team1Score : match.team2Score;
    setsLost += onTeam1 ? match.team2Score : match.team1Score;
  }

  const totalMatches = wins + losses + draws;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const points = wins * 3 + draws;

  let currentStreak = 0;
  for (const match of playerMatches) {
    const matchPlayers = mpByMatchId[match.id] ?? [];
    const myEntry = matchPlayers.find((mp) => mp.playerId === playerId);
    if (!myEntry) break;
    const onTeam1 = myEntry.team === "team1";
    const won = onTeam1 ? match.result === "team1" : match.result === "team2";
    if (won) currentStreak++; else break;
  }

  const recentMatches = playerMatches.slice(0, 5).map((m) => {
    const matchPlayers = mpByMatchId[m.id] ?? [];
    const team1Players = matchPlayers
      .filter((mp) => mp.team === "team1")
      .map((mp) => ({ id: mp.playerId, name: playerMap[mp.playerId] ?? "Desconocido" }));
    const team2Players = matchPlayers
      .filter((mp) => mp.team === "team2")
      .map((mp) => ({ id: mp.playerId, name: playerMap[mp.playerId] ?? "Desconocido" }));
    return {
      id: m.id,
      team1Players,
      team2Players,
      team1Score: m.team1Score,
      team2Score: m.team2Score,
      result: m.result,
      sets: m.sets,
      playedAt: m.playedAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
    };
  });

  res.json({
    playerId,
    playerName: player.name,
    totalMatches,
    wins,
    losses,
    draws,
    winRate,
    points,
    setsWon,
    setsLost,
    currentStreak,
    recentMatches,
  });
});

router.get("/players/:id/elo-history", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
  if (!player) {
    res.status(404).json({ error: "Jugador no encontrado" });
    return;
  }

  const history = await db
    .select({ h: eloHistoryTable, playedAt: matchesTable.playedAt })
    .from(eloHistoryTable)
    .innerJoin(matchesTable, eq(eloHistoryTable.matchId, matchesTable.id))
    .where(eq(eloHistoryTable.playerId, id))
    .orderBy(asc(matchesTable.playedAt));

  res.json(
    history.map((row) => ({
      id: row.h.id,
      playerId: row.h.playerId,
      matchId: row.h.matchId,
      eloBefore: row.h.eloBefore,
      eloAfter: row.h.eloAfter,
      eloChange: row.h.eloChange,
      matchPlayedAt: row.playedAt.toISOString(),
      createdAt: row.h.createdAt.toISOString(),
    }))
  );
});

export default router;
