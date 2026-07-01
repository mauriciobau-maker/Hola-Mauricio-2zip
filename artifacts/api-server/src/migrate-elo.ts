/**
 * One-time script: replays all existing matches to seed elo_history and player Elo values.
 * Run with: npx tsx src/migrate-elo.ts
 */
import { eq, asc } from "drizzle-orm";
import { db, matchesTable, playersTable, eloHistoryTable, matchPlayersTable } from "@workspace/db";
import { calculateMatchEloChanges, STARTING_ELO } from "./elo";

async function run() {
  console.log("Resetting all player Elos to", STARTING_ELO, "...");
  await db.update(playersTable).set({ elo: STARTING_ELO });
  await db.delete(eloHistoryTable);

  const matches = await db.select().from(matchesTable).orderBy(asc(matchesTable.playedAt));
  const players = await db.select().from(playersTable);
  const allMatchPlayers = await db.select().from(matchPlayersTable);

  const eloMap: Record<number, number> = {};
  for (const p of players) eloMap[p.id] = STARTING_ELO;

  const mpByMatchId: Record<number, typeof matchPlayersTable.$inferSelect[]> = {};
  for (const mp of allMatchPlayers) {
    if (!mpByMatchId[mp.matchId]) mpByMatchId[mp.matchId] = [];
    mpByMatchId[mp.matchId].push(mp);
  }

  console.log(`Replaying ${matches.length} match(es)...`);

  for (const match of matches) {
    const matchPlayers = mpByMatchId[match.id] ?? [];
    const team1 = matchPlayers
      .filter((mp) => mp.team === "team1")
      .map((mp) => ({ id: mp.playerId, elo: eloMap[mp.playerId] ?? STARTING_ELO }));
    const team2 = matchPlayers
      .filter((mp) => mp.team === "team2")
      .map((mp) => ({ id: mp.playerId, elo: eloMap[mp.playerId] ?? STARTING_ELO }));

    if (team1.length === 0 || team2.length === 0) continue;

    const team1Won = match.result === "team1";
    const isDraw = match.result === "draw";
    const changes = calculateMatchEloChanges(team1, team2, team1Won, isDraw);

    await db.insert(eloHistoryTable).values(
      changes.map((c) => ({
        playerId: c.playerId,
        matchId: match.id,
        sportId: match.sportId,
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
