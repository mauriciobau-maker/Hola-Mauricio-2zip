import { Router, type IRouter } from "express";
import { db, matchesTable, playersTable, matchPlayersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ranking", async (req, res): Promise<void> => {
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  const [players, matches, allMatchPlayers] = await Promise.all([
    clubId
      ? db.select().from(playersTable).where(eq(playersTable.clubId, clubId))
      : db.select().from(playersTable),
    clubId
      ? db.select().from(matchesTable).where(eq(matchesTable.clubId, clubId))
      : db.select().from(matchesTable),
    db.select().from(matchPlayersTable),
  ]);

  const mpByMatchId: Record<number, typeof matchPlayersTable.$inferSelect[]> = {};
  for (const mp of allMatchPlayers) {
    if (!mpByMatchId[mp.matchId]) mpByMatchId[mp.matchId] = [];
    mpByMatchId[mp.matchId].push(mp);
  }

  const stats: Record<number, { wins: number; losses: number; draws: number; points: number }> = {};
  for (const p of players) stats[p.id] = { wins: 0, losses: 0, draws: 0, points: 0 };

  for (const m of matches) {
    const matchPlayers = mpByMatchId[m.id] ?? [];
    const team1Ids = matchPlayers.filter((mp) => mp.team === "team1").map((mp) => mp.playerId);
    const team2Ids = matchPlayers.filter((mp) => mp.team === "team2").map((mp) => mp.playerId);

    if (m.result === "draw") {
      for (const id of [...team1Ids, ...team2Ids]) {
        if (stats[id]) { stats[id].draws++; stats[id].points += 1; }
      }
    } else {
      const winnerIds = m.result === "team1" ? team1Ids : team2Ids;
      const loserIds = m.result === "team1" ? team2Ids : team1Ids;
      for (const id of winnerIds) {
        if (stats[id]) { stats[id].wins++; stats[id].points += 3; }
      }
      for (const id of loserIds) {
        if (stats[id]) stats[id].losses++;
      }
    }
  }

  const ranking = players
    .map((p) => {
      const s = stats[p.id] ?? { wins: 0, losses: 0, draws: 0, points: 0 };
      const totalMatches = s.wins + s.losses + s.draws;
      const winRate = totalMatches > 0 ? Math.round((s.wins / totalMatches) * 100) : 0;
      return {
        playerId: p.id,
        playerName: p.name,
        nickname: p.nickname ?? null,
        elo: p.elo,
        points: s.points,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        totalMatches,
        winRate,
      };
    })
    .sort((a, b) => b.elo - a.elo || b.wins - a.wins || a.losses - b.losses)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  res.json(ranking);
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;
  const [players, allMatches, allMatchPlayers] = await Promise.all([
    clubId
      ? db.select().from(playersTable).where(eq(playersTable.clubId, clubId))
      : db.select().from(playersTable),
    clubId
      ? db.select().from(matchesTable).where(eq(matchesTable.clubId, clubId)).orderBy(desc(matchesTable.playedAt))
      : db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt)),
    db.select().from(matchPlayersTable),
  ]);

  const mpByMatchId: Record<number, typeof matchPlayersTable.$inferSelect[]> = {};
  for (const mp of allMatchPlayers) {
    if (!mpByMatchId[mp.matchId]) mpByMatchId[mp.matchId] = [];
    mpByMatchId[mp.matchId].push(mp);
  }

  const stats: Record<number, { wins: number; losses: number; draws: number; points: number }> = {};
  for (const p of players) stats[p.id] = { wins: 0, losses: 0, draws: 0, points: 0 };

  for (const m of allMatches) {
    const matchPlayers = mpByMatchId[m.id] ?? [];
    const team1Ids = matchPlayers.filter((mp) => mp.team === "team1").map((mp) => mp.playerId);
    const team2Ids = matchPlayers.filter((mp) => mp.team === "team2").map((mp) => mp.playerId);

    if (m.result === "draw") {
      for (const id of [...team1Ids, ...team2Ids]) {
        if (stats[id]) { stats[id].draws++; stats[id].points += 1; }
      }
    } else {
      const winnerIds = m.result === "team1" ? team1Ids : team2Ids;
      const loserIds = m.result === "team1" ? team2Ids : team1Ids;
      for (const id of winnerIds) {
        if (stats[id]) { stats[id].wins++; stats[id].points += 3; }
      }
      for (const id of loserIds) {
        if (stats[id]) stats[id].losses++;
      }
    }
  }

  let topPlayer: { id: number; name: string; elo: number } | null = null;
  let maxElo = -1;
  for (const p of players) {
    if (p.elo > maxElo) { maxElo = p.elo; topPlayer = { id: p.id, name: p.name, elo: p.elo }; }
  }

  const playerMap: Record<number, string> = {};
  for (const p of players) playerMap[p.id] = p.name;

  const recentMatches = allMatches.slice(0, 5).map((m) => {
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
    totalPlayers: players.length,
    totalMatches: allMatches.length,
    topPlayer: topPlayer && topPlayer.elo > 1500 ? topPlayer : null,
    recentMatches,
  });
});

export default router;
