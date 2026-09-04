import { Router, type IRouter } from "express";
import { eq, desc, asc, and, inArray } from "drizzle-orm";
import {
  db,
  playersTable,
  matchesTable,
  eloHistoryTable,
  matchPlayersTable,
  playerCategoriesTable,
  clubSportCategoriesTable,
  clubSportsTable,
  clubsTable,
} from "@workspace/db";
import {
  CreatePlayerBody,
  GetPlayerParams,
  UpdatePlayerParams,
  UpdatePlayerBody,
  DeletePlayerParams,
  GetPlayerStatsParams,
} from "@workspace/api-zod";
import {
  isSuperAdminUser,
  requireCommunityAccess,
} from "../middlewares/requireCommunity";

const router: IRouter = Router();

// ============================================================
// HELPERS
// ============================================================

function formatName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(?:^|\s|-)\S/g,
      (a) => a.toUpperCase()
    );
}

/**
 * Enriquece un jugador con sus categorías.
 *
 * Las categorías son opcionales. Si las tablas todavía
 * no están disponibles, el jugador igualmente se devuelve.
 */
async function enrichPlayer(
  player: typeof playersTable.$inferSelect
) {
  let categories: any[] = [];

  try {
    categories = await db
      .select({
        id: clubSportCategoriesTable.id,
        clubSportId:
          clubSportCategoriesTable.clubSportId,
        name:
          clubSportCategoriesTable.name,
      })
      .from(playerCategoriesTable)
      .innerJoin(
        clubSportCategoriesTable,
        eq(
          playerCategoriesTable.categoryId,
          clubSportCategoriesTable.id
        )
      )
      .where(
        eq(
          playerCategoriesTable.playerId,
          player.id
        )
      );
  } catch {
    categories = [];
  }

  return {
    id: player.id,
    name: player.name,
    nickname:
      player.nickname ?? null,
    elo: player.elo,
    phone:
      player.phone ?? null,
    waId:
      player.waId ?? null,
    wspConsent:
      player.wspConsent ?? false,
    language:
      player.language ?? "es",
    clubId:
      player.clubId ?? null,
    avatarInitials:
      player.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    createdAt:
      player.createdAt.toISOString(),
    categories,
  };
}

// ============================================================
// GET /players
// ============================================================

router.get(
  "/players",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const clubId = (
      req.user as {
        clubId?: number | null;
      } | undefined
    )?.clubId;

    const players = clubId
      ? await db
          .select()
          .from(playersTable)
          .where(
            eq(
              playersTable.clubId,
              clubId
            )
          )
          .orderBy(
            playersTable.name
          )
      : await db
          .select()
          .from(playersTable)
          .orderBy(
            playersTable.name
          );

    const enriched =
      await Promise.all(
        players.map(enrichPlayer)
      );

    res.json(enriched);
  }
);

// ============================================================
// POST /players
// ============================================================

router.post(
  "/players",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    try {
      const bodyData =
        req.body?.data
          ? req.body.data
          : req.body;

      const parsed =
        CreatePlayerBody.safeParse(
          bodyData
        );

      if (!parsed.success) {
        res.status(400).json({
          error:
            parsed.error.message,
        });
        return;
      }

      const user = req.user as {
        role?: string;
        clubId?: number | null;
      } | undefined;

      const isSuperAdmin = isSuperAdminUser(user);

      let targetClubId =
        user?.clubId ?? null;

      if (isSuperAdmin) {
        const clubIdInput =
          bodyData.clubId ??
          req.body.clubId;

        const clubCodeInput =
          bodyData.clubCode ??
          req.body.clubCode;

        if (clubIdInput) {
          targetClubId =
            Number(clubIdInput);
        } else if (clubCodeInput) {
          const [
            foundClub,
          ] = await db
            .select()
            .from(clubsTable)
            .where(
              eq(
                clubsTable.slug,
                String(
                  clubCodeInput
                )
                  .trim()
                  .toLowerCase()
              )
            );

          if (foundClub) {
            targetClubId =
              foundClub.id;
          }
        }
      }

      const nameFormatted =
        formatName(
          parsed.data.name
        );

      const nicknameFormatted =
        parsed.data.nickname
          ? formatName(
              parsed.data.nickname
            )
          : null;

      const {
        clubCode,
        categoryIds:
          parsedCategoryIds,
        ...restParsedData
      } =
        parsed.data as Record<
          string,
          any
        >;

      const insertValues: Record<
        string,
        any
      > = {
        name: nameFormatted,
        nickname:
          nicknameFormatted,
        clubId:
          targetClubId,
      };

      if (
        restParsedData.elo !==
        undefined
      ) {
        insertValues.elo =
          restParsedData.elo;
      }

      if (
        restParsedData.phone !==
        undefined
      ) {
        insertValues.phone =
          restParsedData.phone;
      }

      if (
        restParsedData.waId !==
        undefined
      ) {
        insertValues.waId =
          restParsedData.waId;
      }

      if (
        restParsedData.wspConsent !==
        undefined
      ) {
        insertValues.wspConsent =
          restParsedData.wspConsent;
      }

      if (
        restParsedData.language !==
        undefined
      ) {
        insertValues.language =
          restParsedData.language;
      }

      // Extraer categoryIds ANTES de crear el jugador
      const categoryIds =
        (parsedCategoryIds as
          | number[]
          | undefined) ||
        (bodyData.categoryIds as
          | number[]
          | undefined) ||
        (req.body.categoryIds as
          | number[]
          | undefined) ||
        [];

      if (Array.isArray(categoryIds) && categoryIds.length > 0) {
        // Validar formato de IDs
        const requestedIds = categoryIds.map(Number);
        const badFormat = requestedIds.filter(
          (id) => !Number.isInteger(id) || id <= 0
        );

        if (badFormat.length > 0) {
          res.status(400).json({
            error: "categoryIds contiene IDs con formato inválido",
            invalidCategoryIds: badFormat,
          });
          return;
        }

        if (!targetClubId) {
          res.status(400).json({
            error:
              "Club objetivo inválido para validar categorías",
          });
          return;
        }

        // Una sola consulta con IN (...) usando inArray y JOIN clubSportCategories -> clubSports
        const foundRows = await db
          .select({ id: clubSportCategoriesTable.id })
          .from(clubSportCategoriesTable)
          .innerJoin(
            clubSportsTable,
            eq(
              clubSportCategoriesTable.clubSportId,
              clubSportsTable.id
            )
          )
          .where(
            and(
              eq(clubSportsTable.clubId, targetClubId),
              inArray(clubSportCategoriesTable.id, requestedIds)
            )
          );

        const foundIds = foundRows.map((r: any) => r.id);
        const invalidIds = requestedIds.filter((id) => !foundIds.includes(id));

        if (invalidIds.length > 0) {
          res.status(400).json({
            error:
              "Algunas categorías no pertenecen al club objetivo o no existen",
            invalidCategoryIds: invalidIds,
          });
          return;
        }
      }

      // Todas las categoryIds (si las hubo) son válidas — crear jugador
      const [player] =
        await db
          .insert(playersTable)
          .values(insertValues as any)
          .returning();

      // Si había categoryIds y eran válidas, insertar las categorías (una sola inserción)
      if (Array.isArray(categoryIds) && categoryIds.length > 0) {
        await db.insert(playerCategoriesTable).values(
          categoryIds.map((categoryId) => ({
            playerId: player.id,
            categoryId: Number(categoryId),
          }))
        );
      }

      const responseObj =
        await enrichPlayer(
          player
        );

      res
        .status(201)
        .json(responseObj);
    } catch (error: any) {
      console.error(
        "🔥 ERROR DETALLADO AL CREAR JUGADOR:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Error interno al crear el jugador",
      });
    }
  }
);

// ============================================================
// GET /players/:id
// ============================================================

router.get(
  "/players/:id",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const raw =
      Array.isArray(
        req.params.id
      )
        ? req.params.id[0]
        : req.params.id;

    const params =
      GetPlayerParams.safeParse({
        id: parseInt(
          raw,
          10
        ),
      });

    if (!params.success) {
      res.status(400).json({
        error:
          params.error.message,
      });
      return;
    }

    const clubId = (
      req.user as {
        clubId?: number | null;
      } | undefined
    )?.clubId;

    const whereClause =
      clubId
        ? and(
            eq(
              playersTable.id,
              params.data.id
            ),
            eq(
              playersTable.clubId,
              clubId
            )
          )
        : eq(
            playersTable.id,
            params.data.id
          );

    const [player] =
      await db
        .select()
        .from(playersTable)
        .where(
          whereClause
        );

    if (!player) {
      res.status(404).json({
        error:
          "Jugador no encontrado",
      });
      return;
    }

    const responseObj =
      await enrichPlayer(
        player
      );

    res.json(responseObj);
  }
);

// ============================================================
// PATCH /players/:id
// ============================================================

router.patch(
  "/players/:id",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const raw =
      Array.isArray(
        req.params.id
      )
        ? req.params.id[0]
        : req.params.id;

    const params =
      UpdatePlayerParams.safeParse({
        id: parseInt(
          raw,
          10
        ),
      });

    if (!params.success) {
      res.status(400).json({
        error:
          params.error.message,
      });
      return;
    }

    const body =
      UpdatePlayerBody.safeParse(
        req.body
      );

    if (!body.success) {
      res.status(400).json({
        error:
          body.error.message,
      });
      return;
    }

    const user = req.user as {
      role?: string;
      playerId?: number;
      clubId?: number | null;
    } | undefined;

    const isAdmin = isSuperAdminUser(user);

    const updates: Record<
      string,
      unknown
    > = {};

    if (isAdmin) {
      if (
        body.data.name !==
          undefined &&
        body.data.name.trim() !==
          ""
      ) {
        updates.name =
          formatName(
            body.data.name
          );
      }

      if (
        "nickname" in
        body.data
      ) {
        updates.nickname =
          body.data.nickname
            ? formatName(
                body.data.nickname
              )
            : null;
      }
    }

    const {
      phone,
      waId,
      wspConsent,
      language,
      categoryIds,
      clubId: requestedClubId,
    } = req.body;

    if (isAdmin && requestedClubId !== undefined) {
      const targetClubId = Number(requestedClubId);

      if (!Number.isInteger(targetClubId) || targetClubId <= 0) {
        res.status(400).json({
          error: "clubId inválido",
        });
        return;
      }

      const [targetClub] = await db
        .select({ id: clubsTable.id })
        .from(clubsTable)
        .where(eq(clubsTable.id, targetClubId));

      if (!targetClub) {
        res.status(400).json({
          error: "El club indicado no existe",
        });
        return;
      }

      updates.clubId = targetClubId;
    }

    if (
      phone !== undefined
    ) {
      updates.phone =
        typeof phone ===
          "string" &&
        phone.trim()
          ? phone.trim()
          : null;
    }

    if (
      waId !== undefined
    ) {
      updates.waId =
        typeof waId ===
          "string" &&
        waId.trim()
          ? waId.trim()
          : null;
    }

    if (
      wspConsent !==
      undefined
    ) {
      updates.wspConsent =
        Boolean(
          wspConsent
        );
    }

    if (
      language !==
        undefined &&
      typeof language ===
        "string"
    ) {
      updates.language =
        language;
    }

    const clubId =
      user?.clubId;

    const whereClause =
      clubId
        ? and(
            eq(
              playersTable.id,
              params.data.id
            ),
            eq(
              playersTable.clubId,
              clubId
            )
          )
        : eq(
            playersTable.id,
            params.data.id
          );

    const [
      updatedRecord,
    ] = await db
      .update(playersTable)
      .set(updates)
      .where(
        whereClause
      )
      .returning();

    if (!updatedRecord) {
      res.status(404).json({
        error:
          "Jugador no encontrado",
      });
      return;
    }

    if (
      Array.isArray(
        categoryIds
      )
    ) {
      // Antes de borrar/insertar, validar que todas las
      // categoryIds pertenezcan al club del jugador (updatedRecord.clubId)
      const targetClubId =
        updatedRecord.clubId;

      if (!targetClubId) {
        res.status(400).json({
          error:
            "Club objetivo inválido para validar categorías",
        });
        return;
      }

      // Validar formato y luego en una sola consulta con inArray
      const requestedIds = categoryIds.map(Number);
      const badFormat = requestedIds.filter(
        (id) => !Number.isInteger(id) || id <= 0
      );

      if (badFormat.length > 0) {
        res.status(400).json({
          error: "categoryIds contiene IDs con formato inválido",
          invalidCategoryIds: badFormat,
        });
        return;
      }

      const foundRows = await db
        .select({ id: clubSportCategoriesTable.id })
        .from(clubSportCategoriesTable)
        .innerJoin(
          clubSportsTable,
          eq(
            clubSportCategoriesTable.clubSportId,
            clubSportsTable.id
          )
        )
        .where(
          and(
            eq(clubSportsTable.clubId, targetClubId),
            inArray(clubSportCategoriesTable.id, requestedIds)
          )
        );

      const foundIds = foundRows.map((r: any) => r.id);
      const invalidIds = requestedIds.filter((id) => !foundIds.includes(id));

      if (invalidIds.length > 0) {
        res.status(400).json({
          error:
            "Algunas categorías no pertenecen al club objetivo o no existen",
          invalidCategoryIds: invalidIds,
        });
        return;
      }

      // Si todas son válidas, conservar comportamiento actual
      await db
        .delete(
          playerCategoriesTable
        )
        .where(
          eq(
            playerCategoriesTable.playerId,
            updatedRecord.id
          )
        );

      if (
        categoryIds.length > 0
      ) {
        await db
          .insert(
            playerCategoriesTable
          )
          .values(
            categoryIds.map(
              (
                categoryId: number
              ) => ({
                playerId:
                  updatedRecord.id,
                categoryId,
              })
            )
          );
      }
    }

    const responseObj =
      await enrichPlayer(
        updatedRecord
      );

    res.json(
      responseObj
    );
  }
);

// ============================================================
// DELETE /players/:id
// ============================================================

router.delete(
  "/players/:id",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const raw =
      Array.isArray(
        req.params.id
      )
        ? req.params.id[0]
        : req.params.id;

    const params =
      DeletePlayerParams.safeParse({
        id: parseInt(
          raw,
          10
        ),
      });

    if (!params.success) {
      res.status(400).json({
        error:
          params.error.message,
      });
      return;
    }

    const user = req.user as {
      clubId?: number | null;
      isAdmin?: number | boolean | null;
      role?: string | null;
    };
    const ownershipClause = isSuperAdminUser(user)
      ? eq(playersTable.id, params.data.id)
      : and(
          eq(playersTable.id, params.data.id),
          eq(playersTable.clubId, user.clubId!),
        );

    const [deleted] = await db
      .delete(playersTable)
      .where(ownershipClause)
      .returning();

    if (!deleted) {
      res.status(404).json({
        error:
          "Jugador no encontrado",
      });
      return;
    }

    res.sendStatus(204);
  }
);

// ============================================================
// GET /players/:id/stats
// ============================================================

router.get(
  "/players/:id/stats",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const raw =
      Array.isArray(
        req.params.id
      )
        ? req.params.id[0]
        : req.params.id;

    const params =
      GetPlayerStatsParams.safeParse({
        id: parseInt(
          raw,
          10
        ),
      });

    if (!params.success) {
      res.status(400).json({
        error:
          params.error.message,
      });
      return;
    }

    const playerId =
      params.data.id;

    const userClubId = (
      req.user as {
        clubId?: number | null;
      } | undefined
    )?.clubId;

    const user = req.user as { clubId?: number | null; isAdmin?: number | boolean | null };
    const [player] =
      await db
        .select()
        .from(playersTable)
        .where(
          isSuperAdminUser(user)
            ? eq(playersTable.id, playerId)
            : and(eq(playersTable.id, playerId), eq(playersTable.clubId, user.clubId!))
        );

    if (!player) {
      res.status(404).json({
        error:
          "Jugador no encontrado",
      });
      return;
    }

    const [
      allMatches,
      allMatchPlayers,
      allPlayersList,
    ] = await Promise.all([
      userClubId
        ? db
            .select()
            .from(matchesTable)
            .where(
              eq(
                matchesTable.clubId,
                userClubId
              )
            )
            .orderBy(
              desc(
                matchesTable.playedAt
              )
            )
        : db
            .select()
            .from(matchesTable)
            .orderBy(
              desc(
                matchesTable.playedAt
              )
            ),

      db
        .select()
        .from(matchPlayersTable),

      db
        .select()
        .from(playersTable),
    ]);

    const mpByMatchId: Record<
      number,
      typeof matchPlayersTable.$inferSelect[]
    > = {};

    for (const mp of allMatchPlayers) {
      if (
        !mpByMatchId[
          mp.matchId
        ]
      ) {
        mpByMatchId[
          mp.matchId
        ] = [];
      }

      mpByMatchId[
        mp.matchId
      ].push(mp);
    }

    /**
     * Solo partidos confirmados.
     */
    const confirmedMatches =
      allMatches.filter(
        (match) => {
          const status =
            (match as any)
              .status ??
            "confirmed";

          return (
            status ===
              "confirmed" &&
            (
              match.result ===
                "team1" ||
              match.result ===
                "team2" ||
              match.result ===
                "draw"
            )
          );
        }
      );

    /**
     * Partidos donde participó
     * el jugador.
     */
    const playerMatches =
      confirmedMatches.filter(
        (match) => {
          const participants =
            mpByMatchId[
              match.id
            ] ?? [];

          return participants.some(
            (mp) =>
              mp.playerId ===
              playerId
          );
        }
      );

    if (
      playerMatches.length ===
      0
    ) {
      res.json({
        playerId,
        playerName:
          player.name,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        points: 0,
        setsWon: 0,
        setsLost: 0,
        currentStreak: 0,
        recentMatches: [],
      });

      return;
    }

    const playerMap: Record<
      number,
      string
    > = {};

    for (const p of allPlayersList) {
      playerMap[p.id] =
        p.name;
    }

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let setsWon = 0;
    let setsLost = 0;

    for (const match of playerMatches) {
      const participants =
        mpByMatchId[
          match.id
        ] ?? [];

      const myEntry =
        participants.find(
          (mp) =>
            mp.playerId ===
            playerId
        );

      if (!myEntry) {
        continue;
      }

      const onTeam1 =
        myEntry.team ===
        "team1";

      if (
        match.result ===
        "draw"
      ) {
        draws++;
      } else {
        const won =
          onTeam1
            ? match.result ===
              "team1"
            : match.result ===
              "team2";

        if (won) {
          wins++;
        } else {
          losses++;
        }
      }

      setsWon += onTeam1
        ? match.team1Score
        : match.team2Score;

      setsLost += onTeam1
        ? match.team2Score
        : match.team1Score;
    }

    const totalMatches =
      wins +
      losses +
      draws;

    const winRate =
      totalMatches > 0
        ? Math.round(
            (wins /
              totalMatches) *
              100
          )
        : 0;

    const points =
      wins * 3 + draws;

    /**
     * Los partidos vienen ordenados
     * del más reciente al más antiguo.
     */
    let currentStreak = 0;

    for (const match of playerMatches) {
      const participants =
        mpByMatchId[
          match.id
        ] ?? [];

      const myEntry =
        participants.find(
          (mp) =>
            mp.playerId ===
            playerId
        );

      if (!myEntry) {
        break;
      }

      const onTeam1 =
        myEntry.team ===
        "team1";

      if (
        match.result ===
        "draw"
      ) {
        break;
      }

      const won =
        onTeam1
          ? match.result ===
            "team1"
          : match.result ===
            "team2";

      if (!won) {
        break;
      }

      currentStreak++;
    }

    /**
     * Últimos 5 partidos.
     */
    const recentMatches =
      playerMatches
        .slice(0, 5)
        .map((match) => {
          const participants =
            mpByMatchId[
              match.id
            ] ?? [];

          const team1Players =
            participants
              .filter(
                (mp) =>
                  mp.team ===
                  "team1"
              )
              .map((mp) => ({
                id: mp.playerId,
                name:
                  playerMap[
                    mp.playerId
                  ] ??
                  "Desconocido",
              }));

          const team2Players =
            participants
              .filter(
                (mp) =>
                  mp.team ===
                  "team2"
              )
              .map((mp) => ({
                id: mp.playerId,
                name:
                  playerMap[
                    mp.playerId
                  ] ??
                  "Desconocido",
              }));

          return {
            id: match.id,

            team1Players,

            team2Players,

            team1Score:
              match.team1Score,

            team2Score:
              match.team2Score,

            result:
              match.result,

            sets:
              match.sets,

            playedAt:
              match.playedAt.toISOString(),

            createdAt:
              match.createdAt.toISOString(),
          };
        });

    res.json({
      playerId,
      playerName:
        player.name,
      totalMatches,
      wins,
      losses,
      draws,
      winRate,
      points,
      setsWon,
      setsLost,
      currentStreak,
      recentMatches,
    });
  }
);

// ============================================================
// GET /players/:id/elo-history
// ============================================================

router.get(
  "/players/:id/elo-history",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const id = parseInt(raw, 10);

    if (isNaN(id)) {
      res.status(400).json({
        error: "ID inválido",
      });
      return;
    }

    const user = req.user as {
      clubId?: number | null;
      isAdmin?: number | boolean | string | null;
      role?: string | null;
    } | undefined;

    const isSuperAdmin = isSuperAdminUser(user);
    const activeClubId = user?.clubId ?? null;

    const [player] = await db
      .select()
      .from(playersTable)
      .where(
        isSuperAdmin || activeClubId == null
          ? eq(playersTable.id, id)
          : and(
              eq(playersTable.id, id),
              eq(playersTable.clubId, activeClubId)
            )
      );

    if (!player) {
      res.status(404).json({
        error: "Jugador no encontrado",
      });
      return;
    }

    const history = await db
      .select({
        h: eloHistoryTable,
        playedAt: matchesTable.playedAt,
      })
      .from(eloHistoryTable)
      .innerJoin(
        matchesTable,
        eq(
          eloHistoryTable.matchId,
          matchesTable.id
        )
      )
      .where(
        isSuperAdmin || activeClubId == null
          ? and(
              eq(eloHistoryTable.playerId, id),
              eq(matchesTable.clubId, player.clubId!)
            )
          : and(
              eq(eloHistoryTable.playerId, id),
              eq(matchesTable.clubId, activeClubId)
            )
      )
      .orderBy(
        asc(matchesTable.playedAt)
      );

    res.json(
      history.map(
        (row) => ({
          id: row.h.id,
          playerId: row.h.playerId,
          matchId: row.h.matchId,
          eloBefore: row.h.eloBefore,
          eloAfter: row.h.eloAfter,
          eloChange: row.h.eloChange,
          matchPlayedAt:
            row.playedAt.toISOString(),
          createdAt:
            row.h.createdAt.toISOString(),
        })
      )
    );
  }
);

export default router;
