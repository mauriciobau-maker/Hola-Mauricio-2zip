import { Router, type IRouter } from "express";
import { eq, desc, asc, and, inArray } from "drizzle-orm";
import {
  db,
  playersTable,
  usersTable,
  matchesTable,
  eloHistoryTable,
  matchPlayersTable,
  playerCategoriesTable,
  clubSportCategoriesTable,
  clubsTable,
  sportsTable,
  clubSportsTable,
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
  resolveEffectiveClubId,
} from "../middlewares/requireCommunity";
import { logger } from "../lib/logger";

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
  player: typeof playersTable.$inferSelect,
  requestedSportId?: number | null
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

  let isFootball = false;
  let useSets = true;
  let sportName = "Pádel";
  let sportSlug = "padel";

  if (requestedSportId && Number.isInteger(Number(requestedSportId)) && Number(requestedSportId) > 0) {
    try {
      const [sport] = await db
        .select({
          id: sportsTable.id,
          name: sportsTable.name,
          slug: sportsTable.slug,
          useSets: sportsTable.useSets,
        })
        .from(sportsTable)
        .where(eq(sportsTable.id, Number(requestedSportId)))
        .limit(1);

      if (sport) {
        sportName = sport.name;
        sportSlug = sport.slug;
        useSets = sport.useSets;
        isFootball = sport.slug === "futbol" || sport.name.toLowerCase().includes("fútbol") || sport.id === 3;
      }
    } catch {}
  } else if (player.clubId) {
    try {
      const [clubSport] = await db
        .select({
          id: sportsTable.id,
          name: sportsTable.name,
          slug: sportsTable.slug,
          useSets: sportsTable.useSets,
        })
        .from(clubSportsTable)
        .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
        .where(
          and(
            eq(clubSportsTable.clubId, player.clubId),
            eq(clubSportsTable.active, true),
            eq(sportsTable.active, true)
          )
        )
        .orderBy(clubSportsTable.id)
        .limit(1);

      if (clubSport) {
        sportName = clubSport.name;
        sportSlug = clubSport.slug;
        useSets = clubSport.useSets;
        isFootball = clubSport.slug === "futbol" || clubSport.name.toLowerCase().includes("fútbol");
      }
    } catch {}
  }

  let points = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  if (isFootball) {
    try {
      const matchRows = await db
        .select({
          matchId: matchPlayersTable.matchId,
          team: matchPlayersTable.team,
          status: matchesTable.status,
          result: matchesTable.result,
          team1Score: matchesTable.team1Score,
          team2Score: matchesTable.team2Score,
        })
        .from(matchPlayersTable)
        .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
        .where(
          and(
            eq(matchPlayersTable.playerId, player.id),
            eq(matchesTable.status, "confirmed")
          )
        );

      for (const m of matchRows) {
        let effResult = m.result;
        const t1 = Number(m.team1Score ?? 0);
        const t2 = Number(m.team2Score ?? 0);
        if (!["team1", "team2", "draw"].includes(effResult)) {
          if (t1 > t2) effResult = "team1";
          else if (t2 > t1) effResult = "team2";
          else effResult = "draw";
        }
        const myGoals = m.team === "team1" ? t1 : t2;
        const oppGoals = m.team === "team1" ? t2 : t1;
        goalsFor += myGoals;
        goalsAgainst += oppGoals;

        if (effResult === "draw") {
          draws++;
          points += 1;
        } else if (effResult === m.team) {
          wins++;
          points += 3;
        } else {
          losses++;
        }
      }
    } catch {}
  }

  let email: string | null = null;
  let profileImageUrl: string | null = null;

  try {
    const [linkedUser] = await db
      .select({
        email: usersTable.email,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.playerId, player.id))
      .limit(1);

    if (linkedUser) {
      email = linkedUser.email ?? null;
      profileImageUrl = linkedUser.profileImageUrl ?? null;
    }
  } catch {}

  return {
    id: player.id,
    name: player.name,
    nickname:
      player.nickname ?? null,
    email,
    profileImageUrl,
    elo: isFootball ? points : player.elo,
    phone:
      player.phone ?? null,
    waId:
      player.waId ?? null,
    wspConsent:
      player.wspConsent ?? false,
    language:
      player.language ?? "es",
    dominantHand:
      (player as any).dominantHand ?? null,
    courtSide:
      (player as any).courtSide ?? null,
    clubId:
      player.clubId ?? null,
    isFootball,
    useSets,
    sportName,
    sportSlug,
    points,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
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
  async (req, res): Promise<void> => {
    try {
      const clubId = await resolveEffectiveClubId(req);
      const rawSportId = req.query.sportId;
      const sportId =
        rawSportId !== undefined && rawSportId !== "" ? Number(rawSportId) : null;

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
          players.map((p) => enrichPlayer(p, sportId))
        );

      res.json(enriched);
    } catch (err: any) {
      logger.warn({ err: err?.message }, "Failed to query players — database may be offline or unconfigured");
      res.json([]);
    }
  }
);

// ============================================================
// POST /players
// ============================================================

router.post(
  "/players",
  async (req, res): Promise<void> => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

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

      const user = req.user as any;
      const isSuperAdmin = isSuperAdminUser(user);
      const isClubAdmin = Boolean(user.isClubAdmin);

      if (!isSuperAdmin && !isClubAdmin) {
        res.status(403).json({ error: "Solo los administradores del club pueden registrar nuevos jugadores" });
        return;
      }

      let targetClubId = user?.clubId ?? null;

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

      if (!targetClubId) {
        res.status(400).json({ error: "Debes pertenecer a un club o especificar un club válido para registrar jugadores" });
        return;
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

      const phoneVal = restParsedData.phone ?? bodyData.phone;
      if (phoneVal !== undefined) {
        insertValues.phone = typeof phoneVal === "string" && phoneVal.trim() ? phoneVal.trim() : null;
      }

      const waIdVal = restParsedData.waId ?? bodyData.waId;
      if (waIdVal !== undefined) {
        insertValues.waId = typeof waIdVal === "string" && waIdVal.trim() ? waIdVal.trim() : null;
      }

      const wspVal = restParsedData.wspConsent ?? bodyData.wspConsent;
      if (wspVal !== undefined) {
        insertValues.wspConsent = Boolean(wspVal);
      }

      const langVal = restParsedData.language ?? bodyData.language;
      if (langVal !== undefined) {
        insertValues.language = langVal;
      }

      const domHandVal = restParsedData.dominantHand ?? bodyData.dominantHand;
      if (domHandVal !== undefined) {
        insertValues.dominantHand = typeof domHandVal === "string" && domHandVal.trim() ? domHandVal.trim() : null;
      }

      const courtSideVal = restParsedData.courtSide ?? bodyData.courtSide;
      if (courtSideVal !== undefined) {
        insertValues.courtSide = typeof courtSideVal === "string" && courtSideVal.trim() ? courtSideVal.trim() : null;
      }

      const categoryIdsRaw =
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

      const cleanCategoryIds = Array.isArray(categoryIdsRaw)
        ? categoryIdsRaw
            .map((cid: any) => Number(cid))
            .filter((cid: number) => Number.isInteger(cid) && cid > 0)
        : [];

      if (cleanCategoryIds.length > 0 && targetClubId) {
        const validCategories = await db
          .select({ id: clubSportCategoriesTable.id })
          .from(clubSportCategoriesTable)
          .innerJoin(
            clubSportsTable,
            eq(clubSportCategoriesTable.clubSportId, clubSportsTable.id)
          )
          .where(
            and(
              eq(clubSportsTable.clubId, targetClubId),
              inArray(clubSportCategoriesTable.id, cleanCategoryIds)
            )
          );

        const validIdSet = new Set(validCategories.map((c) => c.id));
        const invalidIds = cleanCategoryIds.filter((cid) => !validIdSet.has(cid));

        if (invalidIds.length > 0) {
          res.status(400).json({
            error: `Las categorías [${invalidIds.join(", ")}] no existen o no pertenecen al club especificado`,
          });
          return;
        }
      }

      const [player] = await db
        .insert(playersTable)
        .values(insertValues as any)
        .returning();

      if (cleanCategoryIds.length > 0) {
        await db
          .insert(playerCategoriesTable)
          .values(
            cleanCategoryIds.map((categoryId) => ({
              playerId: player.id,
              categoryId,
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

    const rawSportId = req.query.sportId;
    const sportId =
      rawSportId !== undefined && rawSportId !== "" ? Number(rawSportId) : null;

    const responseObj =
      await enrichPlayer(
        player,
        sportId
      );

    res.json(responseObj);
  }
);

// ============================================================
// PATCH /players/:id
// ============================================================

router.patch(
  "/players/:id",
  async (req, res): Promise<void> => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

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

    const [existingPlayer] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, params.data.id))
      .limit(1);

    if (!existingPlayer) {
      res.status(404).json({ error: "Jugador no encontrado" });
      return;
    }

    const user = req.user as any;
    const isSuperAdmin = isSuperAdminUser(user);
    const isSelfPlayer = Boolean(user?.playerId && user.playerId === existingPlayer.id);
    const isClubAdminForPlayer = Boolean(user?.isClubAdmin) && user?.clubId === existingPlayer.clubId;

    if (!isSuperAdmin && !isClubAdminForPlayer && !isSelfPlayer) {
      res.status(403).json({ error: "No tienes permiso para modificar este perfil de jugador" });
      return;
    }

    const updates: Record<string, unknown> = {};

    // Edición administrativa: Super Admin global o administrador del club gestionando a un jugador de su club.
    // La autoedición de un jugador sobre su propio perfil nunca tiene permisos administrativos para alterar ELO, categoría, waId, correo, etc.
    const isAdministrativeEdit = isSuperAdmin || (isClubAdminForPlayer && !isSelfPlayer);

    if (isAdministrativeEdit) {
      // Edición administrativa autorizada (Super Admin global o Admin del club al que pertenece el jugador)
      const body = UpdatePlayerBody.safeParse(req.body);
      if (body.success) {
        if (body.data.name !== undefined && body.data.name.trim() !== "") {
          updates.name = formatName(body.data.name);
        }
        if ("nickname" in body.data) {
          updates.nickname = body.data.nickname ? formatName(body.data.nickname) : null;
        }
      }

      const {
        phone,
        waId,
        wspConsent,
        language,
        categoryIds,
        dominantHand,
        courtSide,
        email,
        profileImageUrl,
      } = req.body;

      if (phone !== undefined) {
        updates.phone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
      }
      if (waId !== undefined) {
        updates.waId = typeof waId === "string" && waId.trim() ? waId.trim() : null;
      }
      if (wspConsent !== undefined) {
        updates.wspConsent = Boolean(wspConsent);
      }
      if (language !== undefined && typeof language === "string") {
        updates.language = language;
      }
      if (dominantHand !== undefined) {
        updates.dominantHand = dominantHand && typeof dominantHand === "string" ? dominantHand.trim() : null;
      }
      if (courtSide !== undefined) {
        updates.courtSide = courtSide && typeof courtSide === "string" ? courtSide.trim() : null;
      }

      if (email !== undefined || profileImageUrl !== undefined) {
        try {
          const [existingUser] = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.playerId, params.data.id))
            .limit(1);

          const cleanEmail = email !== undefined && typeof email === "string" ? email.trim() || null : undefined;
          const cleanPhoto = profileImageUrl !== undefined && typeof profileImageUrl === "string" ? profileImageUrl.trim() || null : undefined;

          if (existingUser) {
            const userUpdates: Record<string, unknown> = {};
            if (cleanEmail !== undefined) userUpdates.email = cleanEmail;
            if (cleanPhoto !== undefined) userUpdates.profileImageUrl = cleanPhoto;
            if (Object.keys(userUpdates).length > 0) {
              await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, existingUser.id));
            }
          } else if (cleanEmail || cleanPhoto) {
            await db.insert(usersTable).values({
              email: cleanEmail ?? null,
              profileImageUrl: cleanPhoto ?? null,
              playerId: params.data.id,
              name: updates.name ? String(updates.name) : existingPlayer.name,
              clubId: existingPlayer.clubId ?? null,
            });
          }
        } catch (err) {
          logger.warn("Could not index linked user photo/email:", err);
        }
      }

      if (Array.isArray(categoryIds)) {
        const cleanCategoryIds = categoryIds
          .map((cid: any) => Number(cid))
          .filter((cid: number) => Number.isInteger(cid) && cid > 0);

        if (cleanCategoryIds.length > 0 && existingPlayer.clubId) {
          const validCategories = await db
            .select({ id: clubSportCategoriesTable.id })
            .from(clubSportCategoriesTable)
            .innerJoin(
              clubSportsTable,
              eq(clubSportCategoriesTable.clubSportId, clubSportsTable.id)
            )
            .where(
              and(
                eq(clubSportsTable.clubId, existingPlayer.clubId),
                inArray(clubSportCategoriesTable.id, cleanCategoryIds)
              )
            );

          const validIdSet = new Set(validCategories.map((c) => c.id));
          const invalidIds = cleanCategoryIds.filter((cid) => !validIdSet.has(cid));

          if (invalidIds.length > 0) {
            res.status(400).json({
              error: `Las categorías [${invalidIds.join(", ")}] no existen o no pertenecen al club del jugador`,
            });
            return;
          }
        }

        await db
          .delete(playerCategoriesTable)
          .where(eq(playerCategoriesTable.playerId, existingPlayer.id));

        if (cleanCategoryIds.length > 0) {
          await db
            .insert(playerCategoriesTable)
            .values(
              cleanCategoryIds.map((categoryId: number) => ({
                playerId: existingPlayer.id,
                categoryId,
              }))
            );
        }
      }
    } else {
      // Autoedición del perfil por el propio jugador (isSelfPlayer)
      // Permite ÚNICAMENTE: teléfono, mano hábil, lado de juego, idioma y foto de perfil
      // Bloquea estrictamente: correo, waId, consentimiento de WhatsApp, nombre, apodo, ELO, ranking, categoría
      const {
        phone,
        dominantHand,
        courtSide,
        language,
        profileImageUrl,
      } = req.body;

      if (phone !== undefined) {
        updates.phone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
      }
      if (dominantHand !== undefined) {
        updates.dominantHand = dominantHand && typeof dominantHand === "string" ? dominantHand.trim() : null;
      }
      if (courtSide !== undefined) {
        updates.courtSide = courtSide && typeof courtSide === "string" ? courtSide.trim() : null;
      }
      if (language !== undefined && typeof language === "string") {
        updates.language = language;
      }

      if (profileImageUrl !== undefined) {
        const cleanPhoto = typeof profileImageUrl === "string" ? profileImageUrl.trim() || null : null;
        try {
          const [existingUser] = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.id, user.id))
            .limit(1);

          if (existingUser) {
            await db
              .update(usersTable)
              .set({ profileImageUrl: cleanPhoto })
              .where(eq(usersTable.id, existingUser.id));
          }
        } catch (err) {
          logger.warn("Could not update self player profile image:", err);
        }
      }
    }

    let updatedRecord = existingPlayer;
    if (Object.keys(updates).length > 0) {
      const [rec] = await db
        .update(playersTable)
        .set(updates)
        .where(eq(playersTable.id, existingPlayer.id))
        .returning();
      if (rec) {
        updatedRecord = rec;
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

    const user = req.user as any;
    const isSuperAdmin = isSuperAdminUser(user);
    const isClubAdmin = Boolean(user?.isClubAdmin);

    // Solo los administradores del club o Super Admin pueden dar de baja jugadores
    if (!isSuperAdmin && !isClubAdmin) {
      res.status(403).json({ error: "Solo los administradores del club pueden eliminar jugadores" });
      return;
    }

    const ownershipClause = isSuperAdmin
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

    const [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      res.status(404).json({
        error: "Jugador no encontrado",
      });
      return;
    }

    const user = req.user as any;
    const isSuperAdmin = isSuperAdminUser(user);
    const sessionClubId = user?.clubId ? Number(user.clubId) : null;
    const playerClubId = player.clubId ? Number(player.clubId) : null;

    // Aislamiento entre clubes:
    // Si el usuario autenticado tiene club asignado y no es Super Admin,
    // se impide consultar datos de partidos o participantes de jugadores de otro club.
    if (!isSuperAdmin && sessionClubId && playerClubId && sessionClubId !== playerClubId) {
      res.status(403).json({ error: "No tienes permiso para ver estadísticas de jugadores de otro club" });
      return;
    }

    // Determinar el club efectivo:
    // Si la sesión tiene club, se aísla a dicho club.
    // Si la consulta es sin club (pública o sin sesión con club), se aísla estrictamente al club al que pertenece el jugador.
    const effectiveClubId = sessionClubId ?? playerClubId;

    const rawSportId = req.query.sportId;
    const sportId =
      rawSportId !== undefined && rawSportId !== "" ? Number(rawSportId) : null;

    let targetSportId = sportId;
    let isFootball = false;
    let useSets = true;
    let sportName = "Pádel";
    let sportSlug = "padel";

    if (targetSportId && Number.isInteger(Number(targetSportId)) && Number(targetSportId) > 0) {
      try {
        const [sport] = await db
          .select({
            id: sportsTable.id,
            name: sportsTable.name,
            slug: sportsTable.slug,
            useSets: sportsTable.useSets,
          })
          .from(sportsTable)
          .where(eq(sportsTable.id, Number(targetSportId)))
          .limit(1);

        if (sport) {
          sportName = sport.name;
          sportSlug = sport.slug;
          useSets = sport.useSets;
          isFootball = sport.slug === "futbol" || sport.name.toLowerCase().includes("fútbol") || sport.id === 3;
        }
      } catch {}
    } else if (player.clubId) {
      try {
        const [clubSport] = await db
          .select({
            id: sportsTable.id,
            name: sportsTable.name,
            slug: sportsTable.slug,
            useSets: sportsTable.useSets,
          })
          .from(clubSportsTable)
          .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
          .where(
            and(
              eq(clubSportsTable.clubId, player.clubId),
              eq(clubSportsTable.active, true),
              eq(sportsTable.active, true)
            )
          )
          .orderBy(clubSportsTable.id)
          .limit(1);

        if (clubSport) {
          targetSportId = clubSport.id;
          sportName = clubSport.name;
          sportSlug = clubSport.slug;
          useSets = clubSport.useSets;
          isFootball = clubSport.slug === "futbol" || clubSport.name.toLowerCase().includes("fútbol") || clubSport.id === 3;
        }
      } catch {}
    }

    // Si no se puede determinar ningún club (p. ej. jugador huérfano sin club asignado), no se retornan partidos de ningún club
    const matchWhereClause = and(
      effectiveClubId ? eq(matchesTable.clubId, effectiveClubId) : eq(matchesTable.clubId, -1),
      targetSportId ? eq(matchesTable.sportId, targetSportId) : undefined
    );

    const allMatches = await db
      .select()
      .from(matchesTable)
      .where(matchWhereClause)
      .orderBy(desc(matchesTable.playedAt));

    const matchIds = allMatches.map((m) => m.id);

    // Evitar escanear participantes y jugadores de otros clubes:
    // 1. Participantes limitados a los partidos del club
    // 2. Jugadores limitados al club objetivo
    const [allMatchPlayers, allPlayersList] = await Promise.all([
      matchIds.length > 0
        ? db
            .select()
            .from(matchPlayersTable)
            .where(inArray(matchPlayersTable.matchId, matchIds))
        : Promise.resolve([]),
      effectiveClubId
        ? db
            .select({ id: playersTable.id, name: playersTable.name })
            .from(playersTable)
            .where(eq(playersTable.clubId, effectiveClubId))
        : Promise.resolve([]),
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
        isFootball,
        useSets,
        sportName,
        sportSlug,
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
     * Si la consulta es realizada por un miembro autenticado del club o Super Admin,
     * se incluyen los participantes. Si es consulta pública o sin club, se limita
     * explícitamente a la información pública del partido omitiendo datos de participantes.
     */
    const isClubMemberOrSuperAdmin = Boolean(
      user && (isSuperAdmin || (sessionClubId && sessionClubId === playerClubId))
    );

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

          const team1Players = isClubMemberOrSuperAdmin
            ? participants
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
                }))
            : [];

          const team2Players = isClubMemberOrSuperAdmin
            ? participants
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
                }))
            : [];

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
      goalsFor: setsWon,
      goalsAgainst: setsLost,
      goalDiff: setsWon - setsLost,
      currentStreak,
      recentMatches,
      isFootball,
      useSets,
      sportName,
      sportSlug,
    });
  }
);

// ============================================================
// GET /players/:id/elo-history
// ============================================================

router.get(
  "/players/:id/elo-history",
  async (req, res): Promise<void> => {
    const raw =
      Array.isArray(
        req.params.id
      )
        ? req.params.id[0]
        : req.params.id;

    const id =
      parseInt(
        raw,
        10
      );

    if (isNaN(id)) {
      res.status(400).json({
        error:
          "ID inválido",
      });
      return;
    }

    const [player] =
      await db
        .select()
        .from(playersTable)
        .where(
          eq(
            playersTable.id,
            id
          )
        );

    if (!player) {
      res.status(404).json({
        error:
          "Jugador no encontrado",
      });
      return;
    }

    const history =
      await db
        .select({
          h: eloHistoryTable,
          playedAt:
            matchesTable.playedAt,
        })
        .from(
          eloHistoryTable
        )
        .innerJoin(
          matchesTable,
          eq(
            eloHistoryTable.matchId,
            matchesTable.id
          )
        )
        .where(
          eq(
            eloHistoryTable.playerId,
            id
          )
        )
        .orderBy(
          asc(
            matchesTable.playedAt
          )
        );

    res.json(
      history.map(
        (row) => ({
          id: row.h.id,
          playerId:
            row.h.playerId,
          matchId:
            row.h.matchId,
          eloBefore:
            row.h.eloBefore,
          eloAfter:
            row.h.eloAfter,
          eloChange:
            row.h.eloChange,
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