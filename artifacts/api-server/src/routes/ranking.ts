import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  matchPlayersTable,
  matchesTable,
  playerSportRatingsTable,
  playersTable,
  sportsTable,
} from "@workspace/db";
import {
  isSuperAdminUser,
  requireCommunityAccess,
} from "../middlewares/requireCommunity";

const router: IRouter = Router();

async function getSelectedSportId(rawSportId: unknown): Promise<number | null> {
  if (rawSportId !== undefined) {
    const sportId = Number(rawSportId);
    return Number.isInteger(sportId) && sportId > 0 ? sportId : null;
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

function getTargetClubId(req: Request): number | null {
  const user = req.user as {
    clubId?: number | null;
    isAdmin?: number | boolean | null;
  };

  if (!isSuperAdminUser(user)) {
    return user.clubId ?? null;
  }

  const requestedClubId = Number(req.query.clubId);
  if (Number.isInteger(requestedClubId) && requestedClubId > 0) {
    return requestedClubId;
  }

  const activeClubId = Number(req.cookies?.padel_tracker_active_club_id);
  return Number.isInteger(activeClubId) && activeClubId > 0 ? activeClubId : null;
}

function requireTargetClub(req: Request, res: any): number | null {
  const clubId = getTargetClubId(req);
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

  const sportId = await getSelectedSportId(req.query.sportId);
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
  const playerStats = new Map<number, { wins: number; losses: number; draws: number; points: number }>();
  for (const player of players) playerStats.set(player.id, { wins: 0, losses: 0, draws: 0, points: 0 });

  const grouped = groupMatchPlayers(participants);
  for (const match of matches) {
    if (match.status !== "confirmed" || !["team1", "team2", "draw"].includes(match.result)) continue;
    const rows = grouped[match.id] ?? [];
    for (const row of rows) {
      const stats = playerStats.get(row.playerId);
      if (!stats) continue;
      if (match.result === "draw") {
        stats.draws += 1;
        stats.points += 1;
      } else if ((match.result === "team1" && row.team === "team1") || (match.result === "team2" && row.team === "team2")) {
        stats.wins += 1;
        stats.points += 3;
      } else {
        stats.losses += 1;
      }
    }
  }

  const ranking = players
    .map((player) => {
      const stats = playerStats.get(player.id) ?? { wins: 0, losses: 0, draws: 0, points: 0 };
      const elo = ratingMap.get(player.id) ?? 1500;
      return {
        playerId: player.id,
        playerName: player.name,
        nickname: player.nickname ?? null,
        sportId,
        elo,
        points: stats.points,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        totalMatches: stats.wins + stats.losses + stats.draws,
        winRate: stats.wins + stats.losses + stats.draws ? Math.round((stats.wins / (stats.wins + stats.losses + stats.draws)) * 100) : 0,
      };
    })
    .sort((a, b) => b.elo - a.elo || b.wins - a.wins || a.losses - b.losses)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  res.json(ranking);
});

router.get("/dashboard", requireCommunityAccess, async (req, res): Promise<void> => {
  const clubId = requireTargetClub(req, res);
  if (!clubId) return;

  const sportId = await getSelectedSportId(req.query.sportId);
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
