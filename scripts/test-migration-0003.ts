import { db } from "../lib/db/src/index";
import {
  usersTable,
  clubsTable,
  playersTable,
  membershipsTable,
} from "../lib/db/src/schema/index";
import { eq, and, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function testMigration0003() {
  console.log("🧪 Iniciando prueba de la migración incremental e idempotente 0003...\n");

  const testUserId1 = `mig-user-1-${Date.now()}`;
  const testUserId2 = `mig-user-2-${Date.now()}`;
  let pClub1Id: number | null = null;
  let pClub2Id: number | null = null;

  try {
    // 1. Obtener dos clubes
    const clubs = await db.select().from(clubsTable).limit(2);
    if (clubs.length < 2) {
      throw new Error("Se requieren al menos 2 clubes");
    }
    const [club1, club2] = clubs;

    // 2. Crear un jugador en Club 1 y otro en Club 2
    const [p1] = await db
      .insert(playersTable)
      .values({
        name: `Jugador Migracion Club 1 ${Date.now()}`,
        clubId: club1.id,
        elo: 1500,
        active: true,
      })
      .returning();
    pClub1Id = p1.id;

    const [p2] = await db
      .insert(playersTable)
      .values({
        name: `Jugador Migracion Club 2 ${Date.now()}`,
        clubId: club2.id,
        elo: 1500,
        active: true,
      })
      .returning();
    pClub2Id = p2.id;

    console.log(`✓ Jugadores creados: P1 en Club ${club1.id} (ID: ${pClub1Id}), P2 en Club ${club2.id} (ID: ${pClub2Id})`);

    // 3. Crear usuarios de prueba simulando datos preexistentes de bases donde 0002 ya se ejecutó
    await db.insert(usersTable).values([
      {
        id: testUserId1,
        email: `mig1-${Date.now()}@test.com`,
        name: "Usuario Migración 1",
        clubId: club1.id,
        playerId: pClub2Id, // Simula inconsistencia antigua en usersTable: usuario en Club 1 con ficha de Club 2
      },
      {
        id: testUserId2,
        email: `mig2-${Date.now()}@test.com`,
        name: "Usuario Migración 2",
        clubId: club2.id,
        playerId: pClub2Id,
      },
    ]);

    // Insertar membresías con inconsistencias heredadas de la ejecución original de 0002
    // A) Membresía en Club 1 pero con player_id apuntando a pClub2Id (de Club 2) y rol antiguo 'admin'
    await db.execute(sql`
      INSERT INTO "memberships" ("user_id", "club_id", "role", "player_id", "status")
      VALUES (${testUserId1}, ${club1.id}, 'admin', ${pClub2Id}, 'active')
    `);

    // B) Membresía con rol antiguo 'colaborador'
    await db.execute(sql`
      INSERT INTO "memberships" ("user_id", "club_id", "role", "player_id", "status")
      VALUES (${testUserId2}, ${club2.id}, 'colaborador', ${pClub2Id}, 'active')
    `);

    console.log("✓ Inconsistencias heredadas inyectadas en base de prueba (ficha cruzada y roles heredados 'admin'/'colaborador')");

    // 4. Leer y ejecutar el archivo de migración 0003
    const migrationSqlPath = path.resolve(process.cwd(), "lib/db/migrations/0003_fix_membership_player_club_isolation.sql");
    const migrationSql = fs.readFileSync(migrationSqlPath, "utf-8");

    console.log("⏳ Ejecutando migración 0003 sobre la base...");
    await db.execute(sql.raw(migrationSql));
    console.log("✓ Migración 0003 ejecutada exitosamente por primera vez");

    // 5. Verificar los resultados tras la migración
    // A) Verificar que el jugador de Club 2 NO fue reasignado de club (su clubId debe seguir siendo club2.id)
    const [p2After] = await db.select().from(playersTable).where(eq(playersTable.id, pClub2Id)).limit(1);
    if (p2After.clubId !== club2.id) {
      throw new Error(`FALLO: El jugador fue reasignado entre clubes. Esperaba ${club2.id}, obtenido: ${p2After.clubId}`);
    }
    console.log(`✓ Verificación exitosa: La ficha de jugador NO fue reasignada entre clubes (clubId=${p2After.clubId})`);

    // B) Verificar que en la membresía de Club 1 la ficha cruzada fue desconectada (player_id = NULL)
    const [mem1After] = await db
      .select()
      .from(membershipsTable)
      .where(and(eq(membershipsTable.userId, testUserId1), eq(membershipsTable.clubId, club1.id)))
      .limit(1);

    if (mem1After.playerId !== null) {
      throw new Error(`FALLO: La ficha cruzada no fue desvinculada en la membresía. Se obtuvo playerId=${mem1After.playerId}`);
    }
    if (mem1After.role !== "club_admin") {
      throw new Error(`FALLO: El rol 'admin' debió ser normalizado a 'club_admin'. Se obtuvo: ${mem1After.role}`);
    }
    console.log("✓ Verificación exitosa: Ficha cruzada desvinculada (playerId=NULL) y rol normalizado a 'club_admin'");

    // C) Verificar que en usersTable la referencia cruzada fue desvinculada
    const [user1After] = await db.select().from(usersTable).where(eq(usersTable.id, testUserId1)).limit(1);
    if (user1After.playerId !== null) {
      throw new Error(`FALLO: La referencia cruzada en usersTable no fue limpiada. Se obtuvo playerId=${user1After.playerId}`);
    }
    console.log("✓ Verificación exitosa: usersTable.playerId cruzado fue desvinculado a NULL");

    // D) Verificar que la membresía 2 con rol 'colaborador' se normalizó a 'club_admin' y conservó su ficha legítima
    const [mem2After] = await db
      .select()
      .from(membershipsTable)
      .where(and(eq(membershipsTable.userId, testUserId2), eq(membershipsTable.clubId, club2.id)))
      .limit(1);

    if (mem2After.role !== "club_admin") {
      throw new Error(`FALLO: Rol 'colaborador' debió normalizarse a 'club_admin'. Se obtuvo: ${mem2After.role}`);
    }
    if (mem2After.playerId !== pClub2Id) {
      throw new Error(`FALLO: La ficha legítima del mismo club debió conservarse. Esperaba: ${pClub2Id}, obtenido: ${mem2After.playerId}`);
    }
    console.log("✓ Verificación exitosa: Rol 'colaborador' normalizado a 'club_admin' y ficha legítima conservada");

    // 6. Prueba de Idempotencia: Ejecutar la migración por segunda vez
    console.log("⏳ Verificando idempotencia: Ejecutando migración 0003 por segunda vez...");
    await db.execute(sql.raw(migrationSql));
    console.log("✓ Segunda ejecución completada sin errores");

    // Verificar que el estado se mantiene exactamente igual
    const [mem1Second] = await db
      .select()
      .from(membershipsTable)
      .where(and(eq(membershipsTable.userId, testUserId1), eq(membershipsTable.clubId, club1.id)))
      .limit(1);
    if (mem1Second.playerId !== null || mem1Second.role !== "club_admin") {
      throw new Error("FALLO DE IDEMPOTENCIA: La segunda ejecución alteró los datos validados");
    }
    console.log("✓ Idempotencia confirmada: La base de datos mantiene el estado exacto sin duplicaciones ni mutaciones indeseadas\n");

    console.log("=========================================================================");
    console.log("🎉 PRUEBA DE MIGRACIÓN 0003 COMPLETADA CON ÉXITO");
    console.log("=========================================================================");
  } finally {
    // Limpieza
    console.log("\n🧹 Limpiando datos de prueba de migración...");
    await db.delete(membershipsTable).where(eq(membershipsTable.userId, testUserId1)).catch(() => {});
    await db.delete(membershipsTable).where(eq(membershipsTable.userId, testUserId2)).catch(() => {});
    await db.delete(usersTable).where(eq(usersTable.id, testUserId1)).catch(() => {});
    await db.delete(usersTable).where(eq(usersTable.id, testUserId2)).catch(() => {});
    if (pClub1Id) await db.delete(playersTable).where(eq(playersTable.id, pClub1Id)).catch(() => {});
    if (pClub2Id) await db.delete(playersTable).where(eq(playersTable.id, pClub2Id)).catch(() => {});
    console.log("✓ Limpieza finalizada.");
  }
}

testMigration0003().catch((err) => {
  console.error("❌ Error en prueba de migración 0003:", err);
  process.exit(1);
});
