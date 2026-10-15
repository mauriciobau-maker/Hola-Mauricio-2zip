try {
  process.loadEnvFile?.();
} catch {}

import { db, pool } from "../lib/db/src/index";
import {
  clubsTable,
  sportsTable,
  clubSportsTable,
  playersTable,
  matchesTable,
  matchPlayersTable,
  sportModalitiesTable,
} from "../lib/db/src/schema/index";
import { eq, and } from "drizzle-orm";

async function seedFootballData() {
  console.log("⚽ [Seed Fútbol] Iniciando población de partidos y nómina de fútbol...");

  const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, 1));
  if (!club) {
    console.error("Club 1 no existe.");
    process.exit(1);
  }

  // 1. Asegurar Fútbol en sportsTable
  let [futbolSport] = await db.select().from(sportsTable).where(eq(sportsTable.slug, "futbol"));
  if (!futbolSport) {
    [futbolSport] = await db.insert(sportsTable).values({
      name: "Fútbol",
      slug: "futbol",
      teamSize: 7,
      minTeamSize: 5,
      maxTeamSize: 11,
      useSets: false,
      active: true,
    }).returning();
  }

  // 2. Asegurar que Fútbol esté activo en clubSportsTable para Club 1
  const [cs] = await db.select().from(clubSportsTable).where(
    and(eq(clubSportsTable.clubId, club.id), eq(clubSportsTable.sportId, futbolSport.id))
  );
  if (!cs) {
    await db.insert(clubSportsTable).values({
      clubId: club.id,
      sportId: futbolSport.id,
      active: true,
    });
  } else if (!cs.active) {
    await db.update(clubSportsTable).set({ active: true }).where(eq(clubSportsTable.id, cs.id));
  }

  // 3. Obtener o crear modalidades de fútbol
  let [f7Mod] = await db.select().from(sportModalitiesTable).where(
    and(eq(sportModalitiesTable.sportId, futbolSport.id), eq(sportModalitiesTable.slug, "futbol-7"))
  );
  if (!f7Mod) {
    [f7Mod] = await db.insert(sportModalitiesTable).values({
      sportId: futbolSport.id,
      name: "Fútbol 7",
      slug: "futbol-7",
      teamSize: 7,
      minTeamSize: 5,
      maxTeamSize: 9,
      useSets: false,
      active: true,
    }).returning();
  }

  let [f5Mod] = await db.select().from(sportModalitiesTable).where(
    and(eq(sportModalitiesTable.sportId, futbolSport.id), eq(sportModalitiesTable.slug, "baby-futbol"))
  );
  if (!f5Mod) {
    [f5Mod] = await db.insert(sportModalitiesTable).values({
      sportId: futbolSport.id,
      name: "Baby Fútbol / Futsal",
      slug: "baby-futbol",
      teamSize: 5,
      minTeamSize: 4,
      maxTeamSize: 6,
      useSets: false,
      active: true,
    }).returning();
  }

  // 4. Asegurar jugadores suficientes en Club 1
  const existingPlayers = await db.select().from(playersTable).where(eq(playersTable.clubId, club.id));
  const playerMap = new Map<string, number>();
  for (const p of existingPlayers) {
    playerMap.set(p.name, p.id);
  }

  const additionalPlayers = [
    { name: "Gonzalo Higuaín", nickname: "Pipita", phone: "+56911223344" },
    { name: "Arturo Vidal", nickname: "Rey Arturo", phone: "+56922334455" },
    { name: "Gary Medel", nickname: "Pitbull", phone: "+56933445566" },
    { name: "Alexis Sánchez", nickname: "Dilla", phone: "+56944556677" },
    { name: "Claudio Bravo", nickname: "Capitán", phone: "+56955667788" },
  ];

  for (const ap of additionalPlayers) {
    if (!playerMap.has(ap.name)) {
      const [newP] = await db.insert(playersTable).values({
        clubId: club.id,
        name: ap.name,
        nickname: ap.nickname,
        phone: ap.phone,
        elo: 1500,
        wspConsent: true,
        language: "es",
      }).returning();
      playerMap.set(ap.name, newP.id);
      console.log(`   ✅ Jugador añadido a Club 1: ${ap.name}`);
    }
  }

  // Obtener lista completa de IDs de jugadores
  const allClubPlayers = await db.select().from(playersTable).where(eq(playersTable.clubId, club.id));
  const pMap = new Map<string, number>();
  allClubPlayers.forEach((p) => pMap.set(p.name, p.id));

  const getId = (name: string) => {
    const id = pMap.get(name);
    if (!id) throw new Error(`Jugador ${name} no encontrado en Club 1`);
    return id;
  };

  // 5. Eliminar partidos de fútbol antiguos para regenerarlos limpios y consistentes
  const oldFootballMatches = await db.select().from(matchesTable).where(
    and(eq(matchesTable.clubId, club.id), eq(matchesTable.sportId, futbolSport.id))
  );
  if (oldFootballMatches.length > 0) {
    const oldIds = oldFootballMatches.map((m) => m.id);
    for (const mId of oldIds) {
      await db.delete(matchPlayersTable).where(eq(matchPlayersTable.matchId, mId));
      await db.delete(matchesTable).where(eq(matchesTable.id, mId));
    }
    console.log(`   🧹 Limpiados ${oldFootballMatches.length} partidos de fútbol antiguos.`);
  }

  // 6. Crear Partidos de Fútbol Oficiales (3 vs Rival Externo y 1 Inter-escuadras)
  console.log("🏆 Creando partidos oficiales de fútbol con cómputo 3-1-0...");

  // PARTIDO 1: vs Rival Externo "Deportivo San Martín" (Victoria 4 - 2 -> +3 PTS)
  const [match1] = await db.insert(matchesTable).values({
    clubId: club.id,
    sportId: futbolSport.id,
    modalityId: f7Mod.id,
    matchType: "rival",
    rivalTeamName: "Deportivo San Martín",
    team1Score: 4,
    team2Score: 2,
    result: "team1",
    status: "confirmed",
    playedAt: new Date(Date.now() - 86400000 * 4), // Hace 4 días
  }).returning();

  // Convocados para Partido 1
  const match1Starters = [
    "Mauricio Bau", "Carlos Ruiz", "Jorge Silva", "Diego Morales",
    "Ana Martínez", "Arturo Vidal", "Claudio Bravo",
  ];
  const match1Subs = ["Alexis Sánchez", "Gary Medel"];

  for (const name of match1Starters) {
    await db.insert(matchPlayersTable).values({
      matchId: match1.id,
      playerId: getId(name),
      team: "team1",
      isSubstitute: false,
    });
  }
  for (const name of match1Subs) {
    await db.insert(matchPlayersTable).values({
      matchId: match1.id,
      playerId: getId(name),
      team: "team1",
      isSubstitute: true,
    });
  }
  console.log("   ✅ Partido 1: Victoria 4-2 vs Deportivo San Martín (+3 PTS)");

  // PARTIDO 2: vs Rival Externo "Atlético Recoleta" (Empate 2 - 2 -> +1 PTO)
  const [match2] = await db.insert(matchesTable).values({
    clubId: club.id,
    sportId: futbolSport.id,
    modalityId: f7Mod.id,
    matchType: "rival",
    rivalTeamName: "Atlético Recoleta",
    team1Score: 2,
    team2Score: 2,
    result: "draw",
    status: "confirmed",
    playedAt: new Date(Date.now() - 86400000 * 8), // Hace 8 días
  }).returning();

  const match2Starters = [
    "Mauricio Bau", "Carlos Ruiz", "Ana Martínez", "Sofía Valenzuela",
    "Diego Morales", "Gary Medel", "Claudio Bravo",
  ];
  const match2Subs = ["Valentina Castro", "Gonzalo Higuaín"];

  for (const name of match2Starters) {
    await db.insert(matchPlayersTable).values({
      matchId: match2.id,
      playerId: getId(name),
      team: "team1",
      isSubstitute: false,
    });
  }
  for (const name of match2Subs) {
    await db.insert(matchPlayersTable).values({
      matchId: match2.id,
      playerId: getId(name),
      team: "team1",
      isSubstitute: true,
    });
  }
  console.log("   ✅ Partido 2: Empate 2-2 vs Atlético Recoleta (+1 PTO)");

  // PARTIDO 3: Partido Interno (Inter-escuadras Baby Fútbol 5v5: Equipo Azul 5 - 3 Equipo Blanco)
  const [match3] = await db.insert(matchesTable).values({
    clubId: club.id,
    sportId: futbolSport.id,
    modalityId: f5Mod.id,
    matchType: "internal",
    rivalTeamName: null,
    team1Score: 5,
    team2Score: 3,
    result: "team1",
    status: "confirmed",
    playedAt: new Date(Date.now() - 86400000 * 12), // Hace 12 días
  }).returning();

  // Equipo Azul (Ganador +3 PTS)
  const team1Internal = [
    "Mauricio Bau", "Carlos Ruiz", "Arturo Vidal", "Alexis Sánchez", "Claudio Bravo",
  ];
  // Equipo Blanco (Derrotado 0 PTS)
  const team2Internal = [
    "Jorge Silva", "Diego Morales", "Ana Martínez", "Miguel Ángel", "Gonzalo Higuaín",
  ];

  for (const name of team1Internal) {
    await db.insert(matchPlayersTable).values({
      matchId: match3.id,
      playerId: getId(name),
      team: "team1",
      isSubstitute: false,
    });
  }
  for (const name of team2Internal) {
    await db.insert(matchPlayersTable).values({
      matchId: match3.id,
      playerId: getId(name),
      team: "team2",
      isSubstitute: false,
    });
  }
  console.log("   ✅ Partido 3: Inter-escuadras 5-3 (Azul +3 PTS / Blanco 0 PTS)");

  // PARTIDO 4: vs Rival Externo "Sporting FC" (Victoria 3 - 1 -> +3 PTS)
  const [match4] = await db.insert(matchesTable).values({
    clubId: club.id,
    sportId: futbolSport.id,
    modalityId: f7Mod.id,
    matchType: "rival",
    rivalTeamName: "Sporting FC",
    team1Score: 3,
    team2Score: 1,
    result: "team1",
    status: "confirmed",
    playedAt: new Date(Date.now() - 86400000 * 16), // Hace 16 días
  }).returning();

  const match4Starters = [
    "Mauricio Bau", "Carlos Ruiz", "Jorge Silva", "Alexis Sánchez",
    "Valentina Castro", "Sofía Valenzuela", "Claudio Bravo",
  ];
  for (const name of match4Starters) {
    await db.insert(matchPlayersTable).values({
      matchId: match4.id,
      playerId: getId(name),
      team: "team1",
      isSubstitute: false,
    });
  }
  console.log("   ✅ Partido 4: Victoria 3-1 vs Sporting FC (+3 PTS)");

  console.log("🎉 ¡DATOS DE FÚTBOL SEMBRADOS CON ÉXITO!");
  await pool.end();
}

seedFootballData().catch((err) => {
  console.error("Error sembrando fútbol:", err);
  process.exit(1);
});
