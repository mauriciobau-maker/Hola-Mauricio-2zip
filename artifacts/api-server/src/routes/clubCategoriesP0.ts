import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  clubSportCategoriesTable,
  clubSportsTable,
  sportsTable,
} from "@workspace/db";
import { getCurrentClubId, requireCommunityAccess } from "../middlewares/requireCommunity";

const router: IRouter = Router();

// P0 category boundary: categories are real club configuration, never UI-only data.
router.get("/club/categories", requireCommunityAccess, async (req, res): Promise<void> => {
  const clubId = getCurrentClubId(req);
  if (!clubId) {
    res.status(403).json({ error: "No hay una comunidad activa" });
    return;
  }

  try {
    const categories = await db
      .select({
        id: clubSportCategoriesTable.id,
        clubSportId: clubSportCategoriesTable.clubSportId,
        sportId: sportsTable.id,
        name: clubSportCategoriesTable.name,
      })
      .from(clubSportCategoriesTable)
      .innerJoin(
        clubSportsTable,
        eq(clubSportCategoriesTable.clubSportId, clubSportsTable.id),
      )
      .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
      .where(eq(clubSportsTable.clubId, clubId));

    res.json(categories);
  } catch (error) {
    console.error("Error en GET /club/categories:", error);
    res.status(500).json({ error: "Error interno al obtener categorías" });
  }
});

// Accept sportId from the UI and resolve the community-specific clubSportId server-side.
router.post("/club/categories", requireCommunityAccess, async (req, res): Promise<void> => {
  const clubId = getCurrentClubId(req);
  if (!clubId) {
    res.status(403).json({ error: "No hay una comunidad activa" });
    return;
  }

  const sportId = Number(req.body?.sportId);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (!Number.isInteger(sportId) || sportId <= 0 || !name) {
    res.status(400).json({ error: "Se requiere sportId y name" });
    return;
  }

  try {
    const [clubSport] = await db
      .select({ id: clubSportsTable.id })
      .from(clubSportsTable)
      .where(and(eq(clubSportsTable.clubId, clubId), eq(clubSportsTable.sportId, sportId)))
      .limit(1);

    if (!clubSport) {
      res.status(404).json({ error: "El deporte no está configurado para esta comunidad" });
      return;
    }

    const [created] = await db
      .insert(clubSportCategoriesTable)
      .values({ clubSportId: clubSport.id, name })
      .returning();

    res.status(201).json({
      ...created,
      sportId,
    });
  } catch (error) {
    console.error("Error en POST /club/categories:", error);
    res.status(500).json({ error: "Error interno al crear la categoría" });
  }
});

export default router;
