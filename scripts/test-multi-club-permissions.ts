import { db } from "../lib/db/src/index";
import {
  usersTable,
  clubsTable,
  playersTable,
  membershipsTable,
  sessionsTable,
  encuentrosTable,
  matchesTable,
  matchPlayersTable,
  eloHistoryTable,
  sportModalitiesTable,
} from "../lib/db/src/schema/index";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("🚀 Iniciando suite de pruebas de los 6 hallazgos de seguridad y aislamiento multi-club...\n");

  const testUserId = `test-user-${Date.now()}`;
  const otherUserId = `test-other-${Date.now()}`;
  const superAdminUserId = `test-superadmin-${Date.now()}`;
  const regularPlayerUserId = `test-player-${Date.now()}`;

  let testPlayerIdClub1: number | null = null;
  let testPlayerIdClub2: number | null = null;
  let testPlayerIdClub2Unlinked: number | null = null;
  let testCreatedPlayerIdClub1: number | null = null;

  let sessionIdClubAdmin: string | null = null;
  let sessionIdSuperAdmin: string | null = null;
  let sessionIdRegularPlayer: string | null = null;

  let testEncuentroClub1: number | null = null;
  let testEncuentroClub2: number | null = null;
  let testMatchEncuentro1: number | null = null;
  let testMatchEncuentro2: number | null = null;

  try {
    // -------------------------------------------------------------------------
    // Setup 1. Verificar existencia de clubes
    // -------------------------------------------------------------------------
    const clubs = await db.select().from(clubsTable).limit(5);
    if (clubs.length < 3) {
      throw new Error(`Se requieren al menos 3 clubes para la prueba. Encontrados: ${clubs.length}`);
    }
    const [club1, club2, club3] = clubs;
    console.log(`✓ Clubes listos: Club 1 (ID: ${club1.id}, ${club1.name}), Club 2 (ID: ${club2.id}, ${club2.name}), Club 3 (ID: ${club3.id}, ${club3.name})`);

    // -------------------------------------------------------------------------
    // Setup 2. Crear jugadores de prueba
    // -------------------------------------------------------------------------
    const [p1] = await db
      .insert(playersTable)
      .values({
        name: `Jugador Test Club 1 ${Date.now()}`,
        clubId: club1.id,
        elo: 1500,
        active: true,
      })
      .returning();
    testPlayerIdClub1 = p1.id;

    const [p2] = await db
      .insert(playersTable)
      .values({
        name: `Jugador Test Club 2 ${Date.now()}`,
        clubId: club2.id,
        elo: 1500,
        active: true,
      })
      .returning();
    testPlayerIdClub2 = p2.id;

    const [p2Unlinked] = await db
      .insert(playersTable)
      .values({
        name: `Jugador Unlinked Test Club 2 ${Date.now()}`,
        clubId: club2.id,
        elo: 1500,
        active: true,
      })
      .returning();
    testPlayerIdClub2Unlinked = p2Unlinked.id;
    console.log(`✓ Jugadores de prueba creados (Club 1 ID: ${testPlayerIdClub1}, Club 2 ID: ${testPlayerIdClub2}, Club 2 Unlinked ID: ${testPlayerIdClub2Unlinked})`);

    // -------------------------------------------------------------------------
    // Setup 3. Crear usuarios de prueba
    // -------------------------------------------------------------------------
    // A) Usuario con membresía club_admin en Club 1 y player en Club 2 (NO es super admin)
    const [userClubAdmin] = await db
      .insert(usersTable)
      .values({
        id: testUserId,
        email: `test-adminclub-${Date.now()}@example.com`,
        name: "Admin Club 1",
        firstName: "Admin",
        lastName: "Club1",
        clubId: club1.id,
        isAdmin: 0,
        isClubAdmin: 1,
      })
      .returning();

    await db.insert(membershipsTable).values([
      {
        userId: userClubAdmin.id,
        clubId: club1.id,
        role: "club_admin",
        playerId: testPlayerIdClub1,
        status: "active",
      },
      {
        userId: userClubAdmin.id,
        clubId: club2.id,
        role: "player",
        playerId: testPlayerIdClub2,
        status: "active",
      },
    ]);

    // B) Usuario Super Admin verificado globalmente (isAdmin = 1)
    const [userSuperAdmin] = await db
      .insert(usersTable)
      .values({
        id: superAdminUserId,
        email: `test-superadmin-${Date.now()}@example.com`,
        name: "Global Super Admin",
        firstName: "Super",
        lastName: "Admin",
        clubId: club1.id,
        isAdmin: 1,
        isClubAdmin: 1,
      })
      .returning();

    // C) Usuario Jugador Regular en Club 1
    const [userRegularPlayer] = await db
      .insert(usersTable)
      .values({
        id: regularPlayerUserId,
        email: `test-regular-${Date.now()}@example.com`,
        name: "Jugador Regular Club 1",
        firstName: "Regular",
        lastName: "Player",
        clubId: club1.id,
        isAdmin: 0,
        isClubAdmin: 0,
      })
      .returning();

    await db.insert(membershipsTable).values({
      userId: userRegularPlayer.id,
      clubId: club1.id,
      role: "player",
      status: "active",
    });

    // -------------------------------------------------------------------------
    // Setup 4. Crear sesiones de prueba
    // -------------------------------------------------------------------------
    const expire = new Date(Date.now() + 86400 * 1000);

    sessionIdClubAdmin = crypto.randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({
      sid: sessionIdClubAdmin,
      sess: {
        user: {
          id: userClubAdmin.id,
          email: userClubAdmin.email,
          name: userClubAdmin.name,
          clubId: club1.id,
        },
        activeClubId: club1.id,
        access_token: sessionIdClubAdmin,
      } as any,
      expire,
    });

    sessionIdSuperAdmin = crypto.randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({
      sid: sessionIdSuperAdmin,
      sess: {
        user: {
          id: userSuperAdmin.id,
          email: userSuperAdmin.email,
          name: userSuperAdmin.name,
          clubId: club1.id,
        },
        activeClubId: club1.id,
        access_token: sessionIdSuperAdmin,
      } as any,
      expire,
    });

    sessionIdRegularPlayer = crypto.randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({
      sid: sessionIdRegularPlayer,
      sess: {
        user: {
          id: userRegularPlayer.id,
          email: userRegularPlayer.email,
          name: userRegularPlayer.name,
          clubId: club1.id,
        },
        activeClubId: club1.id,
        access_token: sessionIdRegularPlayer,
      } as any,
      expire,
    });

    console.log("✓ Sesiones creadas para Club Admin, Super Admin y Jugador Regular\n");

    // =========================================================================
    // HALLAZGO 1: ROLES GLOBALES
    // =========================================================================
    console.log("--- TEST HALLAZGO 1: Roles Globales ---");
    // Club Admin en Club 1 intenta acceder a endpoint exclusivo de Super Admin (/api/admin/users)
    const adminAccessRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${sessionIdClubAdmin}` },
    });
    if (adminAccessRes.status !== 403) {
      throw new Error(`FALLO H1: Club Admin con rol de club no debe tener acceso a Super Admin. Status esperado: 403, obtenido: ${adminAccessRes.status}`);
    }
    console.log("✓ Correcto: Club Admin es rechazado con 403 en ruta de Super Admin (/api/admin/users)");

    // Super Admin global (users.isAdmin >= 1) accede correctamente
    const superAdminRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${sessionIdSuperAdmin}` },
    });
    if (!superAdminRes.ok) {
      throw new Error(`FALLO H1: Super Admin global debió acceder a /api/admin/users. Status: ${superAdminRes.status}`);
    }
    console.log("✓ Correcto: Super Admin verificado globalmente accede a /api/admin/users exitosamente");

    // Usuario con role "superadmin" en sesión pero sin users.isAdmin >= 1 y sin email maestro -> 403
    const fakeSuperAdminSid = crypto.randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({
      sid: fakeSuperAdminSid,
      sess: {
        user: {
          id: userRegularPlayer.id,
          email: "not-master@example.com",
          name: "Fake Super Admin",
          clubId: club1.id,
          role: "superadmin",
        },
        activeClubId: club1.id,
        access_token: fakeSuperAdminSid,
      } as any,
      expire,
    });
    const fakeSuperRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${fakeSuperAdminSid}` },
    });
    await db.delete(sessionsTable).where(eq(sessionsTable.sid, fakeSuperAdminSid)).catch(() => {});
    if (fakeSuperRes.status !== 403) {
      throw new Error(`FALLO H1: Usuario con role superadmin pero isAdmin=0 debió ser rechazado con 403, obtenido: ${fakeSuperRes.status}`);
    }
    console.log("✓ Correcto: Usuario con role 'superadmin' pero sin isAdmin global es rechazado con 403\n");

    // =========================================================================
    // HALLAZGO 2: RESULTADOS DE ENCUENTROS
    // =========================================================================
    console.log("--- TEST HALLAZGO 2: Resultados de Encuentros ---");
    // Crear un encuentro en Club 1 organizado por userClubAdmin
    const [enc1] = await db
      .insert(encuentrosTable)
      .values({
        clubId: club1.id,
        title: "Encuentro Club 1",
        location: "Cancha 1",
        organizerId: userClubAdmin.id,
        dateTime: new Date(),
        status: "confirmado",
        sportId: 1,
      })
      .returning();
    testEncuentroClub1 = enc1.id;

    const [modality] = await db.select().from(sportModalitiesTable).limit(1);
    const validModalityId = modality?.id ?? 1;

    // Crear un partido perteneciente a enc1
    const [match1] = await db
      .insert(matchesTable)
      .values({
        encuentroId: enc1.id,
        clubId: club1.id,
        sportId: 1,
        modalityId: validModalityId,
        team1Score: 0,
        team2Score: 0,
        result: "draw",
        status: "pending",
        playedAt: new Date(),
      })
      .returning();
    testMatchEncuentro1 = match1.id;

    // Crear un encuentro y partido en Club 2
    const [enc2] = await db
      .insert(encuentrosTable)
      .values({
        clubId: club2.id,
        title: "Encuentro Club 2",
        location: "Cancha 2",
        organizerId: "another-organizer",
        dateTime: new Date(),
        status: "confirmado",
        sportId: 1,
      })
      .returning();
    testEncuentroClub2 = enc2.id;

    const [match2] = await db
      .insert(matchesTable)
      .values({
        encuentroId: enc2.id,
        clubId: club2.id,
        sportId: 1,
        modalityId: validModalityId,
        team1Score: 0,
        team2Score: 0,
        result: "draw",
        status: "pending",
        playedAt: new Date(),
      })
      .returning();
    testMatchEncuentro2 = match2.id;

    // A) Enviar match que NO pertenece al encuentro especificado -> Debe rechazar con 400
    const mismatchEncuentroRes = await fetch(`${BASE_URL}/api/encuentros/${enc1.id}/partidos/${match2.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ team1Score: 6, team2Score: 4, status: "confirmed" }),
    });
    if (mismatchEncuentroRes.status !== 400) {
      throw new Error(`FALLO H2: Esperaba 400 al pasar matchId que no pertenece al encuentroId, obtenido: ${mismatchEncuentroRes.status}`);
    }
    console.log("✓ Correcto: Rechazado con 400 cuando el partido no pertenece al encuentro");

    // B) Regular player (no organizador ni admin) intenta modificar resultado de enc1 -> 403
    const unauthorizedPlayerRes = await fetch(`${BASE_URL}/api/encuentros/${enc1.id}/partidos/${match1.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdRegularPlayer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ team1Score: 6, team2Score: 3, status: "confirmed" }),
    });
    if (unauthorizedPlayerRes.status !== 403) {
      throw new Error(`FALLO H2: Jugador no autorizado pudo modificar marcador. Status obtenido: ${unauthorizedPlayerRes.status}`);
    }
    console.log("✓ Correcto: Jugador regular no puede modificar marcador/resultado (403 Forbidden)");

    // C) Organizador autorizado modifica resultado -> 200 OK
    const organizerRes = await fetch(`${BASE_URL}/api/encuentros/${enc1.id}/partidos/${match1.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ team1Score: 6, team2Score: 3, status: "confirmed" }),
    });
    if (!organizerRes.ok) {
      throw new Error(`FALLO H2: Organizador autorizado debió poder actualizar partido. Status: ${organizerRes.status}`);
    }
    const updatedMatch = await organizerRes.json();
    if (updatedMatch.team1Score !== 6 || updatedMatch.status !== "confirmed") {
      throw new Error("FALLO H2: Los datos del partido no se guardaron correctamente");
    }
    console.log("✓ Correcto: Organizador autorizado actualizó marcadores y estado exitosamente");

    // D) Partido con clubId nulo dentro del encuentro -> Debe ser rechazado con 400
    const [matchWithNullClub] = await db
      .insert(matchesTable)
      .values({
        encuentroId: enc1.id,
        clubId: null,
        sportId: 1,
        modalityId: validModalityId,
        team1Score: 0,
        team2Score: 0,
        result: "draw",
        status: "pending",
        playedAt: new Date(),
      })
      .returning();

    const nullClubMatchRes = await fetch(`${BASE_URL}/api/encuentros/${enc1.id}/partidos/${matchWithNullClub.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ team1Score: 6, team2Score: 4 }),
    });
    await db.delete(matchesTable).where(eq(matchesTable.id, matchWithNullClub.id)).catch(() => {});
    if (nullClubMatchRes.status !== 400) {
      throw new Error(`FALLO H2: Partido con clubId nulo debió ser rechazado con 400, obtenido: ${nullClubMatchRes.status}`);
    }
    console.log("✓ Correcto: Rechazado con 400 cuando el partido tiene clubId nulo\n");

    // =========================================================================
    // HALLAZGO 3: JUGADOR, CUENTA Y CLUB
    // =========================================================================
    console.log("--- TEST HALLAZGO 3: Jugador, Cuenta y Club ---");
    // A) Intentar vincular una ficha de Club 2 a la membresía de Club 1 en POST /api/auth/link-player -> Debe rechazar (400/403)
    const linkCrossClubRes = await fetch(`${BASE_URL}/api/auth/link-player`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`, // activo en Club 1
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playerId: testPlayerIdClub2 }), // ficha de Club 2
    });
    if (linkCrossClubRes.status !== 400 && linkCrossClubRes.status !== 403) {
      throw new Error(`FALLO H3: Se permitió vincular una ficha de Club 2 en contexto de Club 1. Status: ${linkCrossClubRes.status}`);
    }
    console.log("✓ Correcto: Bloqueada vinculación de ficha entre clubes ajenos (400/403)");

    // B) Autoedición: El usuario está activo en Club 1 y su ficha en Club 2 es testPlayerIdClub2.
    // Intenta autoeditar testPlayerIdClub2 mientras su club activo es Club 1 -> Debe ser RECHAZADO con 403
    const editOtherClubPlayerRes = await fetch(`${BASE_URL}/api/players/${testPlayerIdClub2}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`, // activo en Club 1
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Nombre Hackeado" }),
    });
    if (editOtherClubPlayerRes.status !== 403) {
      throw new Error(`FALLO H3: Se permitió autoeditar una ficha que no pertenece al club activo. Status: ${editOtherClubPlayerRes.status}`);
    }
    console.log("✓ Correcto: Autoedición sobre ficha que no pertenece al club activo fue bloqueada (403 Forbidden)");

    // C) Autoedición en su club activo (Club 1, ficha testPlayerIdClub1) -> Debe ser permitida
    const editOwnActivePlayerRes = await fetch(`${BASE_URL}/api/players/${testPlayerIdClub1}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dominantHand: "derecha" }),
    });
    if (!editOwnActivePlayerRes.ok) {
      throw new Error(`FALLO H3: No se pudo autoeditar la ficha del club activo. Status: ${editOwnActivePlayerRes.status}`);
    }
    console.log("✓ Correcto: Autoedición en club activo permitida correctamente\n");

    // =========================================================================
    // HALLAZGO 4: MEMBRESÍAS INACTIVAS
    // =========================================================================
    console.log("--- TEST HALLAZGO 4: Membresías Inactivas ---");
    // Marcar la membresía del usuario en Club 2 como inactiva
    await db
      .update(membershipsTable)
      .set({ status: "inactive", role: "club_admin" }) // anteriormente tenía privilegios
      .where(and(eq(membershipsTable.userId, userClubAdmin.id), eq(membershipsTable.clubId, club2.id)));

    // Intentar unirse a Club 2 mediante POST /api/auth/join-club con el inviteCode de Club 2
    const joinInactiveRes = await fetch(`${BASE_URL}/api/auth/join-club`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inviteCode: club2.inviteCode }),
    });
    if (joinInactiveRes.status !== 403) {
      throw new Error(`FALLO H4: POST /api/auth/join-club no debe reactivar membresías inactivas. Status obtenido: ${joinInactiveRes.status}`);
    }

    // Verificar en BD que la membresía sigue inactiva y no fue reactivada
    const [memClub2Check] = await db
      .select()
      .from(membershipsTable)
      .where(and(eq(membershipsTable.userId, userClubAdmin.id), eq(membershipsTable.clubId, club2.id)))
      .limit(1);

    if (memClub2Check?.status !== "inactive") {
      throw new Error("FALLO H4: La membresía inactiva fue reactivada en la base de datos");
    }
    console.log("✓ Correcto: POST /auth/join-club rechazó con 403 y NO reactivó automáticamente la membresía inactiva");

    // Reactivación administrativa explícita por Super Admin
    const adminReactivateRes = await fetch(`${BASE_URL}/api/admin/clubs/${club2.id}/memberships/${userClubAdmin.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdSuperAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "active", role: "player" }),
    });
    if (!adminReactivateRes.ok) {
      throw new Error(`FALLO H4: Administrador no pudo reactivar membresía explícitamente: ${adminReactivateRes.status}`);
    }
    console.log("✓ Correcto: La reactivación requirió autorización administrativa explícita\n");

    // =========================================================================
    // HALLAZGO 5: ERRORES AL CARGAR PERMISOS
    // =========================================================================
    console.log("--- TEST HALLAZGO 5: Errores al Cargar Permisos ---");
    // Crear una sesión temporal para un usuario fantasma inexistente en BD
    const phantomSessionId = crypto.randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({
      sid: phantomSessionId,
      sess: {
        user: {
          id: "phantom-user-not-in-db",
          email: "phantom@example.com",
          clubId: club1.id,
          isAdmin: 1, // intento de usar roles guardados obsoletos
          isClubAdmin: 1,
        },
        activeClubId: club1.id,
        access_token: phantomSessionId,
      } as any,
      expire,
    });

    // Intentar acceder a ruta protegida con la sesión fantasma
    const phantomReqRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${phantomSessionId}` },
    });
    if (phantomReqRes.status !== 401 && phantomReqRes.status !== 403 && phantomReqRes.status !== 503) {
      throw new Error(`FALLO H5: Solicitud con cuenta no validada debió ser rechazada, obtenido: ${phantomReqRes.status}`);
    }

    // Verificar que la sesión en base de datos haya sido purgada de roles obsoletos y activeClubId
    const [updatedPhantomSession] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.sid, phantomSessionId))
      .limit(1);

    const sessData = updatedPhantomSession?.sess as any;
    if (sessData?.activeClubId != null || sessData?.user?.isAdmin === 1) {
      throw new Error("FALLO H5: La sesión no eliminó los roles obsoletos ni el activeClubId tras error de validación");
    }
    console.log("✓ Correcto: Cuenta no validada fue rechazada y la sesión purgó permisos y activeClubId obsoletos\n");

    // Limpiar sesión fantasma
    await db.delete(sessionsTable).where(eq(sessionsTable.sid, phantomSessionId)).catch(() => {});

    // =========================================================================
    // HALLAZGO 6: HISTORIAL ELO
    // =========================================================================
    console.log("--- TEST HALLAZGO 6: Historial ELO ---");
    // Insertar registros ELO de prueba para testPlayerIdClub1 y testPlayerIdClub2
    await db.insert(eloHistoryTable).values([
      {
        playerId: testPlayerIdClub1,
        matchId: match1.id,
        sportId: 1,
        eloBefore: 1500,
        eloAfter: 1515,
        eloChange: 15,
      },
      {
        playerId: testPlayerIdClub2,
        matchId: match2.id,
        sportId: 1,
        eloBefore: 1500,
        eloAfter: 1485,
        eloChange: -15,
      },
    ]);

    // A) Petición sin autenticación -> 401
    const unauthEloRes = await fetch(`${BASE_URL}/api/players/${testPlayerIdClub1}/elo-history`);
    if (unauthEloRes.status !== 401) {
      throw new Error(`FALLO H6: GET /players/:id/elo-history sin autenticación debió retornar 401, obtenido: ${unauthEloRes.status}`);
    }
    console.log("✓ Correcto: GET /players/:id/elo-history sin autenticación retorna 401");

    // B) Petición cross-club: Usuario activo en Club 1 (userClubAdmin) intenta ver ELO de testPlayerIdClub2 (Club 2) -> 403
    const crossClubEloRes = await fetch(`${BASE_URL}/api/players/${testPlayerIdClub2}/elo-history`, {
      headers: { Authorization: `Bearer ${sessionIdClubAdmin}` }, // activo en Club 1
    });
    if (crossClubEloRes.status !== 403) {
      throw new Error(`FALLO H6: Acceso cross-club al historial ELO debió retornar 403, obtenido: ${crossClubEloRes.status}`);
    }
    console.log("✓ Correcto: Acceso cross-club al historial ELO es rechazado con 403 Forbidden");

    // C) Petición mismo club: Usuario activo en Club 1 consulta ELO de testPlayerIdClub1 -> 200
    const sameClubEloRes = await fetch(`${BASE_URL}/api/players/${testPlayerIdClub1}/elo-history`, {
      headers: { Authorization: `Bearer ${sessionIdClubAdmin}` },
    });
    if (!sameClubEloRes.ok) {
      throw new Error(`FALLO H6: Consulta de historial ELO en el mismo club falló con status: ${sameClubEloRes.status}`);
    }
    const eloData = await sameClubEloRes.json();
    if (!Array.isArray(eloData) || eloData.length === 0) {
      throw new Error("FALLO H6: Se esperaba arreglo de historial ELO");
    }
    console.log(`✓ Correcto: Consulta de historial ELO del mismo club retornó ${eloData.length} registros (200 OK)`);

    // D) Super Admin global puede consultar historial ELO de cualquier club
    const superAdminEloRes = await fetch(`${BASE_URL}/api/players/${testPlayerIdClub2}/elo-history`, {
      headers: { Authorization: `Bearer ${sessionIdSuperAdmin}` },
    });
    if (!superAdminEloRes.ok) {
      throw new Error(`FALLO H6: Super Admin global debió poder consultar historial ELO: ${superAdminEloRes.status}`);
    }
    console.log("✓ Correcto: Super Admin global puede consultar historial ELO entre clubes");

    // E) Usuario sin club activo intenta consultar historial ELO -> 403 Forbidden
    const userNoClubId = `test-noclub-${Date.now()}`;
    await db.insert(usersTable).values({
      id: userNoClubId,
      email: `test-noclub-${Date.now()}@example.com`,
      name: "Usuario Sin Club",
      firstName: "Sin",
      lastName: "Club",
      clubId: null,
      isAdmin: 0,
      isClubAdmin: 0,
    });
    const noClubSid = crypto.randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({
      sid: noClubSid,
      sess: {
        user: {
          id: userNoClubId,
          email: "noclub@example.com",
          name: "Sin Club",
          clubId: null,
        },
        activeClubId: null,
        access_token: noClubSid,
      } as any,
      expire,
    });
    const noClubEloRes = await fetch(`${BASE_URL}/api/players/${testPlayerIdClub1}/elo-history`, {
      headers: { Authorization: `Bearer ${noClubSid}` },
    });
    await db.delete(sessionsTable).where(eq(sessionsTable.sid, noClubSid)).catch(() => {});
    await db.delete(usersTable).where(eq(usersTable.id, userNoClubId)).catch(() => {});
    if (noClubEloRes.status !== 403) {
      throw new Error(`FALLO H6: Usuario sin club activo debió ser rechazado con 403 en ELO history, obtenido: ${noClubEloRes.status}`);
    }
    console.log("✓ Correcto: Consulta de historial ELO sin club activo es rechazada con 403 Forbidden");

    // F) Jugador con clubId nulo -> Rechazado con 403 para usuarios no Super Admin
    const [playerWithNullClub] = await db
      .insert(playersTable)
      .values({
        name: `Jugador Sin Club ${Date.now()}`,
        clubId: null,
        elo: 1500,
        active: true,
      })
      .returning();
    const nullClubPlayerEloRes = await fetch(`${BASE_URL}/api/players/${playerWithNullClub.id}/elo-history`, {
      headers: { Authorization: `Bearer ${sessionIdClubAdmin}` },
    });
    await db.delete(playersTable).where(eq(playersTable.id, playerWithNullClub.id)).catch(() => {});
    if (nullClubPlayerEloRes.status !== 403) {
      throw new Error(`FALLO H6: Consulta de historial ELO de jugador con clubId nulo debió ser rechazada con 403, obtenido: ${nullClubPlayerEloRes.status}`);
    }
    console.log("✓ Correcto: Consulta de historial ELO de jugador con clubId nulo es rechazada con 403 Forbidden\n");

    // =========================================================================
    // HALLAZGO 7: ENDPOINT ADMINISTRATIVO DE MEMBRESÍAS
    // =========================================================================
    console.log("--- TEST HALLAZGO 7: Endpoint Administrativo de Membresías ---");
    // A) Club Admin de Club 1 intenta modificar membresía en Club 2 -> 403 Forbidden
    const crossClubAdminRes = await fetch(`${BASE_URL}/api/admin/clubs/${club2.id}/memberships/${userRegularPlayer.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "club_admin" }),
    });
    if (crossClubAdminRes.status !== 403) {
      throw new Error(`FALLO H7: Club Admin de Club 1 no debe gestionar membresías en Club 2. Status: ${crossClubAdminRes.status}`);
    }
    console.log("✓ Correcto: Club Admin no puede gestionar membresías de otro club (403 Forbidden)");

    // B) Intento de asignar rol no permitido (ej. 'superadmin' o 'admin') -> 400 Bad Request
    const invalidRoleRes = await fetch(`${BASE_URL}/api/admin/clubs/${club1.id}/memberships/${userRegularPlayer.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "superadmin" }),
    });
    if (invalidRoleRes.status !== 400) {
      throw new Error(`FALLO H7: Intento de asignar rol no permitido debió retornar 400, obtenido: ${invalidRoleRes.status}`);
    }
    console.log("✓ Correcto: Intento de asignar rol no permitido fue rechazado con 400 Bad Request");

    // C) Intento de vincular ficha de otro club en la membresía mediante endpoint administrativo -> 400 Bad Request
    const invalidPlayerClubRes = await fetch(`${BASE_URL}/api/admin/clubs/${club1.id}/memberships/${userRegularPlayer.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playerId: testPlayerIdClub2 }), // ficha de Club 2 en Club 1
    });
    if (invalidPlayerClubRes.status !== 400) {
      throw new Error(`FALLO H7: Vincular ficha de club ajeno vía endpoint administrativo debió retornar 400, obtenido: ${invalidPlayerClubRes.status}`);
    }
    console.log("✓ Correcto: Asignación de ficha de club ajeno rechazada con 400 Bad Request");

    // D) Modificación válida dentro del club permitido por Club Admin -> 200 OK
    const validClubAdminModRes = await fetch(`${BASE_URL}/api/admin/clubs/${club1.id}/memberships/${userRegularPlayer.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionIdClubAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "club_admin" }),
    });
    if (!validClubAdminModRes.ok) {
      throw new Error(`FALLO H7: Modificación válida de membresía por Club Admin falló: ${validClubAdminModRes.status}`);
    }
    console.log("✓ Correcto: Modificación legítima de rol en el propio club permitida (200 OK)");

    // E) Super Admin puede crear/gestionar membresías en cualquier club
    const superAdminCreateMemRes = await fetch(`${BASE_URL}/api/admin/clubs/${club2.id}/memberships`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionIdSuperAdmin}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userRegularPlayer.id,
        role: "player",
        status: "active",
        playerId: testPlayerIdClub2Unlinked,
      }),
    });
    if (!superAdminCreateMemRes.ok) {
      throw new Error(`FALLO H7: Super Admin debió poder crear membresía en Club 2: ${superAdminCreateMemRes.status}`);
    }
    console.log("✓ Correcto: Super Admin gestionó membresía en cualquier club con validación completa (201 Created)\n");

    console.log("=========================================================================");
    console.log("🎉 TODOS LOS HALLAZGOS DE AISLAMIENTO Y SEGURIDAD FUERON VALIDADAS CON ÉXITO");
    console.log("=========================================================================");
  } finally {
    // -------------------------------------------------------------------------
    // Limpieza de datos de prueba
    // -------------------------------------------------------------------------
    console.log("\n🧹 Limpiando datos de prueba...");
    const sessionIdsToDelete = [sessionIdClubAdmin, sessionIdSuperAdmin, sessionIdRegularPlayer].filter(Boolean) as string[];
    for (const sid of sessionIdsToDelete) {
      await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid)).catch(() => {});
    }

    if (testPlayerIdClub1) {
      await db.delete(eloHistoryTable).where(eq(eloHistoryTable.playerId, testPlayerIdClub1)).catch(() => {});
    }
    if (testPlayerIdClub2) {
      await db.delete(eloHistoryTable).where(eq(eloHistoryTable.playerId, testPlayerIdClub2)).catch(() => {});
    }

    if (testMatchEncuentro1) {
      await db.delete(matchesTable).where(eq(matchesTable.id, testMatchEncuentro1)).catch(() => {});
    }
    if (testMatchEncuentro2) {
      await db.delete(matchesTable).where(eq(matchesTable.id, testMatchEncuentro2)).catch(() => {});
    }

    if (testEncuentroClub1) {
      await db.delete(encuentrosTable).where(eq(encuentrosTable.id, testEncuentroClub1)).catch(() => {});
    }
    if (testEncuentroClub2) {
      await db.delete(encuentrosTable).where(eq(encuentrosTable.id, testEncuentroClub2)).catch(() => {});
    }

    const userIdsToDelete = [testUserId, superAdminUserId, regularPlayerUserId, otherUserId];
    for (const uid of userIdsToDelete) {
      await db.delete(membershipsTable).where(eq(membershipsTable.userId, uid)).catch(() => {});
      await db.delete(usersTable).where(eq(usersTable.id, uid)).catch(() => {});
    }

    if (testPlayerIdClub1) {
      await db.delete(playersTable).where(eq(playersTable.id, testPlayerIdClub1)).catch(() => {});
    }
    if (testPlayerIdClub2) {
      await db.delete(playersTable).where(eq(playersTable.id, testPlayerIdClub2)).catch(() => {});
    }
    if (testPlayerIdClub2Unlinked) {
      await db.delete(playersTable).where(eq(playersTable.id, testPlayerIdClub2Unlinked)).catch(() => {});
    }
    if (testCreatedPlayerIdClub1) {
      await db.delete(playersTable).where(eq(playersTable.id, testCreatedPlayerIdClub1)).catch(() => {});
    }
    console.log("✓ Limpieza completada exitosamente.");
  }
}

runTests().catch((err) => {
  console.error("❌ Error en pruebas multi-club:", err);
  process.exit(1);
});
