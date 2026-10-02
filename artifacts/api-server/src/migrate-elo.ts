/**
 * Rebuilds the complete Elo history from all valid confirmed matches.
 *
 * Rules:
 * - Starting Elo: 1500
 * - Only confirmed matches affect Elo
 * - 0-0 matches are ignored
 * - Only valid results affect Elo
 * - Elo is independent per club
 * - Players are obtained exclusively from matchPlayersTable
 * - Matches are processed chronologically
 * - Existing Elo history is completely rebuilt
 */

import { eq, asc } from "drizzle-orm";
import {
  db,
  matchesTable,
  playersTable,
  eloHistoryTable,
  matchPlayersTable,
} from "@workspace/db";
import {
  calculateMatchEloChanges,
  STARTING_ELO,
} from "./elo";

async function run(): Promise<void> {
  console.log(
    `Resetting all player Elos to ${STARTING_ELO}...`,
  );

  // ------------------------------------------------------------
  // 1. Reset all players
  // ------------------------------------------------------------

  await db
    .update(playersTable)
    .set({
      elo: STARTING_ELO,
    });

  // ------------------------------------------------------------
  // 2. Rebuild Elo history from scratch
  // ------------------------------------------------------------

  await db.delete(eloHistoryTable);

  // ------------------------------------------------------------
  // 3. Load data
  // ------------------------------------------------------------

  const matches = await db
    .select()
    .from(matchesTable)
    .orderBy(asc(matchesTable.playedAt));

  const players = await db
    .select()
    .from(playersTable);

  const allMatchPlayers = await db
    .select()
    .from(matchPlayersTable);

  // ------------------------------------------------------------
  // 4. Elo state by club and player
  //
  // eloByClub[clubId][playerId] = current Elo
  // ------------------------------------------------------------

  const eloByClub: Record<
    number,
    Record<number, number>
  > = {};

  for (const player of players) {
    if (player.clubId == null) {
      continue;
    }

    if (!eloByClub[player.clubId]) {
      eloByClub[player.clubId] = {};
    }

    eloByClub[player.clubId][player.id] =
      STARTING_ELO;
  }

  // ------------------------------------------------------------
  // 5. Group match players by match
  // ------------------------------------------------------------

  const mpByMatchId: Record<
    number,
    typeof matchPlayersTable.$inferSelect[]
  > = {};

  for (const matchPlayer of allMatchPlayers) {
    if (!mpByMatchId[matchPlayer.matchId]) {
      mpByMatchId[matchPlayer.matchId] = [];
    }

    mpByMatchId[matchPlayer.matchId].push(
      matchPlayer,
    );
  }

  console.log(
    `Replaying ${matches.length} match(es)...`,
  );

  let processedMatches = 0;
  let skippedMatches = 0;

  // ------------------------------------------------------------
  // 6. Replay matches chronologically
  // ------------------------------------------------------------

  for (const match of matches) {
    // ----------------------------------------------------------
    // Match must belong to a club
    // ----------------------------------------------------------

    if (match.clubId == null) {
      skippedMatches++;

      console.log(
        `  Match ${match.id}: skipped - no club`,
      );

      continue;
    }

    // ----------------------------------------------------------
    // Only confirmed matches affect Elo
    // ----------------------------------------------------------

    if (match.status !== "confirmed") {
      skippedMatches++;

      console.log(
        `  Match ${match.id}: skipped - status=${match.status}`,
      );

      continue;
    }

    // ----------------------------------------------------------
    // 0-0 is not a valid confirmed result
    // ----------------------------------------------------------

    if (
      match.team1Score === 0 &&
      match.team2Score === 0
    ) {
      skippedMatches++;

      console.log(
        `  Match ${match.id}: skipped - 0-0`,
      );

      continue;
    }

    // ----------------------------------------------------------
    // Validate result
    // ----------------------------------------------------------

    if (
      match.result !== "team1" &&
      match.result !== "team2" &&
      match.result !== "draw"
    ) {
      skippedMatches++;

      console.log(
        `  Match ${match.id}: skipped - invalid result=${match.result}`,
      );

      continue;
    }

    // ----------------------------------------------------------
    // Get actual players from match_players
    // ----------------------------------------------------------

    const playersInMatch =
      mpByMatchId[match.id] ?? [];

    const team1 = playersInMatch
      .filter(
        (player) =>
          player.team === "team1",
      )
      .map((player) => ({
        id: player.playerId,
        elo:
          eloByClub[match.clubId!]?.[
            player.playerId
          ] ?? STARTING_ELO,
      }));

    const team2 = playersInMatch
      .filter(
        (player) =>
          player.team === "team2",
      )
      .map((player) => ({
        id: player.playerId,
        elo:
          eloByClub[match.clubId!]?.[
            player.playerId
          ] ?? STARTING_ELO,
      }));

    // ----------------------------------------------------------
    // Both teams must contain players
    // ----------------------------------------------------------

    if (
      team1.length === 0 ||
      team2.length === 0
    ) {
      skippedMatches++;

      console.log(
        `  Match ${match.id}: skipped - incomplete teams`,
      );

      continue;
    }

    // ----------------------------------------------------------
    // Calculate Elo
    // ----------------------------------------------------------

    const isDraw =
      match.result === "draw";

    const team1Won =
      match.result === "team1";

    const changes =
      calculateMatchEloChanges(
        team1,
        team2,
        team1Won,
        isDraw,
      );

    // ----------------------------------------------------------
    // Save history
    // ----------------------------------------------------------

    await db
      .insert(eloHistoryTable)
      .values(
        changes.map((change) => ({
          playerId: change.playerId,
          matchId: match.id,
          sportId: match.sportId,
          eloBefore: change.eloBefore,
          eloAfter: change.eloAfter,
          eloChange: change.eloChange,
        })),
      );

    // ----------------------------------------------------------
    // Update temporary Elo state
    // ----------------------------------------------------------

    if (!eloByClub[match.clubId]) {
      eloByClub[match.clubId] = {};
    }

    for (const change of changes) {
      eloByClub[match.clubId][
        change.playerId
      ] = change.eloAfter;

      console.log(
        `  Match ${match.id}: player ${change.playerId} ` +
          `${change.eloBefore} -> ${change.eloAfter} ` +
          `(${change.eloChange >= 0 ? "+" : ""}${change.eloChange})`,
      );
    }

    processedMatches++;
  }

  // ------------------------------------------------------------
  // 7. Persist final Elo values
  // ------------------------------------------------------------

  for (const player of players) {
    if (player.clubId == null) {
      continue;
    }

    const finalElo =
      eloByClub[player.clubId]?.[
        player.id
      ];

    if (finalElo === undefined) {
      continue;
    }

    await db
      .update(playersTable)
      .set({
        elo: finalElo,
      })
      .where(
        eq(
          playersTable.id,
          player.id,
        ),
      );
  }

  // ------------------------------------------------------------
  // 8. Show final results
  // ------------------------------------------------------------

  console.log("");
  console.log("========================================");
  console.log("ELO REBUILD COMPLETE");
  console.log("========================================");
  console.log(
    `Processed matches: ${processedMatches}`,
  );
  console.log(
    `Skipped matches:   ${skippedMatches}`,
  );
  console.log("");

  const updatedPlayers =
    await db
      .select()
      .from(playersTable);

  console.log("Final Elo values:");

  for (const player of updatedPlayers) {
    console.log(
      `  ${player.name}: ${player.elo}`,
    );
  }

  console.log("");
  console.log("Done.");

  process.exit(0);
}

run().catch((error) => {
  console.error(
    "Elo migration failed:",
    error,
  );

  process.exit(1);
});