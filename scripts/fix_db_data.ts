try {
  process.loadEnvFile?.();
} catch {}

import { db, matchesTable, playerSportRatingsTable, playersTable, sportsTable } from "../lib/db/src/index";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("🔄 Corrigiendo datos en base de datos...");

  // 1. Corregir resultados en matchesTable
  const matches = await db.select().from(matchesTable);
  for (const m of matches) {
    if (m.result !== "team1" && m.result !== "team2" && m.result !== "draw") {
      const t1 = Number(m.team1Score ?? 0);
      const t2 = Number(m.team2Score ?? 0);
      const newResult = t1 > t2 ? "team1" : t2 > t1 ? "team2" : "draw";
      console.log(`Corrigiendo partido ID ${m.id}: result era "${m.result}", ahora es "${newResult}"`);
      await db.update(matchesTable).set({ result: newResult }).where(eq(matchesTable.id, m.id));
    }
  }

  // 2. Poblar playerSportRatingsTable con el Elo real de cada jugador
  const sports = await db.select().from(sportsTable).where(eq(sportsTable.active, true));
  const players = await db.select().from(playersTable);

  for (const sport of sports) {
    for (const player of players) {
      await db
        .insert(playerSportRatingsTable)
        .values({
          playerId: player.id,
          sportId: sport.id,
          elo: player.elo ?? 1500,
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          matchesDrawn: 0,
        })
        .onConflictDoUpdate({
          target: [playerSportRatingsTable.playerId, playerSportRatingsTable.sportId],
          set: {
            elo: player.elo ?? 1500,
          },
        });
    }
  }

  console.log("✅ Datos corregidos y sincronizados con éxito.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error ejecutando fix_db_data:", err);
  process.exit(1);
});
