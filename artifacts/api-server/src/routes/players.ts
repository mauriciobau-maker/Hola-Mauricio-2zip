import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, playersTable, matchesTable, eloHistoryTable } from "@workspace/db";
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

router.get("/players", async (_req, res): Promise<void> => {
  const players = await db.select().from(playersTable).orderBy(playersTable.name);
  res.json(players.map(toPlayerResponse));
});

router.post("/players", async (req, res): Promise<void> => {
  const parsed = CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [player] = await db.insert(playersTable).values(parsed.data).returning();
  res.status(201).json(toPlayerResponse(player));
});

router.get("/players/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPlayerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, params.data.id));
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

  const allMatches = await db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt));
  const playerMatches = allMatches.filter(
    (m) =>
      m.team1Player1Id === playerId ||
      m.team1Player2Id === playerId ||
      m.team2Player1Id === playerId ||
      m.team2Player2Id === playerId,
  );

  let wins = 0, losses = 0, setsWon = 0, setsLost = 0;
  for (const match of playerMatches) {
    const onTeam1 = match.team1Player1Id === playerId || match.team1Player2Id === playerId;
    if (onTeam1) {
      if (match.team1SetsWon > match.team2SetsWon) wins++;
      else losses++;
      setsWon += match.team1SetsWon;
      setsLost += match.team2SetsWon;
    } else {
      if (match.team2SetsWon > match.team1SetsWon) wins++;
      else losses++;
      setsWon += match.team2SetsWon;
      setsLost += match.team1SetsWon;
    }
  }

  const totalMatches = playerMatches.length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const points = wins * 3;

  let currentStreak = 0;
  for (const match of playerMatches) {
    const onTeam1 = match.team1Player1Id === playerId || match.team1Player2Id === playerId;
    const won = onTeam1 ? match.team1SetsWon > match.team2SetsWon : match.team2SetsWon > match.team1SetsWon;
    if (won) currentStreak++;
    else break;
  }

  const allPlayersList = await db.select().from(playersTable);
  const playerMap: Record<number, string> = {};
  for (const p of allPlayersList) playerMap[p.id] = p.name;

  const recentMatches = playerMatches.slice(0, 5).map((m) => ({
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
  }));

  res.json({
    playerId,
    playerName: player.name,
    totalMatches,
    wins,
    losses,
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
