import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, matchesTable, playersTable, eloHistoryTable } from "@workspace/db";

const router: IRouter = Router();

type SetScore = { setNumber: number; team1Games: number; team2Games: number };

interface PairejaKey {
  p1: number;
  p2: number;
}

interface PairejaAccum {
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}

function sortedPair(a: number, b: number): PairejaKey {
  return a < b ? { p1: a, p2: b } : { p1: b, p2: a };
}

function pairKey(p: PairejaKey): string {
  return `${p.p1}_${p.p2}`;
}

router.get("/parejas", async (_req, res): Promise<void> => {
  const [matches, players] = await Promise.all([
    db.select().from(matchesTable),
    db.select().from(playersTable),
  ]);

  const playerMap: Record<number, { name: string; nickname: string | null; elo: number }> = {};
  for (const p of players) {
    playerMap[p.id] = { name: p.name, nickname: p.nickname ?? null, elo: p.elo };
  }

  const accumMap: Record<string, PairejaKey & PairejaAccum> = {};

  function getAccum(p: PairejaKey): PairejaKey & PairejaAccum {
    const k = pairKey(p);
    if (!accumMap[k]) {
      accumMap[k] = { ...p, wins: 0, losses: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 };
    }
    return accumMap[k];
  }

  for (const m of matches) {
    const sets = (m.sets as SetScore[]) ?? [];

    let t1Games = 0;
    let t2Games = 0;
    for (const s of sets) {
      t1Games += s.team1Games;
      t2Games += s.team2Games;
    }

    const team1Won = m.team1SetsWon > m.team2SetsWon;

    const t1pair = sortedPair(m.team1Player1Id, m.team1Player2Id);
    const t2pair = sortedPair(m.team2Player1Id, m.team2Player2Id);

    const t1acc = getAccum(t1pair);
    const t2acc = getAccum(t2pair);

    if (team1Won) {
      t1acc.wins++;
      t2acc.losses++;
    } else {
      t1acc.losses++;
      t2acc.wins++;
    }

    t1acc.setsWon += m.team1SetsWon;
    t1acc.setsLost += m.team2SetsWon;
    t1acc.gamesWon += t1Games;
    t1acc.gamesLost += t2Games;

    t2acc.setsWon += m.team2SetsWon;
    t2acc.setsLost += m.team1SetsWon;
    t2acc.gamesWon += t2Games;
    t2acc.gamesLost += t1Games;
  }

  const result = Object.values(accumMap).map((a) => {
    const totalMatches = a.wins + a.losses;
    const p1 = playerMap[a.p1];
    const p2 = playerMap[a.p2];
    const avgElo = p1 && p2 ? Math.round(((p1.elo + p2.elo) / 2) * 10) / 10 : 0;

    return {
      player1Id: a.p1,
      player1Name: p1?.name ?? "Desconocido",
      player1Nickname: p1?.nickname ?? null,
      player2Id: a.p2,
      player2Name: p2?.name ?? "Desconocido",
      player2Nickname: p2?.nickname ?? null,
      totalMatches,
      wins: a.wins,
      losses: a.losses,
      winRate: totalMatches > 0 ? Math.round((a.wins / totalMatches) * 1000) / 10 : 0,
      setsWon: a.setsWon,
      setsLost: a.setsLost,
      gamesWon: a.gamesWon,
      gamesLost: a.gamesLost,
      gameDiff: a.gamesWon - a.gamesLost,
      avgElo,
    };
  });

  // Sort: by winRate desc, then by totalMatches desc, then by gameDiff desc
  result.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.totalMatches !== a.totalMatches) return b.totalMatches - a.totalMatches;
    return b.gameDiff - a.gameDiff;
  });

  res.json(result);
});

router.get("/parejas/:player1Id/:player2Id", async (req, res): Promise<void> => {
  const p1Raw = parseInt(req.params.player1Id, 10);
  const p2Raw = parseInt(req.params.player2Id, 10);
  if (isNaN(p1Raw) || isNaN(p2Raw)) {
    res.status(400).json({ error: "IDs inválidos" });
    return;
  }
  // Normalize pair order
  const pid1 = Math.min(p1Raw, p2Raw);
  const pid2 = Math.max(p1Raw, p2Raw);

  const [players, allMatches] = await Promise.all([
    db.select().from(playersTable),
    db.select().from(matchesTable),
  ]);

  const playerMap: Record<number, { name: string; nickname: string | null; elo: number }> = {};
  for (const p of players) playerMap[p.id] = { name: p.name, nickname: p.nickname ?? null, elo: p.elo };

  const p1Info = playerMap[pid1];
  const p2Info = playerMap[pid2];
  if (!p1Info || !p2Info) {
    res.status(404).json({ error: "Jugadores no encontrados" });
    return;
  }

  // Filter matches where this pair played together on the same team
  const pairMatches = allMatches.filter((m) => {
    const t1Ids = [m.team1Player1Id, m.team1Player2Id].sort((a, b) => a - b);
    const t2Ids = [m.team2Player1Id, m.team2Player2Id].sort((a, b) => a - b);
    return (
      (t1Ids[0] === pid1 && t1Ids[1] === pid2) ||
      (t2Ids[0] === pid1 && t2Ids[1] === pid2)
    );
  });

  if (pairMatches.length === 0) {
    res.status(404).json({ error: "Esta pareja no tiene partidos registrados" });
    return;
  }

  // Compute stats
  let wins = 0, losses = 0, setsWon = 0, setsLost = 0, gamesWon = 0, gamesLost = 0;
  for (const m of pairMatches) {
    const sets = (m.sets as SetScore[]) ?? [];
    const t1Ids = [m.team1Player1Id, m.team1Player2Id].sort((a, b) => a - b);
    const isPairTeam1 = t1Ids[0] === pid1 && t1Ids[1] === pid2;
    const team1Won = m.team1SetsWon > m.team2SetsWon;
    const pairWon = isPairTeam1 ? team1Won : !team1Won;

    if (pairWon) wins++; else losses++;
    setsWon += isPairTeam1 ? m.team1SetsWon : m.team2SetsWon;
    setsLost += isPairTeam1 ? m.team2SetsWon : m.team1SetsWon;

    let t1G = 0, t2G = 0;
    for (const s of sets) { t1G += s.team1Games; t2G += s.team2Games; }
    gamesWon += isPairTeam1 ? t1G : t2G;
    gamesLost += isPairTeam1 ? t2G : t1G;
  }

  const totalMatches = wins + losses;
  const avgElo = Math.round(((p1Info.elo + p2Info.elo) / 2) * 10) / 10;
  const stats = {
    player1Id: pid1, player1Name: p1Info.name, player1Nickname: p1Info.nickname,
    player2Id: pid2, player2Name: p2Info.name, player2Nickname: p2Info.nickname,
    totalMatches, wins, losses,
    winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 10 : 0,
    setsWon, setsLost, gamesWon, gamesLost, gameDiff: gamesWon - gamesLost, avgElo,
  };

  // Enrich matches with player names and elo changes
  const enriched = await Promise.all(
    pairMatches
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .map(async (m) => {
        const history = await db.select().from(eloHistoryTable).where(eq(eloHistoryTable.matchId, m.id));
        const eloChanges = history.map((h) => ({
          playerId: h.playerId,
          playerName: playerMap[h.playerId]?.name ?? "Desconocido",
          eloBefore: h.eloBefore,
          eloAfter: h.eloAfter,
          eloChange: h.eloChange,
        }));
        return {
          id: m.id,
          team1Player1Id: m.team1Player1Id, team1Player2Id: m.team1Player2Id,
          team2Player1Id: m.team2Player1Id, team2Player2Id: m.team2Player2Id,
          team1SetsWon: m.team1SetsWon, team2SetsWon: m.team2SetsWon,
          sets: m.sets as SetScore[],
          playedAt: m.playedAt.toISOString(),
          createdAt: m.createdAt.toISOString(),
          team1Player1Name: playerMap[m.team1Player1Id]?.name ?? null,
          team1Player2Name: playerMap[m.team1Player2Id]?.name ?? null,
          team2Player1Name: playerMap[m.team2Player1Id]?.name ?? null,
          team2Player2Name: playerMap[m.team2Player2Id]?.name ?? null,
          eloChanges,
        };
      })
  );

  res.json({ stats, matches: enriched });
});

export default router;
