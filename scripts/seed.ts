import { db } from "../lib/db/src/index"; 
import {
  clubsTable,
  playersTable,
  membershipsTable,
  sportsTable,
  matchesTable,
  encuentrosTable,
} from "../lib/db/src/schema/index";

async function seed() {
  console.log("🌱 Iniciando el proceso de seed...");

  // 1. Insertar Deporte Base
  // .onConflictDoNothing() evita el error si el slug 'padel' ya existe
  const result = await db.insert(sportsTable).values({
    name: "Padel",
    slug: "padel",
  }).onConflictDoNothing().returning();

  // Obtenemos el deporte, ya sea el recién creado o el que ya existía
  let sport = result[0];
  if (!sport) {
    // Si no se creó (porque ya existía), lo buscamos
    const existing = await db.query.sportsTable.findFirst({
        where: (table, { eq }) => eq(table.slug, "padel")
    });
    if (existing) sport = existing;
  }

  if (sport) console.log("✅ Deporte cargado:", sport.name);

  // 2. Insertar Club
  const [club] = await db.insert(clubsTable).values({
    name: "Club Padel Pro",
    slug: "club-padel-pro",
    plan: "premium",
  }).onConflictDoNothing().returning();

  // (Si el club ya existía, lo buscamos igual que con el deporte)
  const clubToUse = club || await db.query.clubsTable.findFirst({
      where: (table, { eq }) => eq(table.slug, "club-padel-pro")
  });

  if (clubToUse) console.log("✅ Club cargado:", clubToUse.name);

  // ... (Resto de tu lógica igual)
  console.log("🎉 ¡Seeding completado con éxito!");
}

seed()
  .catch((e) => {
    console.error("❌ Error en el seeding:", e);
    process.exit(1);
  });