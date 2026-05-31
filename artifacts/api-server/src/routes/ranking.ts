import { Router, type IRouter } from "express";
import { db, matchesTable, playersTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ranking", async (_req, res): Promise<void> => {
  const players = await db.select().from(playersTable);
  const matches = await db.select().from(matchesTable);

  const stats: Record<number, { wins: number; losses: number; points: number }> = {};
  for (const p of players) {
    stats[p.id] = { wins: 0, losses: 0, points: 0 };
  }

  for (const m of matches) {
    const winner = m.team1SetsWon > m.team2SetsWon ? "team1" : "team2";
    const winnerIds =
      winner === "team1"
        ? [m.team1Player1Id, m.team1Player2Id]
        : [m.team2Player1Id, m.team2Player2Id];
    const loserIds =
      winner === "team1"
        ? [m.team2Player1Id, m.team2Player2Id]
        : [m.team1Player1Id, m.team1Player2Id];

    for (const id of winnerIds) {
      if (stats[id]) { stats[id].wins++; stats[id].points += 3; }
    }
    for (const id of loserIds) {
      if (stats[id]) stats[id].losses++;
    }
  }

  const ranking = players
    .map((p) => {
      const s = stats[p.id] ?? { wins: 0, losses: 0, points: 0 };
      const totalMatches = s.wins + s.losses;
      const winRate = totalMatches > 0 ? Math.round((s.wins / totalMatches) * 100) : 0;
      return {
        playerId: p.id,
        playerName: p.name,
        nickname: p.nickname ?? null,
        elo: p.elo,
        points: s.points,
        wins: s.wins,
        losses: s.losses,
        totalMatches,
        winRate,
      };
    })
    // Primary sort: Elo (desc). Tiebreaker: wins, then losses
    .sort((a, b) => b.elo - a.elo || b.wins - a.wins || a.losses - b.losses)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  res.json(ranking);
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  const players = await db.select().from(playersTable);
  const allMatches = await db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt));

  const stats: Record<number, { wins: number; losses: number; points: number }> = {};
  for (const p of players) {
    stats[p.id] = { wins: 0, losses: 0, points: 0 };
  }

  for (const m of allMatches) {
    const winner = m.team1SetsWon > m.team2SetsWon ? "team1" : "team2";
    const winnerIds =
      winner === "team1"
        ? [m.team1Player1Id, m.team1Player2Id]
        : [m.team2Player1Id, m.team2Player2Id];
    const loserIds =
      winner === "team1"
        ? [m.team2Player1Id, m.team2Player2Id]
        : [m.team1Player1Id, m.team1Player2Id];
    for (const id of winnerIds) {
      if (stats[id]) { stats[id].wins++; stats[id].points += 3; }
    }
    for (const id of loserIds) {
      if (stats[id]) stats[id].losses++;
    }
  }

  // Top player by Elo
  let topPlayer: { id: number; name: string; elo: number } | null = null;
  let maxElo = -1;
  for (const p of players) {
    if (p.elo > maxElo) {
      maxElo = p.elo;
      topPlayer = { id: p.id, name: p.name, elo: p.elo };
    }
  }

  const playerMap: Record<number, string> = {};
  for (const p of players) playerMap[p.id] = p.name;

  const recentMatches = allMatches.slice(0, 5).map((m) => ({
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
    totalPlayers: players.length,
    totalMatches: allMatches.length,
    topPlayer: topPlayer && topPlayer.elo > 1500 ? topPlayer : null,
    recentMatches,
  });
});

export default router;
