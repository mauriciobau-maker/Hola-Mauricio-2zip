import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, matchesTable, playersTable, eloHistoryTable, matchPlayersTable } from "@workspace/db";
import { getCurrentClubId, isSuperAdminUser, requireCommunityAccess } from "../middlewares/requireCommunity";

const router: IRouter = Router();

type SetScore = { setNumber: number; team1Games: number; team2Games: number };

interface ParejaKey { p1: number; p2: number; }
interface ParejaAccum {
  wins: number; losses: number; draws: number;
  scoreWon: number; scoreLost: number;
  gamesWon: number; gamesLost: number;
}

function sortedPair(a: number, b: number): ParejaKey {
  return a < b ? { p1: a, p2: b } : { p1: b, p2: a };
}
function pairKey(p: ParejaKey): string { return `${p.p1}_${p.p2}`; }

function requireTargetClub(req: Parameters<typeof requireCommunityAccess>[0], res: Parameters<typeof requireCommunityAccess>[1]): number | null {
  const clubId = getCurrentClubId(req);
  if (clubId != null) return clubId;

  if (isSuperAdminUser(req.user)) {
    res.status(400).json({ error: "Selecciona un club para consultar las parejas" });
  } else {
    res.status(403).json({ error: "Community membership required" });
  }
  return null;
}

router.get("/parejas", requireCommunityAccess, async (req, res): Promise<void> => {
  try {
    const clubId = requireTargetClub(req, res);
    if (!clubId) return;

    const [matches, players] = await Promise.all([
      db.select().from(matchesTable).where(eq(matchesTable.clubId, clubId)),
      db.select().from(playersTable).where(eq(playersTable.clubId, clubId)),
    ]);

    const matchIds = matches.map((m) => m.id);
    const allMatchPlayers = matchIds.length
      ? await db.select().from(matchPlayersTable).where(inArray(matchPlayersTable.matchId, matchIds))
      : [];

    const playerMap: Record<number, { name: string; nickname: string | null; elo: number }> = {};
    const clubPlayerIds = new Set<number>();
    for (const p of players) {
      playerMap[p.id] = { name: p.name, nickname: p.nickname ?? null, elo: p.elo };
      clubPlayerIds.add(p.id);
    }

    const mpByMatchId: Record<number, typeof matchPlayersTable.$inferSelect[]> = {};
    for (const mp of allMatchPlayers) {
      if (!mpByMatchId[mp.matchId]) mpByMatchId[mp.matchId] = [];
      mpByMatchId[mp.matchId].push(mp);
    }

    const accumMap: Record<string, ParejaKey & ParejaAccum> = {};

    function getAccum(p: ParejaKey): ParejaKey & ParejaAccum {
      const k = pairKey(p);
      if (!accumMap[k]) {
        accumMap[k] = { ...p, wins: 0, losses: 0, draws: 0, scoreWon: 0, scoreLost: 0, gamesWon: 0, gamesLost: 0 };
      }
      return accumMap[k];
    }

    for (const m of matches) {
      if (m.status !== "confirmed" || !["team1", "team2", "draw"].includes(m.result)) continue;

      const matchPlayers = mpByMatchId[m.id] ?? [];
      const team1Mps = matchPlayers.filter((mp) => mp.team === "team1");
      const team2Mps = matchPlayers.filter((mp) => mp.team === "team2");

      // A pair is official only when the complete 2v2 match belongs to this club.
      if (team1Mps.length !== 2 || team2Mps.length !== 2) continue;
      if (![...team1Mps, ...team2Mps].every((mp) => clubPlayerIds.has(mp.playerId))) continue;
      if (m.team1Score === 0 && m.team2Score === 0) continue;

      const sets = (m.sets as SetScore[]) ?? [];
      let t1Games = 0, t2Games = 0;
      for (const s of sets) { t1Games += s.team1Games; t2Games += s.team2Games; }

      const t1pair = sortedPair(team1Mps[0].playerId, team1Mps[1].playerId);
      const t2pair = sortedPair(team2Mps[0].playerId, team2Mps[1].playerId);
      const t1acc = getAccum(t1pair);
      const t2acc = getAccum(t2pair);

      if (m.result === "draw") {
        t1acc.draws++; t2acc.draws++;
      } else if (m.result === "team1") {
        t1acc.wins++; t2acc.losses++;
      } else {
        t1acc.losses++; t2acc.wins++;
      }

      t1acc.scoreWon += m.team1Score; t1acc.scoreLost += m.team2Score;
      t2acc.scoreWon += m.team2Score; t2acc.scoreLost += m.team1Score;
      t1acc.gamesWon += t1Games; t1acc.gamesLost += t2Games;
      t2acc.gamesWon += t2Games; t2acc.gamesLost += t1Games;
    }

    const result = Object.values(accumMap).map((a) => {
      const totalMatches = a.wins + a.losses + a.draws;
      const p1 = playerMap[a.p1];
      const p2 = playerMap[a.p2];
      const avgElo = p1 && p2 ? Math.round(((p1.elo + p2.elo) / 2) * 10) / 10 : 0;
      return {
        player1Id: a.p1, player1Name: p1?.name ?? "Desconocido", player1Nickname: p1?.nickname ?? null,
        player2Id: a.p2, player2Name: p2?.name ?? "Desconocido", player2Nickname: p2?.nickname ?? null,
        totalMatches, wins: a.wins, losses: a.losses, draws: a.draws,
        winRate: totalMatches > 0 ? Math.round((a.wins / totalMatches) * 1000) / 10 : 0,
        scoreWon: a.scoreWon, scoreLost: a.scoreLost,
        gamesWon: a.gamesWon, gamesLost: a.gamesLost,
        gameDiff: a.gamesWon - a.gamesLost,
        avgElo,
      };
    });

    result.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.totalMatches !== a.totalMatches) return b.totalMatches - a.totalMatches;
      return b.gameDiff - a.gameDiff;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/parejas/:player1Id/:player2Id", requireCommunityAccess, async (req, res): Promise<void> => {
  try {
    const p1Raw = parseInt(req.params.player1Id, 10);
    const p2Raw = parseInt(req.params.player2Id, 10);
    if (isNaN(p1Raw) || isNaN(p2Raw)) {
      res.status(400).json({ error: "IDs inválidos" });
      return;
    }

    const clubId = requireTargetClub(req, res);
    if (!clubId) return;

    const pid1 = Math.min(p1Raw, p2Raw);
    const pid2 = Math.max(p1Raw, p2Raw);

    const [players, allMatches] = await Promise.all([
      db.select().from(playersTable).where(eq(playersTable.clubId, clubId)),
      db.select().from(matchesTable).where(eq(matchesTable.clubId, clubId)),
    ]);

    const playerMap: Record<number, { name: string; nickname: string | null; elo: number }> = {};
    const clubPlayerIds = new Set<number>();
    for (const p of players) {
      playerMap[p.id] = { name: p.name, nickname: p.nickname ?? null, elo: p.elo };
      clubPlayerIds.add(p.id);
    }

    const p1Info = playerMap[pid1];
    const p2Info = playerMap[pid2];
    if (!p1Info || !p2Info) {
      res.status(404).json({ error: "Jugadores no encontrados" });
      return;
    }

    const matchIds = allMatches.map((m) => m.id);
    const allMatchPlayers = matchIds.length
      ? await db.select().from(matchPlayersTable).where(inArray(matchPlayersTable.matchId, matchIds))
      : [];
    const mpByMatchId: Record<number, typeof matchPlayersTable.$inferSelect[]> = {};
    for (const mp of allMatchPlayers) {
      if (!mpByMatchId[mp.matchId]) mpByMatchId[mp.matchId] = [];
      mpByMatchId[mp.matchId].push(mp);
    }

    const pairMatches = allMatches.filter((m) => {
      if (m.status !== "confirmed" || !["team1", "team2", "draw"].includes(m.result)) return false;
      if (m.team1Score === 0 && m.team2Score === 0) return false;
      const matchPlayers = mpByMatchId[m.id] ?? [];
      const team1Mps = matchPlayers.filter((mp) => mp.team === "team1");
      const team2Mps = matchPlayers.filter((mp) => mp.team === "team2");
      if (team1Mps.length !== 2 || team2Mps.length !== 2) return false;
      if (![...team1Mps, ...team2Mps].every((mp) => clubPlayerIds.has(mp.playerId))) return false;
      const team1Ids = team1Mps.map((mp) => mp.playerId);
      const team2Ids = team2Mps.map((mp) => mp.playerId);
      return (team1Ids.includes(pid1) && team1Ids.includes(pid2)) ||
             (team2Ids.includes(pid1) && team2Ids.includes(pid2));
    });

    if (pairMatches.length === 0) {
      res.status(404).json({ error: "Esta pareja no tiene partidos registrados" });
      return;
    }

    let wins = 0, losses = 0, draws = 0, setsWon = 0, setsLost = 0, gamesWon = 0, gamesLost = 0;
    for (const m of pairMatches) {
      const matchPlayers = mpByMatchId[m.id] ?? [];
      const team1Ids = matchPlayers.filter((mp) => mp.team === "team1").map((mp) => mp.playerId);
      const isPairTeam1 = team1Ids.includes(pid1) && team1Ids.includes(pid2);

      if (m.result === "draw") draws++;
      else if (isPairTeam1 ? m.result === "team1" : m.result === "team2") wins++;
      else losses++;

      setsWon += isPairTeam1 ? m.team1Score : m.team2Score;
      setsLost += isPairTeam1 ? m.team2Score : m.team1Score;

      const sets = (m.sets as SetScore[]) ?? [];
      let t1G = 0, t2G = 0;
      for (const s of sets) { t1G += s.team1Games; t2G += s.team2Games; }
      gamesWon += isPairTeam1 ? t1G : t2G;
      gamesLost += isPairTeam1 ? t2G : t1G;
    }

    const totalMatches = wins + losses + draws;
    const avgElo = Math.round(((p1Info.elo + p2Info.elo) / 2) * 10) / 10;
    const stats = {
      player1Id: pid1, player1Name: p1Info.name, player1Nickname: p1Info.nickname,
      player2Id: pid2, player2Name: p2Info.name, player2Nickname: p2Info.nickname,
      totalMatches, wins, losses, draws,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 10 : 0,
      setsWon, setsLost, gamesWon, gamesLost, gameDiff: gamesWon - gamesLost, avgElo,
    };

    const enriched = await Promise.all(
      pairMatches
        .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
        .map(async (m) => {
          const history = await db.select().from(eloHistoryTable).where(eq(eloHistoryTable.matchId, m.id));
          const matchPlayers = mpByMatchId[m.id] ?? [];
          const team1Players = matchPlayers
            .filter((mp) => mp.team === "team1")
            .map((mp) => ({ id: mp.playerId, name: playerMap[mp.playerId]?.name ?? "Desconocido" }));
          const team2Players = matchPlayers
            .filter((mp) => mp.team === "team2")
            .map((mp) => ({ id: mp.playerId, name: playerMap[mp.playerId]?.name ?? "Desconocido" }));
          const eloChanges = history
            .filter((h) => clubPlayerIds.has(h.playerId))
            .map((h) => ({
              playerId: h.playerId,
              playerName: playerMap[h.playerId]?.name ?? "Desconocido",
              eloBefore: h.eloBefore,
              eloAfter: h.eloAfter,
              eloChange: h.eloChange,
            }));
          return {
            id: m.id,
            team1Players,
            team2Players,
            team1Score: m.team1Score,
            team2Score: m.team2Score,
            result: m.result,
            sets: m.sets as SetScore[],
            playedAt: m.playedAt.toISOString(),
            createdAt: m.createdAt.toISOString(),
            eloChanges,
          };
        })
    );

    res.json({ stats, matches: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
