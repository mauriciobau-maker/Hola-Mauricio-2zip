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
import {
  getCurrentClubId,
  requireCommunityAccess,
} from "../middlewares/requireCommunity";

const router: IRouter = Router();

async function getSelectedSportId(rawSportId: unknown, clubId: number): Promise<number | null> {
  if (rawSportId !== undefined) {
    const sportId = Number(rawSportId);
    if (!Number.isInteger(sportId) || sportId <= 0) return null;

    const [selectedSport] = await db
      .select({ id: sportsTable.id })
      .from(clubSportsTable)
      .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
      .where(
        and(
          eq(clubSportsTable.clubId, clubId),
          eq(clubSportsTable.active, true),
          eq(sportsTable.id, sportId),
          eq(sportsTable.active, true),
        ),
      )
      .limit(1);

    return selectedSport?.id ?? null;
  }

  const [sport] = await db
    .select({ id: sportsTable.id })
    .from(clubSportsTable)
    .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
    .where(
      and(
        eq(clubSportsTable.clubId, clubId),
        eq(clubSportsTable.active, true),
        eq(sportsTable.active, true),
      ),
    )
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

function requireTargetClub(req: Parameters<typeof getCurrentClubId>[0], res: any): number | null {
  const clubId = getCurrentClubId(req);
  if (!clubId) {
    res.status(400).json({
      error: "Los Super Admin deben indicar clubId para consultar este panel",
    });
    return null;
  }
  return clubId;
}

router.get("/ranking", requireCommunityAccess, async (req, res): Promise<void> => {
  const clubId = requireTargetClub(req, res);
  if (!clubId) return;

  const sportId = await getSelectedSportId(req.query.sportId, clubId);
  if (!sportId) {
    res.status(400).json({ error: "El deporte seleccionado no está activo en el club actual" });
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
  const ratings = players.length
    ? await db
        .select()
        .from(playerSportRatingsTable)
        .where(
          and(
            eq(playerSportRatingsTable.sportId, sportId),
            inArray(playerSportRatingsTable.playerId, players.map((player) => player.id)),
          ),
        )
    : [];

  const ratingMap = new Map(ratings.map((rating) => [rating.playerId, rating.elo]));
  const grouped = groupMatchPlayers(participants);
  const stats = new Map(players.map((player) => [
    player.id,
    { wins: 0, losses: 0, draws: 0, points: 0 },
  ]));

  for (const match of matches) {
    if (
      match.status !== "confirmed" ||
      !["team1", "team2", "draw"].includes(match.result)
    ) continue;

    const rows = grouped[match.id] ?? [];
    const team1 = rows.filter((row) => row.team === "team1").map((row) => row.playerId);
    const team2 = rows.filter((row) => row.team === "team2").map((row) => row.playerId);
    if (!team1.length || !team2.length) continue;

    if (match.result === "draw") {
      for (const playerId of [...team1, ...team2]) {
        const playerStats = stats.get(playerId);
        if (playerStats) {
          playerStats.draws++;
          playerStats.points++;
        }
      }
    } else {
      const winners = match.result === "team1" ? team1 : team2;
      const losers = match.result === "team1" ? team2 : team1;
      for (const playerId of winners) {
        const playerStats = stats.get(playerId);
        if (playerStats) {
          playerStats.wins++;
          playerStats.points += 3;
        }
      }
      for (const playerId of losers) {
        const playerStats = stats.get(playerId);
        if (playerStats) playerStats.losses++;
      }
    }
  }

  const ranking = players
    .map((player) => {
      const playerStats = stats.get(player.id)!;
      const elo = ratingMap.get(player.id) ?? 1500;
      const totalMatches = playerStats.wins + playerStats.losses + playerStats.draws;
      return {
        playerId: player.id,
        playerName: player.name,
        nickname: player.nickname ?? null,
        sportId,
        elo,
        points: playerStats.points,
        wins: playerStats.wins,
        losses: playerStats.losses,
        draws: playerStats.draws,
        totalMatches,
        winRate: totalMatches ? Math.round((playerStats.wins / totalMatches) * 100) : 0,
      };
    })
    .sort((a, b) => b.elo - a.elo || b.wins - a.wins || a.losses - b.losses)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  res.json(ranking);
});

router.get("/dashboard", requireCommunityAccess, async (req, res): Promise<void> => {
  const clubId = requireTargetClub(req, res);
  if (!clubId) return;

  const sportId = await getSelectedSportId(req.query.sportId, clubId);
  if (!sportId) {
    res.status(400).json({ error: "El deporte seleccionado no está activo en el club actual" });
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
  const ratings = players.length
    ? await db
        .select()
        .from(playerSportRatingsTable)
        .where(
          and(
            eq(playerSportRatingsTable.sportId, sportId),
            inArray(playerSportRatingsTable.playerId, players.map((player) => player.id)),
          ),
        )
    : [];

  const ratingMap = new Map(ratings.map((rating) => [rating.playerId, rating.elo]));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const grouped = groupMatchPlayers(participants);
  const confirmed = matches.filter(
    (match) =>
      match.status === "confirmed" &&
      ["team1", "team2", "draw"].includes(match.result),
  );
  const top = [...players]
    .map((player) => ({ id: player.id, name: player.name, elo: ratingMap.get(player.id) ?? 1500 }))
    .sort((a, b) => b.elo - a.elo)[0];

  const recentMatches = confirmed.slice(0, 5).map((match) => {
    const rows = grouped[match.id] ?? [];
    const toPlayer = (row: typeof rows[number]) => ({
      id: row.playerId,
      name: playersById.get(row.playerId)?.name ?? "Desconocido",
    });
    return {
      id: match.id,
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
    topPlayer: top && top.elo > 1500 ? top : null,
    recentMatches,
  });
});

export default router;
