import { db, sportsTable } from "@workspace/db"; db.select().from(sportsTable).then(res => console.log("📊 Contenido actual de la DB:", res)).catch(console.error);
