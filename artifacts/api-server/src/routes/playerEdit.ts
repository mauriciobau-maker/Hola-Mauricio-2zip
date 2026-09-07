import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  playersTable,
  playerCategoriesTable,
  clubSportCategoriesTable,
  clubSportsTable,
} from "@workspace/db";
import { UpdatePlayerParams } from "@workspace/api-zod";
import {
  isClubAdminUser,
  isSuperAdminUser,
  requireCommunityAccess,
} from "../middlewares/requireCommunity";

const router: IRouter = Router();

const PlayerEditBody = z.object({
  name: z.string().min(1).optional(),
  nickname: z.string().nullish(),
  phone: z.string().nullish(),
  waId: z.string().nullish(),
  wspConsent: z.boolean().optional(),
  language: z.enum(["es", "en", "pt"]).optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
});

function formatName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (a) => a.toUpperCase());
}

async function enrichPlayer(player: typeof playersTable.$inferSelect) {
  let categories: Array<{ id: number; clubSportId: number | null; name: string }> = [];
  try {
    categories = await db
      .select({
        id: clubSportCategoriesTable.id,
        clubSportId: clubSportCategoriesTable.clubSportId,
        name: clubSportCategoriesTable.name,
      })
      .from(playerCategoriesTable)
      .innerJoin(
        clubSportCategoriesTable,
        eq(playerCategoriesTable.categoryId, clubSportCategoriesTable.id),
      )
      .where(eq(playerCategoriesTable.playerId, player.id));
  } catch {
    categories = [];
  }

  return {
    id: player.id,
    name: player.name,
    nickname: player.nickname ?? null,
    elo: player.elo,
    phone: player.phone ?? null,
    waId: player.waId ?? null,
    wspConsent: player.wspConsent ?? false,
    language: player.language ?? "es",
    clubId: player.clubId ?? null,
    avatarInitials: player.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
    createdAt: player.createdAt.toISOString(),
    categories,
  };
}

/**
 * Definitive player-edit boundary for personal data and club category assignment.
 * This route is registered before the legacy PATCH in players.ts so the legacy
 * handler cannot silently accept an empty update or confuse Club Admin with
 * Super Admin.
 */
router.patch(
  "/players/:id",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const params = UpdatePlayerParams.safeParse({ id: parseInt(rawId, 10) });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = PlayerEditBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const user = req.user as {
      id?: string;
      playerId?: number | null;
      clubId?: number | null;
      isAdmin?: number | boolean | string | null;
      isClubAdmin?: number | boolean | string | null;
      role?: string | null;
    } | undefined;

    const isSuperAdmin = isSuperAdminUser(user);
    const isClubAdmin = isClubAdminUser(user);
    const isSelf = Number(user?.playerId) === params.data.id;

    if (!isSuperAdmin && !isClubAdmin && !isSelf) {
      res.status(403).json({ error: "No tienes permiso para editar este jugador" });
      return;
    }

    const activeClubId = user?.clubId ?? null;
    const whereClause = activeClubId
      ? and(
          eq(playersTable.id, params.data.id),
          eq(playersTable.clubId, activeClubId),
        )
      : eq(playersTable.id, params.data.id);

    const [currentPlayer] = await db.select().from(playersTable).where(whereClause);
    if (!currentPlayer) {
      res.status(404).json({ error: "Jugador no encontrado" });
      return;
    }

    const data = parsed.data;
    const updates: Record<string, unknown> = {};

    // Club Admin/Super Admin can correct normal identity/profile data.
    // A regular Player can only change their own normal personal data.
    if (data.name !== undefined) {
      if (!isSuperAdmin && !isClubAdmin) {
        res.status(403).json({ error: "El nombre registrado solo puede ser modificado por la administración" });
        return;
      }
      updates.name = formatName(data.name);
    }

    if ("nickname" in data) {
      updates.nickname = data.nickname ? formatName(data.nickname) : null;
    }

    if (data.phone !== undefined) {
      updates.phone = data.phone?.trim() || null;
    }

    if (data.waId !== undefined) {
      updates.waId = data.waId?.trim() || null;
    }

    if (data.wspConsent !== undefined) {
      updates.wspConsent = data.wspConsent;
    }

    if (data.language !== undefined) {
      updates.language = data.language;
    }

    // Category assignment is club administration, not a player self-service action.
    if (data.categoryIds !== undefined && !isSuperAdmin && !isClubAdmin) {
      res.status(403).json({ error: "Las categorías solo pueden ser modificadas por la administración" });
      return;
    }

    const categoryIds = data.categoryIds;
    if (categoryIds !== undefined) {
      if (!currentPlayer.clubId) {
        res.status(400).json({ error: "El jugador no tiene una comunidad válida" });
        return;
      }

      const foundRows = categoryIds.length
        ? await db
            .select({ id: clubSportCategoriesTable.id })
            .from(clubSportCategoriesTable)
            .innerJoin(
              clubSportsTable,
              eq(clubSportCategoriesTable.clubSportId, clubSportsTable.id),
            )
            .where(
              and(
                eq(clubSportsTable.clubId, currentPlayer.clubId),
                inArray(clubSportCategoriesTable.id, categoryIds),
              ),
            )
        : [];

      const foundIds = foundRows.map((row) => row.id);
      const invalidIds = categoryIds.filter((id) => !foundIds.includes(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          error: "Algunas categorías no pertenecen al club del jugador o no existen",
          invalidCategoryIds: invalidIds,
        });
        return;
      }
    }

    if (Object.keys(updates).length === 0 && categoryIds === undefined) {
      res.status(400).json({ error: "No hay cambios válidos para guardar" });
      return;
    }

    const [updatedRecord] = await db
      .update(playersTable)
      .set(updates)
      .where(whereClause)
      .returning();

    if (!updatedRecord) {
      res.status(404).json({ error: "Jugador no encontrado" });
      return;
    }

    if (categoryIds !== undefined) {
      await db
        .delete(playerCategoriesTable)
        .where(eq(playerCategoriesTable.playerId, updatedRecord.id));

      if (categoryIds.length > 0) {
        await db.insert(playerCategoriesTable).values(
          categoryIds.map((categoryId) => ({
            playerId: updatedRecord.id,
            categoryId,
          })),
        );
      }
    }

    res.json(await enrichPlayer(updatedRecord));
  },
);

export default router;
