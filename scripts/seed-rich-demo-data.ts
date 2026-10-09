import { db } from "../lib/db/src";
import { 
  clubsTable, 
  clubSportsTable, 
  sportsTable, 
  playersTable, 
  usersTable, 
  encuentrosTable, 
  asistenciaTable,
  matchesTable,
  matchPlayersTable,
  gastosTable
} from "../lib/db/src/schema";
import { eq } from "drizzle-orm";

async function seedRichData() {
  console.log("🚀 Iniciando carga de datos enriquecida con múltiples clubes, deportes y permisos...");

  // 1. Asegurar Deportes
  const sportsData = [
    { id: 1, name: "Pádel", slug: "padel", teamSize: 2, minTeamSize: 2, maxTeamSize: 2, useSets: true, active: true },
    { id: 2, name: "Tenis", slug: "tenis", teamSize: 1, minTeamSize: 1, maxTeamSize: 2, useSets: true, active: true },
    { id: 3, name: "Fútbol", slug: "futbol", teamSize: 5, minTeamSize: 4, maxTeamSize: 7, useSets: false, active: true },
  ];

  for (const s of sportsData) {
    const existing = await db.select().from(sportsTable).where(eq(sportsTable.id, s.id));
    if (existing.length === 0) {
      await db.insert(sportsTable).values(s);
    } else {
      await db.update(sportsTable).set(s).where(eq(sportsTable.id, s.id));
    }
  }
  console.log("✓ Deportes verificados (Pádel, Tenis, Fútbol)");

  // 2. Múltiples Clubes con configuraciones distintas
  const clubs = [
    {
      id: 1,
      name: "Club Pádel Central",
      slug: "club-padel-central",
      plan: "pro",
      active: true,
      inviteCode: "CENTRAL2026",
      primaryColor: "#10b981", // Verde
      secondaryColor: "#047857",
      address: "Av. del Deporte 100",
      city: "Santiago",
      country: "Chile",
      defaultLanguage: "es"
    },
    {
      id: 2,
      name: "Real Tenis Club",
      slug: "real-tenis-club",
      plan: "pro",
      active: true,
      inviteCode: "TENIS2026",
      primaryColor: "#ea580c", // Naranja arcilla
      secondaryColor: "#c2410c",
      address: "Paseo de la Raqueta 45",
      city: "Madrid",
      country: "España",
      defaultLanguage: "es"
    },
    {
      id: 3,
      name: "Liga Fútbol 5 & 7",
      slug: "liga-futbol-club",
      plan: "basic",
      active: true,
      inviteCode: "FUTBOL2026",
      primaryColor: "#1e40af", // Azul marino
      secondaryColor: "#1e3a8a",
      address: "Camilo Henríquez 800",
      city: "Buenos Aires",
      country: "Argentina",
      defaultLanguage: "es"
    },
    {
      id: 4,
      name: "Multisport Arena Pro",
      slug: "multisport-arena",
      plan: "enterprise",
      active: true,
      inviteCode: "MULTI2026",
      primaryColor: "#8b5cf6", // Morado
      secondaryColor: "#6d28d9",
      address: "Complejo Olímpico 1",
      city: "Barcelona",
      country: "España",
      defaultLanguage: "es"
    }
  ];

  for (const c of clubs) {
    const existing = await db.select().from(clubsTable).where(eq(clubsTable.id, c.id));
    if (existing.length === 0) {
      await db.insert(clubsTable).values(c);
    } else {
      await db.update(clubsTable).set(c).where(eq(clubsTable.id, c.id));
    }
  }
  console.log("✓ 4 Clubes configurados (Mixto, Solo Tenis, Solo Fútbol, Todos los deportes)");

  // 3. Configurar Deportes Activos por Club (Permisos de deportes)
  // Limpiar y repoblar club_sports para cada club
  for (const c of clubs) {
    await db.delete(clubSportsTable).where(eq(clubSportsTable.clubId, c.id));
  }

  // Club 1: Pádel y Tenis
  await db.insert(clubSportsTable).values([
    { clubId: 1, sportId: 1, active: true },
    { clubId: 1, sportId: 2, active: true },
    { clubId: 1, sportId: 3, active: false }
  ]);

  // Club 2: SOLO TENIS
  await db.insert(clubSportsTable).values([
    { clubId: 2, sportId: 1, active: false },
    { clubId: 2, sportId: 2, active: true },
    { clubId: 2, sportId: 3, active: false }
  ]);

  // Club 3: SOLO FÚTBOL
  await db.insert(clubSportsTable).values([
    { clubId: 3, sportId: 1, active: false },
    { clubId: 3, sportId: 2, active: false },
    { clubId: 3, sportId: 3, active: true }
  ]);

  // Club 4: TODOS (Pádel, Tenis y Fútbol)
  await db.insert(clubSportsTable).values([
    { clubId: 4, sportId: 1, active: true },
    { clubId: 4, sportId: 2, active: true },
    { clubId: 4, sportId: 3, active: true }
  ]);
  console.log("✓ Deportes y permisos por club asignados correctamente");

  // 4. Jugadores con Casos Especiales (Admin como Jugador + Jugador Multi-Club)
  // Mauricio Bau como Jugador en Club 1
  const mbau = await db.select().from(playersTable).where(eq(playersTable.phone, "+56912345678"));
  let mbauPlayerId: number;
  if (mbau.length === 0) {
    const [inserted] = await db.insert(playersTable).values({
      name: "Mauricio Bau",
      nickname: "El Creador",
      elo: 1550,
      phone: "+56912345678",
      clubId: 1,
      dominantHand: "diestro",
      courtSide: "reves",
      wspConsent: true,
      language: "es"
    }).returning();
    mbauPlayerId = inserted.id;
  } else {
    mbauPlayerId = mbau[0].id;
    await db.update(playersTable).set({
      name: "Mauricio Bau",
      elo: 1550,
      clubId: 1,
      dominantHand: "diestro",
      courtSide: "reves"
    }).where(eq(playersTable.id, mbauPlayerId));
  }

  // Jugadores para Club 2 (Real Tenis Club)
  // Carlos Ruiz también como jugador en Club 2 (Multi-Club independiente)
  const tennisPlayers = [
    { name: "Carlos Ruiz", nickname: "Ace", elo: 1480, phone: "+34611223344", clubId: 2, dominantHand: "diestro", courtSide: "drive" },
    { name: "Gisela Dulko", nickname: "Topspin", elo: 1530, phone: "+34611220001", clubId: 2, dominantHand: "diestro", courtSide: "reves" },
    { name: "Fernando González", nickname: "Bombardero", elo: 1590, phone: "+34611220002", clubId: 2, dominantHand: "diestro", courtSide: "drive" },
    { name: "Nicolás Massú", nickname: "Gladiador", elo: 1560, phone: "+34611220003", clubId: 2, dominantHand: "diestro", courtSide: "reves" },
    { name: "Camila Osorio", nickname: "Flecha", elo: 1440, phone: "+34611220004", clubId: 2, dominantHand: "diestro", courtSide: "ambos" }
  ];

  for (const p of tennisPlayers) {
    const exists = await db.select().from(playersTable).where(eq(playersTable.phone, p.phone));
    if (exists.length === 0 || exists[0].clubId !== p.clubId) {
      await db.insert(playersTable).values({ ...p, wspConsent: true, language: "es" });
    }
  }

  // Jugadores para Club 3 (Liga Fútbol - Solo Fútbol)
  const futbolPlayers = [
    { name: "Martín Palermo", nickname: "El Titán", elo: 1520, phone: "+54911220001", clubId: 3 },
    { name: "Diego Forlán", nickname: "Cachavacha", elo: 1540, phone: "+54911220002", clubId: 3 },
    { name: "Javier Mascherano", nickname: "El Jefecito", elo: 1510, phone: "+54911220003", clubId: 3 },
    { name: "Esteban Cambiasso", nickname: "Cuchu", elo: 1490, phone: "+54911220004", clubId: 3 },
    { name: "Lucas Moura", nickname: "Rayo", elo: 1470, phone: "+54911220005", clubId: 3 },
    { name: "Gonzalo Higuaín", nickname: "Pipita", elo: 1460, phone: "+54911220006", clubId: 3 },
    { name: "Claudio Bravo", nickname: "Capitán", elo: 1500, phone: "+54911220007", clubId: 3 },
    { name: "Arturo Vidal", nickname: "Rey", elo: 1530, phone: "+54911220008", clubId: 3 },
    { name: "Gary Medel", nickname: "Pitbull", elo: 1490, phone: "+54911220009", clubId: 3 },
    { name: "Alexis Sánchez", nickname: "Maravilla", elo: 1550, phone: "+54911220010", clubId: 3 }
  ];

  for (const p of futbolPlayers) {
    const exists = await db.select().from(playersTable).where(eq(playersTable.phone, p.phone));
    if (exists.length === 0) {
      await db.insert(playersTable).values({ ...p, wspConsent: true, language: "es" });
    }
  }
  console.log("✓ Jugadores añadidos para todos los clubes (Carlos Ruiz en Club 1 y Club 2)");

  // 5. Vincular Super Admin y Administradores Híbridos en usersTable
  // Mauricio Bau: Super Admin + vinculado a su ficha de jugador
  const uMbau = await db.select().from(usersTable).where(eq(usersTable.email, "mauricio.bau@gmail.com"));
  if (uMbau.length === 0) {
    await db.insert(usersTable).values({
      email: "mauricio.bau@gmail.com",
      firstName: "Mauricio",
      lastName: "Bau",
      name: "Mauricio Bau",
      isAdmin: 2, // Super Admin
      isClubAdmin: 1,
      clubId: 1,
      playerId: mbauPlayerId
    });
  } else {
    await db.update(usersTable).set({
      isAdmin: 2,
      isClubAdmin: 1,
      clubId: 1,
      playerId: mbauPlayerId
    }).where(eq(usersTable.email, "mauricio.bau@gmail.com"));
  }

  // Admins de los clubes
  const clubAdmins = [
    { email: "admin.tenis@club.com", firstName: "Admin", lastName: "Tenis", name: "Admin Real Tenis", isAdmin: 0, isClubAdmin: 1, clubId: 2 },
    { email: "admin.futbol@club.com", firstName: "Admin", lastName: "Fútbol", name: "Admin Liga Fútbol", isAdmin: 0, isClubAdmin: 1, clubId: 3 },
    { email: "admin.multisport@club.com", firstName: "Admin", lastName: "Multisport", name: "Admin Multisport", isAdmin: 0, isClubAdmin: 1, clubId: 4 },
  ];

  for (const adm of clubAdmins) {
    const ex = await db.select().from(usersTable).where(eq(usersTable.email, adm.email));
    if (ex.length === 0) {
      await db.insert(usersTable).values(adm);
    } else {
      await db.update(usersTable).set(adm).where(eq(usersTable.email, adm.email));
    }
  }
  console.log("✓ Usuarios y Administradores híbridos vinculados");

  // 6. Encuentros Deportivos para cada club
  const encuentrosData = [
    {
      title: "Torneo Pádel Sabatino - Categoría 3ª",
      dateTime: new Date(Date.now() + 86400000 * 2), // en 2 días
      location: "Pista Central Panorámica",
      clubId: 1,
      sportId: 1,
      maxSpots: 4,
      estado: "abierto",
      formato: "americano",
      durationMinutes: 90
    },
    {
      title: "Desafío Masters Singles de Tenis",
      dateTime: new Date(Date.now() + 86400000 * 3), // en 3 días
      location: "Cancha Arcilla 1",
      clubId: 2,
      sportId: 2,
      maxSpots: 2,
      estado: "abierto",
      formato: "singles",
      durationMinutes: 90
    },
    {
      title: "Clásico Nocturno Fútbol 5",
      dateTime: new Date(Date.now() + 86400000 * 4), // en 4 días
      location: "Cancha Sintética Techada A",
      clubId: 3,
      sportId: 3,
      maxSpots: 10,
      estado: "abierto",
      formato: "partido_completo",
      durationMinutes: 60
    },
    {
      title: "Jornada Multideporte Pádel & Tenis Pro",
      dateTime: new Date(Date.now() + 86400000 * 5),
      location: "Arena Central Pista 1",
      clubId: 4,
      sportId: 1,
      maxSpots: 8,
      estado: "abierto",
      formato: "americano",
      durationMinutes: 120
    }
  ];

  for (const enc of encuentrosData) {
    await db.insert(encuentrosTable).values(enc);
  }
  console.log("✓ Nuevos encuentros creados para todos los deportes");

  console.log("🎉 ¡CARGA COMPLETA EXITOSA EN NEON DB!");
  process.exit(0);
}

seedRichData().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
