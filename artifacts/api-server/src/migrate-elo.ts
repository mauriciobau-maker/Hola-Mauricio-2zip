/**
 * One-time script: replays all existing matches to seed elo_history and player Elo values.
 * Run with: npx tsx src/migrate-elo.ts
 */
import { eq, asc } from "drizzle-orm";
import { db, matchesTable, playersTable, eloHistoryTable } from "@workspace/db";
import { calculateMatchEloChanges, STARTING_ELO } from "./elo";

async function run() {
  console.log("Resetting all player Elos to", STARTING_ELO, "...");
  await db.update(playersTable).set({ elo: STARTING_ELO });
  await db.delete(eloHistoryTable);

  const matches = await db.select().from(matchesTable).orderBy(asc(matchesTable.playedAt));
  const players = await db.select().from(playersTable);

  const eloMap: Record<number, number> = {};
  for (const p of players) eloMap[p.id] = STARTING_ELO;

  console.log(`Replaying ${matches.length} match(es)...`);

  for (const match of matches) {
    const team1Won = match.team1SetsWon > match.team2SetsWon;
    const team1 = [
      { id: match.team1Player1Id, elo: eloMap[match.team1Player1Id] ?? STARTING_ELO },
      { id: match.team1Player2Id, elo: eloMap[match.team1Player2Id] ?? STARTING_ELO },
    ];
    const team2 = [
      { id: match.team2Player1Id, elo: eloMap[match.team2Player1Id] ?? STARTING_ELO },
      { id: match.team2Player2Id, elo: eloMap[match.team2Player2Id] ?? STARTING_ELO },
    ];

    const changes = calculateMatchEloChanges(team1, team2, team1Won);

    await db.insert(eloHistoryTable).values(
      changes.map((c) => ({
        playerId: c.playerId,
        matchId: match.id,
        eloBefore: c.eloBefore,
        eloAfter: c.eloAfter,
        eloChange: c.eloChange,
      }))
    );

    for (const c of changes) {
      eloMap[c.playerId] = c.eloAfter;
      console.log(`  Match ${match.id}: player ${c.playerId} ${c.eloBefore} -> ${c.eloAfter} (${c.eloChange > 0 ? "+" : ""}${c.eloChange})`);
    }
  }

  for (const [playerIdStr, elo] of Object.entries(eloMap)) {
    await db.update(playersTable).set({ elo }).where(eq(playersTable.id, parseInt(playerIdStr)));
  }

  console.log("\nFinal Elo values:");
  const updated = await db.select().from(playersTable);
  for (const p of updated) {
    console.log(`  ${p.name}: ${p.elo}`);
  }

  console.log("\nDone.");
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
