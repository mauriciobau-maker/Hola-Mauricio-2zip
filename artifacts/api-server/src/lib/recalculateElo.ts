import { asc, eq, sql } from "drizzle-orm";
import {
  db,
  eloHistoryTable,
  matchPlayersTable,
  matchesTable,
  playerSportRatingsTable,
} from "@workspace/db";
import { calculateMatchEloChanges, STARTING_ELO } from "../elo";

export async function recalculateSportElo(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(778899)`);
    await tx
      .update(playerSportRatingsTable)
      .set({ elo: STARTING_ELO, updatedAt: new Date() });
    await tx.delete(eloHistoryTable);

    const matches = await tx
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.status, "confirmed"))
      .orderBy(asc(matchesTable.playedAt));
    const ratings = await tx.select().from(playerSportRatingsTable);
    const ratingMap = new Map<string, number>(
      ratings.map((rating) => [`${rating.playerId}:${rating.sportId}`, rating.elo]),
    );

    for (const match of matches) {
      if (!["team1", "team2", "draw"].includes(match.result)) continue;
      if (match.team1Score === 0 && match.team2Score === 0) continue;

      const participants = await tx
        .select()
        .from(matchPlayersTable)
        .where(eq(matchPlayersTable.matchId, match.id));
      const team1 = participants
        .filter((player) => player.team === "team1")
        .map((player) => ({
          id: player.playerId,
          elo: ratingMap.get(`${player.playerId}:${match.sportId}`) ?? STARTING_ELO,
        }));
      const team2 = participants
        .filter((player) => player.team === "team2")
        .map((player) => ({
          id: player.playerId,
          elo: ratingMap.get(`${player.playerId}:${match.sportId}`) ?? STARTING_ELO,
        }));
      if (team1.length === 0 || team2.length === 0) continue;

      const changes = calculateMatchEloChanges(
        team1,
        team2,
        match.result === "team1",
        match.result === "draw",
      );
      await tx.insert(eloHistoryTable).values(
        changes.map((change) => ({
          playerId: change.playerId,
          matchId: match.id,
          sportId: match.sportId,
          eloBefore: change.eloBefore,
          eloAfter: change.eloAfter,
          eloChange: change.eloChange,
        })),
      );

      for (const change of changes) {
        ratingMap.set(`${change.playerId}:${match.sportId}`, change.eloAfter);
        await tx
          .insert(playerSportRatingsTable)
          .values({
            playerId: change.playerId,
            sportId: match.sportId,
            elo: change.eloAfter,
          })
          .onConflictDoUpdate({
            target: [playerSportRatingsTable.playerId, playerSportRatingsTable.sportId],
            set: { elo: change.eloAfter, updatedAt: new Date() },
          });
      }
    }
  });
}