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
      .where(and(eq(matchesTable.clubId, clubId), eq(matchesTable.sportId, sportId))),
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
  const stats = new Map(players.map((player) => [
    player.id,
    { wins: 0, losses: 0, draws: 0, points: 0, goalsFor: 0, goalsAgainst: 0 },
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

    if (isRivalMatch) {
      // Partido contra rival externo: team1 es la nómina de nuestro club
      if (effectiveResult === "draw") {
        for (const playerId of team1) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.draws++;
            playerStats.points += 1;
            playerStats.goalsFor += t1Goals;
            playerStats.goalsAgainst += t2Goals;
          }
        }
      } else if (effectiveResult === "team1") {
        // Victoria del club: +3 puntos
        for (const playerId of team1) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.wins++;
            playerStats.points += 3;
            playerStats.goalsFor += t1Goals;
            playerStats.goalsAgainst += t2Goals;
          }
        }
      } else {
        // Derrota del club: 0 puntos
        for (const playerId of team1) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.losses++;
            playerStats.goalsFor += t1Goals;
            playerStats.goalsAgainst += t2Goals;
          }
        }
      }
    } else {
      // Partido interno entre dos escuadras del club
      if (effectiveResult === "draw") {
        for (const playerId of team1) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.draws++;
            playerStats.points += 1;
            playerStats.goalsFor += t1Goals;
            playerStats.goalsAgainst += t2Goals;
          }
        }
        for (const playerId of team2) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.draws++;
            playerStats.points += 1;
            playerStats.goalsFor += t2Goals;
            playerStats.goalsAgainst += t1Goals;
          }
        }
      } else {
        const winners = effectiveResult === "team1" ? team1 : team2;
        const losers = effectiveResult === "team1" ? team2 : team1;
        const winnerGoals = effectiveResult === "team1" ? t1Goals : t2Goals;
        const loserGoals = effectiveResult === "team1" ? t2Goals : t1Goals;

        for (const playerId of winners) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.wins++;
            playerStats.points += 3;
            playerStats.goalsFor += winnerGoals;
            playerStats.goalsAgainst += loserGoals;
          }
        }
        for (const playerId of losers) {
          const playerStats = stats.get(playerId);
          if (playerStats) {
            playerStats.losses++;
            playerStats.goalsFor += loserGoals;
            playerStats.goalsAgainst += winnerGoals;
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
      return b.elo - a.elo || b.wins - a.wins || a.losses - b.losses;
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





































































