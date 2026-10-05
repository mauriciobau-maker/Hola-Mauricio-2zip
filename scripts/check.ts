import { db } from "../lib/db/src/index";
import { sportsTable } from "../lib/db/src/schema/index";

async function check() {
  const allSports = await db.select().from(sportsTable);
  console.log("📊 Deportes encontrados en la BD:", allSports);
}

check();