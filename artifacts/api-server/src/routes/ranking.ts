import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  clubSportsTable,
  matchPlayersTable,
  matchesTable,
  playerSportRatingsTable,
  playersTable,
  sportsTable,
} from "@workspace/db";
import { resolveEffectiveClubId } from "../middlewares/requireCommunity";

const router: IRouter = Router();

async function getSelectedSportId(rawSportId: unknown, clubId: number | null): Promise<number | null> {
  if (rawSportId !== undefined) {
    const sportId = Number(rawSportId);
    return Number.isInteger(sportId) && sportId > 0 ? sportId : null;
  }

  if (clubId) {
    const [clubSport] = await db
      .select({ sportId: sportsTable.id })
      .from(clubSportsTable)
      .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
      .where(and(eq(clubSportsTable.clubId, clubId), eq(clubSportsTable.active, true), eq(sportsTable.active, true)))
      .orderBy(clubSportsTable.id)
      .limit(1);

    if (clubSport?.sportId) {
      return clubSport.sportId;
    }
  }

  const [sport] = await db
    .select({ id: sportsTable.id })
    .from(sportsTable)
    .where(eq(sportsTable.active, true))
    .orderBy(sportsTable.id)
    .limit(1);

  return sport?.id ?? null;
}

function groupMatchPlayers(rows: typeof matchPlayersTable.$inferSelect[]) {
  const grouped: Record<number, typeof rows> = {};
  for (const row of rows) {
    (grouped[row.matchId] ??= []).push(row);
  }
  return grouped;
}

function getEloCategory(elo: number) {
  if (elo >= 1800) return { name: "1ª Cat", badge: "1ª Categoría", tier: "Master" };
  if (elo >= 1650) return { name: "2ª Cat", badge: "2ª Categoría", tier: "Avanzado Pro" };
  if (elo >= 1520) return { name: "3ª Cat", badge: "3ª Categoría", tier: "Avanzado" };
  if (elo >= 1400) return { name: "4ª Cat", badge: "4ª Categoría", tier: "Intermedio" };
  if (elo >= 1250) return { name: "5ª Cat", badge: "5ª Categoría", tier: "Iniciación" };
  return { name: "6ª Cat", badge: "6ª Categoría", tier: "Principiante" };
}

router.get("/ranking", async (req, res): Promise<void> => {
  const clubId = await resolveEffectiveClubId(req);
  if (!clubId) {
    res.json([]);
    return;
  }

  const sportId = await getSelectedSportId(req.query.sportId, clubId);
  if (!sportId) {
    res.status(400).json({ error: "sportId inválido" });
    return;
  }

  const [players, matches] = await Promise.all([
    db.select().from(playersTable).where(eq(playersTable.clubId, clubId)),
    db
      .select()
      .from(matchesTable)
      .where(and(eq(matchesTable.clubId, clubId), eq(matchesTable.sportId, sportId)))
      .orderBy(matchesTable.playedAt),
  ]);
  const matchIds = matches.map((match) => match.id);
  const participants = matchIds.length
    ? await db.select().from(matchPlayersTable).where(inArray(matchPlayersTable.matchId, matchIds))
    : [];
  const ratings = await db
    .select()
    .from(playerSportRatingsTable)
    .where(
      and(
        eq(playerSportRatingsTable.sportId, sportId),
        inArray(playerSportRatingsTable.playerId, players.map((player) => player.id)),
      ),
    );
  const ratingMap = new Map(ratings.map((rating) => [rating.playerId, rating.elo]));
  const grouped = groupMatchPlayers(participants);
  const stats = new Map(players.map((player) => [
    player.id,
    {
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      history: [] as ("V" | "D" | "E")[],
    },
  ]));

  for (const match of matches) {
    if (match.status !== "confirmed") continue;

    let effectiveResult = match.result;
    if (!["team1", "team2", "draw"].includes(effectiveResult)) {
      const t1 = Number(match.team1Score ?? 0);
      const t2 = Number(match.team2Score ?? 0);
      if (t1 > t2) effectiveResult = "team1";
      else if (t2 > t1) effectiveResult = "team2";
      else effectiveResult = "draw";
    }

    const rows = grouped[match.id] ?? [];
    const team1 = rows.filter((row) => row.team === "team1").map((row) => row.playerId);
    const team2 = rows.filter((row) => row.team === "team2").map((row) => row.playerId);
    const isRivalMatch = match.matchType === "rival" || Boolean(match.rivalTeamName);

    // Debe haber al menos jugadores en team1; team2 puede estar vacío en partidos con rival externo
    if (!team1.length || (!team2.length && !isRivalMatch)) continue;

    const t1Goals = Number(match.team1Score ?? 0);
    const t2Goals = Number(match.team2Score ?? 0);

    let t1Sets = 0;
    let t2Sets = 0;
    let t1Games = 0;
    let t2Games = 0;

    if (Array.isArray(match.sets) && match.sets.length > 0) {
      for (const s of match.sets as any[]) {
        const s1 = Number(s.team1Score ?? s.team1 ?? 0);
        const s2 = Number(s.team2Score ?? s.team2 ?? 0);
        t1Games += s1;
        t2Games += s2;
        if (s1 > s2) t1Sets++;
        else if (s2 > s1) t2Sets++;
      }
    } else {
      t1Sets = t1Goals;
      t2Sets = t2Goals;
      t1Games = t1Goals * 6;
      t2Games = t2Goals * 6;
    }

    if (isRivalMatch) {
      if (effectiveResult === "draw") {
        for (const playerId of team1) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.draws++;
            playerStats.points += 1;
            playerStats.goalsFor += t1Goals;
            playerStats.goalsAgainst += t2Goals;
            playerStats.setsWon += t1Sets;
            playerStats.setsLost += t2Sets;
            playerStats.gamesWon += t1Games;
            playerStats.gamesLost += t2Games;
            playerStats.history.push("E");
          }
        }
      } else if (effectiveResult === "team1") {
        for (const playerId of team1) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.wins++;
            playerStats.points += 3;
            playerStats.goalsFor += t1Goals;
            playerStats.goalsAgainst += t2Goals;
            playerStats.setsWon += t1Sets;
            playerStats.setsLost += t2Sets;
            playerStats.gamesWon += t1Games;
            playerStats.gamesLost += t2Games;
            playerStats.history.push("V");
          }
        }
      } else {
        for (const playerId of team1) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.losses++;
            playerStats.goalsFor += t1Goals;
            playerStats.goalsAgainst += t2Goals;
            playerStats.setsWon += t1Sets;
            playerStats.setsLost += t2Sets;
            playerStats.gamesWon += t1Games;
            playerStats.gamesLost += t2Games;
            playerStats.history.push("D");
          }
        }
      }
    } else {
      if (effectiveResult === "draw") {
        for (const playerId of team1) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.draws++;
            playerStats.points += 1;
            playerStats.goalsFor += t1Goals;
            playerStats.goalsAgainst += t2Goals;
            playerStats.setsWon += t1Sets;
            playerStats.setsLost += t2Sets;
            playerStats.gamesWon += t1Games;
            playerStats.gamesLost += t2Games;
            playerStats.history.push("E");
          }
        }
        for (const playerId of team2) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.draws++;
            playerStats.points += 1;
            playerStats.goalsFor += t2Goals;
            playerStats.goalsAgainst += t1Goals;
            playerStats.setsWon += t2Sets;
            playerStats.setsLost += t1Sets;
            playerStats.gamesWon += t2Games;
            playerStats.gamesLost += t1Games;
            playerStats.history.push("E");
          }
        }
      } else {
        const winners = effectiveResult === "team1" ? team1 : team2;
        const losers = effectiveResult === "team1" ? team2 : team1;
        const winnerGoals = effectiveResult === "team1" ? t1Goals : t2Goals;
        const loserGoals = effectiveResult === "team1" ? t2Goals : t1Goals;
        const winnerSets = effectiveResult === "team1" ? t1Sets : t2Sets;
        const loserSets = effectiveResult === "team1" ? t2Sets : t1Sets;
        const winnerGames = effectiveResult === "team1" ? t1Games : t2Games;
        const loserGames = effectiveResult === "team1" ? t2Games : t1Games;

        for (const playerId of winners) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.wins++;
            playerStats.points += 3;
            playerStats.goalsFor += winnerGoals;
            playerStats.goalsAgainst += loserGoals;
            playerStats.setsWon += winnerSets;
            playerStats.setsLost += loserSets;
            playerStats.gamesWon += winnerGames;
            playerStats.gamesLost += loserGames;
            playerStats.history.push("V");
          }
        }
        for (const playerId of losers) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.losses++;
            playerStats.goalsFor += loserGoals;
            playerStats.goalsAgainst += winnerGoals;
            playerStats.setsWon += loserSets;
            playerStats.setsLost += winnerSets;
            playerStats.gamesWon += loserGames;
            playerStats.gamesLost += winnerGames;
            playerStats.history.push("D");
          }
        }
      }
    }
  }

  const [sportRecord] = await db
    .select({ id: sportsTable.id, name: sportsTable.name, slug: sportsTable.slug })
    .from(sportsTable)
    .where(eq(sportsTable.id, sportId))
    .limit(1);

  const isFootball = sportRecord?.slug === "futbol" || (sportRecord?.name?.toLowerCase().includes("fútbol") ?? false);

  const ranking = players
    .map((player) => {
      const playerStats = stats.get(player.id)!;
      const elo = ratingMap.get(player.id) ?? player.elo ?? 1500;
      const totalMatches = playerStats.wins + playerStats.losses + playerStats.draws;
      const goalDiff = playerStats.goalsFor - playerStats.goalsAgainst;
      const gamesDiff = playerStats.gamesWon - playerStats.gamesLost;

      // Calcular racha
      let streak = "-";
      if (playerStats.history.length > 0) {
        const last = playerStats.history[playerStats.history.length - 1];
        let count = 0;
        for (let i = playerStats.history.length - 1; i >= 0; i--) {
          if (playerStats.history[i] === last) count++;
          else break;
        }
        streak = last === "V" ? `🔥 ${count}V` : last === "D" ? `${count}D` : `${count}E`;
      }

      const catInfo = getEloCategory(elo);

      return {
        playerId: player.id,
        playerName: player.name,
        nickname: player.nickname ?? null,
        sportId,
        sportSlug: sportRecord?.slug ?? "padel",
        sportName: sportRecord?.name ?? "Pádel",
        isFootball,
        elo: isFootball ? playerStats.points : elo,
        points: playerStats.points,
        wins: playerStats.wins,
        losses: playerStats.losses,
        draws: playerStats.draws,
        goalsFor: playerStats.goalsFor,
        goalsAgainst: playerStats.goalsAgainst,
        goalDiff,
        setsWon: playerStats.setsWon,
        setsLost: playerStats.setsLost,
        gamesWon: playerStats.gamesWon,
        gamesLost: playerStats.gamesLost,
        gamesDiff,
        streak,
        category: catInfo.name,
        categoryTier: catInfo.tier,
        categoryBadge: catInfo.badge,
        totalMatches,
        winRate: totalMatches ? Math.round((playerStats.wins / totalMatches) * 100) : 0,
      };
    })
    .sort((a, b) => {
      if (isFootball) {
        return (
          b.points - a.points ||
          b.goalDiff - a.goalDiff ||
          b.goalsFor - a.goalsFor ||
          b.wins - a.wins ||
          b.draws - a.draws ||
          a.losses - b.losses
        );
      }
      return (
        b.elo - a.elo ||
        b.wins - a.wins ||
        a.losses - b.losses ||
        b.setsWon - a.setsWon ||
        b.gamesDiff - a.gamesDiff
      );
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  res.json(ranking);
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const clubId = await resolveEffectiveClubId(req);
  if (!clubId) {
    res.json({
      totalPlayers: 0,
      totalMatches: 0,
      topPlayer: null,
      recentMatches: [],
    });
    return;
  }

  const sportId = await getSelectedSportId(req.query.sportId, clubId);
  if (!sportId) {
    res.status(400).json({ error: "sportId inválido" });
    return;
  }

  const [players, matches] = await Promise.all([
    db.select().from(playersTable).where(eq(playersTable.clubId, clubId)),
    db
      .select()
      .from(matchesTable)
      .where(and(eq(matchesTable.clubId, clubId), eq(matchesTable.sportId, sportId)))
      .orderBy(desc(matchesTable.playedAt)),
  ]);
  const matchIds = matches.map((match) => match.id);
  const participants = matchIds.length
    ? await db.select().from(matchPlayersTable).where(inArray(matchPlayersTable.matchId, matchIds))
    : [];
  const ratings = await db
    .select()
    .from(playerSportRatingsTable)
    .where(
      and(
        eq(playerSportRatingsTable.sportId, sportId),
        inArray(playerSportRatingsTable.playerId, players.map((player) => player.id)),
      ),
    );
  const ratingMap = new Map(ratings.map((rating) => [rating.playerId, rating.elo]));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const grouped = groupMatchPlayers(participants);
  const confirmed = matches.filter(
    (match) =>
      match.status === "confirmed" &&
      ["team1", "team2", "draw"].includes(match.result),
  );
  const [sportRecord] = await db
    .select({ id: sportsTable.id, name: sportsTable.name, slug: sportsTable.slug })
    .from(sportsTable)
    .where(eq(sportsTable.id, sportId))
    .limit(1);

  const isFootball = sportRecord?.slug === "futbol" || sportRecord?.name?.toLowerCase().includes("fútbol");

  const playerStats = new Map(players.map((p) => [p.id, { wins: 0, losses: 0, draws: 0, points: 0, goalsFor: 0, goalsAgainst: 0 }]));
  for (const m of confirmed) {
    let effResult = m.result;
    if (!["team1", "team2", "draw"].includes(effResult)) {
      const t1 = Number(m.team1Score ?? 0);
      const t2 = Number(m.team2Score ?? 0);
      if (t1 > t2) effResult = "team1";
      else if (t2 > t1) effResult = "team2";
      else effResult = "draw";
    }
    const rows = grouped[m.id] ?? [];
    const team1 = rows.filter((r) => r.team === "team1").map((r) => r.playerId);
    const team2 = rows.filter((r) => r.team === "team2").map((r) => r.playerId);
    const isRivalMatch = m.matchType === "rival" || Boolean(m.rivalTeamName);

    if (!team1.length || (!team2.length && !isRivalMatch)) continue;

    const t1Goals = Number(m.team1Score ?? 0);
    const t2Goals = Number(m.team2Score ?? 0);

    if (isRivalMatch) {
      if (effResult === "draw") {
        for (const pid of team1) {
          const ps = playerStats.get(pid);
          if (ps) { ps.draws++; ps.points += 1; ps.goalsFor += t1Goals; ps.goalsAgainst += t2Goals; }
        }
      } else if (effResult === "team1") {
        for (const pid of team1) {
          const ps = playerStats.get(pid);
          if (ps) { ps.wins++; ps.points += 3; ps.goalsFor += t1Goals; ps.goalsAgainst += t2Goals; }
        }
      } else {
        for (const pid of team1) {
          const ps = playerStats.get(pid);
          if (ps) { ps.losses++; ps.goalsFor += t1Goals; ps.goalsAgainst += t2Goals; }
        }
      }
    } else {
      if (effResult === "draw") {
        for (const pid of [...team1, ...team2]) {
          const ps = playerStats.get(pid);
          if (ps) { ps.draws++; ps.points += 1; }
        }
      } else {
        const winners = effResult === "team1" ? team1 : team2;
        const losers = effResult === "team1" ? team2 : team1;
        for (const pid of winners) {
          const ps = playerStats.get(pid);
          if (ps) { ps.wins++; ps.points += 3; }
        }
        for (const pid of losers) {
          const ps = playerStats.get(pid);
          if (ps) ps.losses++;
        }
      }
    }
  }

  let topPlayer: any = null;
  if (isFootball) {
    const sorted = [...players]
      .map((p) => {
        const st = playerStats.get(p.id);
        const gf = st?.goalsFor ?? 0;
        const ga = st?.goalsAgainst ?? 0;
        return {
          id: p.id,
          name: p.name,
          points: st?.points ?? 0,
          wins: st?.wins ?? 0,
          draws: st?.draws ?? 0,
          losses: st?.losses ?? 0,
          goalsFor: gf,
          goalsAgainst: ga,
          goalDiff: gf - ga,
          isFootball: true,
        };
      })
      .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || b.wins - a.wins);
    if (sorted[0]) {
      topPlayer = sorted[0];
    }
  } else {
    const top = [...players]
      .map((player) => ({ id: player.id, name: player.name, elo: ratingMap.get(player.id) ?? 1500, isFootball: false }))
      .sort((a, b) => b.elo - a.elo)[0];
    topPlayer = top && top.elo > 1500 ? top : (top || null);
  }

  const recentMatches = confirmed.slice(0, 5).map((match) => {
    const rows = grouped[match.id] ?? [];
    const toPlayer = (row: typeof rows[number]) => ({
      id: row.playerId,
      name: playersById.get(row.playerId)?.name ?? "Desconocido",
    });
    return {
      id: match.id,
      matchType: match.matchType,
      rivalTeamName: match.rivalTeamName,
      team1Players: rows.filter((row) => row.team === "team1").map(toPlayer),
      team2Players: rows.filter((row) => row.team === "team2").map(toPlayer),
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      result: match.result,
      sets: match.sets,
      playedAt: match.playedAt.toISOString(),
      createdAt: match.createdAt.toISOString(),
    };
  });

  res.json({
    totalPlayers: players.length,
    totalMatches: confirmed.length,
    topPlayer,
    recentMatches,
    isFootball,
  });
});

export default router;





































































