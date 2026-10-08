try {
  process.loadEnvFile?.();
} catch {}

import { db } from "../lib/db/src/index";
import {
  clubsTable,
  sportsTable,
  sportModalitiesTable,
  clubSportsTable,
  playersTable,
  membershipsTable,
  usersTable,
  matchesTable,
  matchPlayersTable,
  encuentrosTable,
  asistenciaTable,
} from "../lib/db/src/schema/index";
import { eq } from "drizzle-orm";

export async function runSeed() {
  console.log("🌱 [Seed Demo] Iniciando población de datos de prueba...");

  if (!process.env.DATABASE_URL) {
    console.warn("⚠️  DATABASE_URL no está configurada en las variables de entorno.");
    console.warn("   Para escribir en Render, asegúrate de colocar tu DATABASE_URL en el archivo .env.");
    return;
  }

  // 1. Deportes base
  console.log("🎾 1. Comprobando deportes...");
  let [padelSport] = await db.select().from(sportsTable).where(eq(sportsTable.slug, "padel"));
  if (!padelSport) {
    [padelSport] = await db
      .insert(sportsTable)
      .values({
        name: "Pádel",
        slug: "padel",
        teamSize: 2,
        minTeamSize: 2,
        maxTeamSize: 2,
        useSets: true,
        active: true,
      })
      .returning();
    console.log("   ✅ Deporte Pádel creado");
  }

  let [tenisSport] = await db.select().from(sportsTable).where(eq(sportsTable.slug, "tenis"));
  if (!tenisSport) {
    [tenisSport] = await db
      .insert(sportsTable)
      .values({
        name: "Tenis",
        slug: "tenis",
        teamSize: 1,
        minTeamSize: 1,
        maxTeamSize: 2,
        useSets: true,
        active: true,
      })
      .returning();
    console.log("   ✅ Deporte Tenis creado");
  }

  // 2. Modalidades de Pádel
  console.log("👥 2. Modalidades de Pádel...");
  let [doblesModality] = await db
    .select()
    .from(sportModalitiesTable)
    .where(eq(sportModalitiesTable.slug, "dobles"));

  if (!doblesModality) {
    [doblesModality] = await db
      .insert(sportModalitiesTable)
      .values({
        sportId: padelSport.id,
        name: "Dobles",
        slug: "dobles",
        teamSize: 2,
        minTeamSize: 2,
        maxTeamSize: 2,
        useSets: true,
        active: true,
      })
      .returning();
    console.log("   ✅ Modalidad Dobles creada");
  }

  // 3. Club Demo
  console.log("🏢 3. Creando Club Demo...");
  let [club] = await db.select().from(clubsTable).where(eq(clubsTable.slug, "club-padel-central"));
  if (!club) {
    [club] = await db
      .insert(clubsTable)
      .values({
        name: "Club Pádel Central",
        slug: "club-padel-central",
        plan: "pro",
        active: true,
        primaryColor: "#10B981",
        secondaryColor: "#047857",
        address: "Av. Las Palmeras 450, Pista Central",
        inviteCode: "CENTRAL2026",
      })
      .returning();
    console.log("   ✅ Club Pádel Central creado (ID:", club.id, ")");
  }

  // Vincular deporte al club
  const [existingClubSport] = await db
    .select()
    .from(clubSportsTable)
    .where(eq(clubSportsTable.clubId, club.id));

  if (!existingClubSport) {
    await db.insert(clubSportsTable).values({
      clubId: club.id,
      sportId: padelSport.id,
      active: true,
    });
    console.log("   ✅ Deporte Pádel vinculado al club");
  }

  // 4. Jugadores con Elo
  console.log("🏃 4. Creando Jugadores Demo...");
  const DEMO_PLAYERS = [
    { name: "Carlos Ruiz", nickname: "El Muro", elo: 1540, phone: "+34611223344" },
    { name: "Ana Martínez", nickname: "La Zurda", elo: 1480, phone: "+34622334455" },
    { name: "Jorge Silva", nickname: "Smasher", elo: 1420, phone: "+34633445566" },
    { name: "Lucía Fernández", nickname: "Ninja", elo: 1390, phone: "+34644556677" },
    { name: "Miguel Ángel", nickname: "Master", elo: 1350, phone: "+34655667788" },
    { name: "Sofía Valenzuela", nickname: "Viper", elo: 1280, phone: "+34666778899" },
    { name: "Diego Morales", nickname: "Tanque", elo: 1210, phone: "+34677889900" },
    { name: "Valentina Castro", nickname: "Flecha", elo: 1150, phone: "+34688990011" },
  ];

  const createdPlayers: any[] = [];
  for (const p of DEMO_PLAYERS) {
    let [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.name, p.name));

    if (!player) {
      [player] = await db
        .insert(playersTable)
        .values({
          name: p.name,
          nickname: p.nickname,
          elo: p.elo,
          phone: p.phone,
          clubId: club.id,
        })
        .returning();

      // Membresía
      await db.insert(membershipsTable).values({
        clubId: club.id,
        playerId: player.id,
        role: "player",
      });
      console.log(`   ✅ Jugador ${player.name} creado (Elo: ${player.elo})`);
    }
    createdPlayers.push(player);
  }

  // 5. Cuentas de usuario de prueba (Opción B)
  console.log("👤 5. Cuentas de Usuario de Prueba...");

  // Usuario 1: Super Administrador
  const [existingSuper] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@padeltracker.com"));
  if (!existingSuper) {
    await db.insert(usersTable).values({
      id: "usr_superadmin_demo",
      email: "admin@padeltracker.com",
      firstName: "Admin",
      lastName: "Supremo (SuperAdmin)",
      name: "Admin Supremo",
      isAdmin: 1,
      isClubAdmin: 1,
      clubId: club.id,
    });
    console.log("   ✅ Cuenta Super Administrador: admin@padeltracker.com");
  }

  // Usuario 2: Colaborador / Administrador del Club
  const [existingColab] = await db.select().from(usersTable).where(eq(usersTable.email, "admin.club@padeltracker.com"));
  if (!existingColab) {
    await db.insert(usersTable).values({
      id: "usr_colaborador_demo",
      email: "admin.club@padeltracker.com",
      firstName: "Roberto",
      lastName: "Gómez (Colaborador)",
      name: "Roberto Gómez",
      isAdmin: 0,
      isClubAdmin: 1,
      clubId: club.id,
    });
    console.log("   ✅ Cuenta Colaborador: admin.club@padeltracker.com");
  }

  // Usuario 3: Jugador (Carlos Ruiz)
  const [existingJugador] = await db.select().from(usersTable).where(eq(usersTable.email, "jugador@padeltracker.com"));
  if (!existingJugador) {
    await db.insert(usersTable).values({
      id: "usr_jugador_demo",
      email: "jugador@padeltracker.com",
      firstName: "Carlos",
      lastName: "Ruiz (Jugador)",
      name: "Carlos Ruiz",
      isAdmin: 0,
      isClubAdmin: 0,
      clubId: club.id,
      playerId: createdPlayers[0]?.id,
    });
    console.log("   ✅ Cuenta Jugador: jugador@padeltracker.com");
  }

  // 6. Partidos Jugados
  console.log("🏆 6. Creando Partidos Históricos con Resultados...");
  const existingMatches = await db.select().from(matchesTable).where(eq(matchesTable.clubId, club.id)).limit(1);
  if (existingMatches.length === 0 && createdPlayers.length >= 4) {
    // Partido 1: Carlos & Ana vs Jorge & Lucía (6-3, 6-4)
    const [match1] = await db
      .insert(matchesTable)
      .values({
        clubId: club.id,
        sportId: padelSport.id,
        modalityId: doblesModality.id,
        team1Score: 2,
        team2Score: 0,
        sets: [
          { setNumber: 1, team1Games: 6, team2Games: 3 },
          { setNumber: 2, team1Games: 6, team2Games: 4 },
        ],
        result: "team1",
        status: "confirmed",
        playedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Hace 3 días
      })
      .returning();

    await db.insert(matchPlayersTable).values([
      { matchId: match1.id, playerId: createdPlayers[0].id, team: "team1" },
      { matchId: match1.id, playerId: createdPlayers[1].id, team: "team1" },
      { matchId: match1.id, playerId: createdPlayers[2].id, team: "team2" },
      { matchId: match1.id, playerId: createdPlayers[3].id, team: "team2" },
    ]);

    // Partido 2: Miguel & Sofía vs Diego & Valentina (7-5, 4-6, 6-2)
    const [match2] = await db
      .insert(matchesTable)
      .values({
        clubId: club.id,
        sportId: padelSport.id,
        modalityId: doblesModality.id,
        team1Score: 2,
        team2Score: 1,
        sets: [
          { setNumber: 1, team1Games: 7, team2Games: 5 },
          { setNumber: 2, team1Games: 4, team2Games: 6 },
          { setNumber: 3, team1Games: 6, team2Games: 2 },
        ],
        result: "team1",
        status: "confirmed",
        playedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Ayer
      })
      .returning();

    await db.insert(matchPlayersTable).values([
      { matchId: match2.id, playerId: createdPlayers[4].id, team: "team1" },
      { matchId: match2.id, playerId: createdPlayers[5].id, team: "team1" },
      { matchId: match2.id, playerId: createdPlayers[6].id, team: "team2" },
      { matchId: match2.id, playerId: createdPlayers[7].id, team: "team2" },
    ]);

    console.log("   ✅ 2 Partidos con resultados y sets insertados");
  }

  // 7. Encuentros próximos
  console.log("📅 7. Creando Encuentros Programados...");
  const existingEncuentros = await db.select().from(encuentrosTable).where(eq(encuentrosTable.clubId, club.id)).limit(1);
  if (existingEncuentros.length === 0 && createdPlayers.length >= 4) {
    // Encuentro 1: Completo (4/4 confirmados)
    const [encuentro1] = await db
      .insert(encuentrosTable)
      .values({
        title: "Torneo Express Viernes Noche",
        dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // En 2 días
        location: "Pista Central Cubierta",
        maxSpots: 4,
        notes: "Llevar bolas nuevas. Tercer tiempo asegurado.",
        clubId: club.id,
        sportId: padelSport.id,
        formato: "americano",
        estado: "abierto",
      })
      .returning();

    await db.insert(asistenciaTable).values([
      { encuentroId: encuentro1.id, playerId: createdPlayers[0].id, status: "confirmed", respondedAt: new Date() },
      { encuentroId: encuentro1.id, playerId: createdPlayers[1].id, status: "confirmed", respondedAt: new Date() },
      { encuentroId: encuentro1.id, playerId: createdPlayers[2].id, status: "confirmed", respondedAt: new Date() },
      { encuentroId: encuentro1.id, playerId: createdPlayers[3].id, status: "confirmed", respondedAt: new Date() },
    ]);

    // Encuentro 2: Incompleto (2/4 confirmados)
    const [encuentro2] = await db
      .insert(encuentrosTable)
      .values({
        title: "Reto Dominical Mañanero",
        dateTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // En 4 días
        location: "Pista Panorámica 2",
        maxSpots: 4,
        notes: "¡Faltan 2 jugadores de nivel intermedio para cerrar el turno!",
        clubId: club.id,
        sportId: padelSport.id,
        formato: "partido_fijo",
        estado: "abierto",
      })
      .returning();

    await db.insert(asistenciaTable).values([
      { encuentroId: encuentro2.id, playerId: createdPlayers[4].id, status: "confirmed", respondedAt: new Date() },
      { encuentroId: encuentro2.id, playerId: createdPlayers[5].id, status: "confirmed", respondedAt: new Date() },
    ]);

    console.log("   ✅ 2 Encuentros creados (uno lleno y otro con 2 vacantes)");
  }

  console.log("🎉 [Seed Demo] ¡Proceso completado con éxito!");
}

// Si se ejecuta directamente desde CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Error en seed demo:", err);
      process.exit(1);
    });
}
