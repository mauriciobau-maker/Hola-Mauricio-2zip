import { db } from "../lib/db/src/index";
import {
  usersTable,
  clubsTable,
  playersTable,
  membershipsTable,
  sessionsTable,
  encuentrosTable,
} from "../lib/db/src/schema/index";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("🚀 Iniciando suite de pruebas de aislamiento multi-club y roles...");

  let testUserId = `test-user-${Date.now()}`;
  let otherUserId = `test-other-${Date.now()}`;
  let testPlayerIdClub2: number | null = null;
  let testCreatedPlayerIdClub1: number | null = null;
  let sessionId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Verificar existencia de clubes
    // -------------------------------------------------------------------------
    const clubs = await db.select().from(clubsTable).limit(5);
    if (clubs.length < 3) {
      throw new Error(`Se requieren al menos 3 clubes para la prueba. Encontrados: ${clubs.length}`);
    }
    const [club1, club2, club3] = clubs;
    console.log(`✓ Clubes verificados: Club 1 (ID: ${club1.id}, ${club1.name}), Club 2 (ID: ${club2.id}, ${club2.name}), Club 3 (ID: ${club3.id}, ${club3.name})`);

    // -------------------------------------------------------------------------
    // 2. Crear jugador de prueba en Club 2
    // -------------------------------------------------------------------------
    const [playerClub2] = await db
      .insert(playersTable)
      .values({
        name: `Jugador Test Club 2 ${Date.now()}`,
        clubId: club2.id,
        elo: 1500,
        active: true,
      })
      .returning();
    testPlayerIdClub2 = playerClub2.id;
    console.log(`✓ Creado jugador de prueba en Club 2 (ID: ${testPlayerIdClub2})`);

    // -------------------------------------------------------------------------
    // 3. Crear usuario multi-club
    // -------------------------------------------------------------------------
    const [user] = await db
      .insert(usersTable)
      .values({
        id: testUserId,
        email: `test-multiclub-${Date.now()}@example.com`,
        name: "Usuario Multi Club",
        firstName: "Multi",
        lastName: "Club",
        clubId: club1.id,
        isClubAdmin: 1,
      })
      .returning();
    console.log(`✓ Creado usuario de prueba (ID: ${user.id})`);

    // -------------------------------------------------------------------------
    // 4. Crear membresías: Admin en Club 1, Jugador en Club 2
    // -------------------------------------------------------------------------
    const [mem1] = await db
      .insert(membershipsTable)
      .values({
        userId: user.id,
        clubId: club1.id,
        role: "club_admin",
        status: "active",
      })
      .returning();

    const [mem2] = await db
      .insert(membershipsTable)
      .values({
        userId: user.id,
        clubId: club2.id,
        role: "player",
        playerId: testPlayerIdClub2,
        status: "active",
      })
      .returning();
    console.log(`✓ Creadas membresías: Admin en Club 1 (ID: ${mem1.id}), Jugador en Club 2 (ID: ${mem2.id})`);

    // -------------------------------------------------------------------------
    // 5. Demostrar restricción UNIQUE (user_id, club_id)
    // -------------------------------------------------------------------------
    let duplicateUserClubBlocked = false;
    try {
      await db.insert(membershipsTable).values({
        userId: user.id,
        clubId: club1.id,
        role: "player",
        status: "active",
      });
    } catch {
      duplicateUserClubBlocked = true;
    }
    if (!duplicateUserClubBlocked) {
      throw new Error("FALLO: La restricción UNIQUE (userId, clubId) no bloqueó la membresía duplicada");
    }
    console.log("✓ Restricción UNIQUE (userId, clubId) previno membresía duplicada exitosamente");

    // -------------------------------------------------------------------------
    // 6. Demostrar que una ficha de jugador NO puede ser reclamada por otra cuenta
    // -------------------------------------------------------------------------
    const [otherUser] = await db
      .insert(usersTable)
      .values({
        id: otherUserId,
        email: `test-other-${Date.now()}@example.com`,
        name: "Otro Usuario",
        clubId: club2.id,
      })
      .returning();

    let stolenPlayerBlocked = false;
    try {
      await db.insert(membershipsTable).values({
        userId: otherUser.id,
        clubId: club2.id,
        role: "player",
        playerId: testPlayerIdClub2,
        status: "active",
      });
    } catch {
      stolenPlayerBlocked = true;
    }
    if (!stolenPlayerBlocked) {
      throw new Error("FALLO: La restricción UNIQUE (clubId, playerId) permitió reclamar una ficha ya asignada");
    }
    console.log("✓ Restricción UNIQUE (clubId, playerId) bloqueó vincular ficha ya asignada a otra cuenta");

    // -------------------------------------------------------------------------
    // 7. Crear sesión activa para el usuario en Club 1
    // -------------------------------------------------------------------------
    sessionId = crypto.randomBytes(32).toString("hex");
    const expire = new Date(Date.now() + 86400 * 1000);
    await db.insert(sessionsTable).values({
      sid: sessionId,
      sess: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          clubId: club1.id,
        },
        activeClubId: club1.id,
        access_token: sessionId,
      } as any,
      expire,
    });
    console.log("✓ Sesión creada para el usuario en Club 1");

    // -------------------------------------------------------------------------
    // 8. Test HTTP GET /api/auth/user en contexto Club 1
    // -------------------------------------------------------------------------
    const meRes1 = await fetch(`${BASE_URL}/api/auth/user`, {
      headers: { Authorization: `Bearer ${sessionId}` },
    });
    if (!meRes1.ok) {
      throw new Error(`GET /api/auth/user falló: ${meRes1.status} ${await meRes1.text()}`);
    }
    const meData1 = await meRes1.json();
    if (meData1.user.clubId !== club1.id) {
      throw new Error(`Esperaba clubId=${club1.id}, obtenido ${meData1.user.clubId}`);
    }
    if (meData1.user.role !== "club_admin" || meData1.user.isClubAdmin !== 1) {
      throw new Error(`Esperaba rol club_admin y isClubAdmin=1 en Club 1, obtenido: role=${meData1.user.role}, isClubAdmin=${meData1.user.isClubAdmin}`);
    }
    console.log(`✓ Contexto Club 1 hidratado: role=${meData1.user.role}, isClubAdmin=${meData1.user.isClubAdmin}, clubId=${meData1.user.clubId}`);

    // -------------------------------------------------------------------------
    // 9. Operación administrativa en Club 1 (éxito esperado)
    // -------------------------------------------------------------------------
    const createPlayerRes = await fetch(`${BASE_URL}/api/players`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionId}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Jugador Creado Admin Club 1 ${Date.now()}`,
      }),
    });
    if (!createPlayerRes.ok) {
      throw new Error(`POST /api/players como admin de Club 1 falló: ${createPlayerRes.status} ${await createPlayerRes.text()}`);
    }
    const createdPlayer = await createPlayerRes.json();
    testCreatedPlayerIdClub1 = createdPlayer.id;
    if (createdPlayer.clubId !== club1.id) {
      throw new Error(`El jugador debió ser asignado estrictamente a Club 1 (${club1.id}), se obtuvo: ${createdPlayer.clubId}`);
    }
    console.log(`✓ Como Admin de Club 1, registró jugador exitosamente en Club 1 (ID: ${createdPlayer.id})`);

    // -------------------------------------------------------------------------
    // 10. Cambiar contexto a Club 2 mediante POST /api/auth/switch-club
    // -------------------------------------------------------------------------
    const switchRes = await fetch(`${BASE_URL}/api/auth/switch-club`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionId}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clubId: club2.id }),
    });
    if (!switchRes.ok) {
      throw new Error(`POST /api/auth/switch-club falló: ${switchRes.status} ${await switchRes.text()}`);
    }
    const switchData = await switchRes.json();
    if (switchData.user.clubId !== club2.id) {
      throw new Error(`Esperaba clubId=${club2.id} tras switch, obtenido: ${switchData.user.clubId}`);
    }
    if (switchData.user.role !== "player" || switchData.user.isClubAdmin !== 0) {
      throw new Error(`En Club 2 debía ser rol player y isClubAdmin=0, obtenido: role=${switchData.user.role}, isClubAdmin=${switchData.user.isClubAdmin}`);
    }
    if (switchData.user.playerId !== testPlayerIdClub2) {
      throw new Error(`En Club 2 debía tener playerId=${testPlayerIdClub2}, obtenido: ${switchData.user.playerId}`);
    }
    console.log(`✓ Cambio a Club 2 exitoso: role=${switchData.user.role}, isClubAdmin=${switchData.user.isClubAdmin}, playerId=${switchData.user.playerId}`);

    // -------------------------------------------------------------------------
    // 11. Intentar operación administrativa en Club 2 (debe ser RECHAZADA 403)
    // -------------------------------------------------------------------------
    const adminActionInClub2Res = await fetch(`${BASE_URL}/api/players`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionId}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Intento Ilegal Admin en Club 2 ${Date.now()}`,
      }),
    });
    if (adminActionInClub2Res.status !== 403) {
      throw new Error(`Esperaba 403 Forbidden al crear jugador en Club 2 (donde es rol player), pero se obtuvo status ${adminActionInClub2Res.status}`);
    }
    console.log("✓ Bloqueada acción administrativa en Club 2 con 403 Forbidden (el usuario es solo jugador en Club 2)");

    // -------------------------------------------------------------------------
    // 12. Intentar cambiar o acceder a Club 3 (donde NO tiene membresía -> 403)
    // -------------------------------------------------------------------------
    const switchClub3Res = await fetch(`${BASE_URL}/api/auth/switch-club`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionId}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clubId: club3.id }),
    });
    if (switchClub3Res.status !== 403) {
      throw new Error(`Esperaba 403 Forbidden al cambiar a Club 3 (sin membresía), pero se obtuvo status ${switchClub3Res.status}`);
    }
    console.log("✓ Bloqueado cambio a Club 3 con 403 Forbidden (cuenta sin membresía en Club 3)");

    // -------------------------------------------------------------------------
    // 13. Intentar crear encuentro en Club 3 (debe fallar o aislarse al club de la sesión)
    // -------------------------------------------------------------------------
    const createEncuentroClub3Res = await fetch(`${BASE_URL}/api/encuentros`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionId}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Encuentro no autorizado",
        dateTime: new Date().toISOString(),
        clubId: club3.id, // Intento de inyectar clubId externo
      }),
    });
    if (createEncuentroClub3Res.ok) {
      const encData = await createEncuentroClub3Res.json();
      if (encData.clubId === club3.id) {
        throw new Error("FALLO DE SEGURIDAD: Se permitió crear un encuentro en Club 3 mediante override de cliente");
      }
      // Limpiar el encuentro creado
      await db.delete(encuentrosTable).where(eq(encuentrosTable.id, encData.id));
      console.log(`✓ Servidor ignoró el clubId externo y aisló el encuentro a la membresía activa (${encData.clubId})`);
    } else {
      console.log(`✓ Servidor rechazó la creación de encuentro en club ajeno (status ${createEncuentroClub3Res.status})`);
    }

    console.log("\n=======================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE AISLAMIENTO MULTI-CLUB PASARON");
    console.log("=======================================================");
  } finally {
    // -------------------------------------------------------------------------
    // Limpieza de datos de prueba
    // -------------------------------------------------------------------------
    console.log("\n🧹 Limpiando datos de prueba...");
    if (sessionId) {
      await db.delete(sessionsTable).where(eq(sessionsTable.sid, sessionId)).catch(() => {});
    }
    if (testUserId) {
      await db.delete(membershipsTable).where(eq(membershipsTable.userId, testUserId)).catch(() => {});
      await db.delete(usersTable).where(eq(usersTable.id, testUserId)).catch(() => {});
    }
    if (otherUserId) {
      await db.delete(membershipsTable).where(eq(membershipsTable.userId, otherUserId)).catch(() => {});
      await db.delete(usersTable).where(eq(usersTable.id, otherUserId)).catch(() => {});
    }
    if (testPlayerIdClub2) {
      await db.delete(playersTable).where(eq(playersTable.id, testPlayerIdClub2)).catch(() => {});
    }
    if (testCreatedPlayerIdClub1) {
      await db.delete(playersTable).where(eq(playersTable.id, testCreatedPlayerIdClub1)).catch(() => {});
    }
    console.log("✓ Datos de prueba limpiados correctamente.");
  }
}

runTests().catch((err) => {
  console.error("❌ Error en pruebas multi-club:", err);
  process.exit(1);
});
