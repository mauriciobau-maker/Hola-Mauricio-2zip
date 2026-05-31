import { Router, type IRouter } from "express";
import { db, matchesTable, playersTable } from "@workspace/db";

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

export default router;
