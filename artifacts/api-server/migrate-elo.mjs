/**
 * Initial Elo seeding — replays all existing matches in chronological order.
 * Run with: node migrate-elo.mjs
 */
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const K = 32;
const START = 1500;

function expected(playerElo, opponentAvg) {
  return 1 / (1 + Math.pow(10, (opponentAvg - playerElo) / 400));
}

function calcChanges(team1, team2, team1Won) {
  const t1Avg = team1.reduce((s, p) => s + p.elo, 0) / team1.length;
  const t2Avg = team2.reduce((s, p) => s + p.elo, 0) / team2.length;
  return [
    ...team1.map((p) => {
      const change = Math.round(K * ((team1Won ? 1 : 0) - expected(p.elo, t2Avg)));
      return { id: p.id, before: p.elo, change, after: p.elo + change };
    }),
    ...team2.map((p) => {
      const change = Math.round(K * ((team1Won ? 0 : 1) - expected(p.elo, t1Avg)));
      return { id: p.id, before: p.elo, change, after: p.elo + change };
    }),
  ];
}

const client = await pool.connect();
try {
  await client.query("BEGIN");

  // Reset all players to 1500
  await client.query("UPDATE players SET elo = $1", [START]);
  // Clear history
  await client.query("DELETE FROM elo_history");

  // Get all matches in chronological order
  const { rows: matches } = await client.query(
    "SELECT * FROM matches ORDER BY played_at ASC"
  );

  const { rows: players } = await client.query("SELECT id, elo FROM players");
  const eloMap = {};
  for (const p of players) eloMap[p.id] = START;

  console.log(`Replaying ${matches.length} match(es)...`);

  for (const m of matches) {
    const t1Won = m.team1_sets_won > m.team2_sets_won;
    const team1 = [
      { id: m.team1_player1_id, elo: eloMap[m.team1_player1_id] ?? START },
      { id: m.team1_player2_id, elo: eloMap[m.team1_player2_id] ?? START },
    ];
    const team2 = [
      { id: m.team2_player1_id, elo: eloMap[m.team2_player1_id] ?? START },
      { id: m.team2_player2_id, elo: eloMap[m.team2_player2_id] ?? START },
    ];

    const changes = calcChanges(team1, team2, t1Won);

    for (const c of changes) {
      await client.query(
        "INSERT INTO elo_history (player_id, match_id, elo_before, elo_after, elo_change) VALUES ($1, $2, $3, $4, $5)",
        [c.id, m.id, c.before, c.after, c.change]
      );
      eloMap[c.id] = c.after;
      console.log(`  Match ${m.id}: player ${c.id}  ${c.before} -> ${c.after}  (${c.change >= 0 ? "+" : ""}${c.change})`);
    }
  }

  // Persist final Elos
  for (const [id, elo] of Object.entries(eloMap)) {
    await client.query("UPDATE players SET elo = $1 WHERE id = $2", [elo, id]);
  }

  await client.query("COMMIT");

  const { rows: result } = await client.query("SELECT name, elo FROM players ORDER BY elo DESC");
  console.log("\nFinal Elo rankings:");
  for (const r of result) console.log(`  ${r.name}: ${r.elo}`);
  console.log("\nDone.");
} catch (err) {
  await client.query("ROLLBACK");
  console.error(err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
