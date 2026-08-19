import { Router, type IRouter } from "express";
import { eq, desc, asc, and } from "drizzle-orm";
import {
  db,
  matchesTable,
  playersTable,
  eloHistoryTable,
  matchPlayersTable,
  sportsTable,
  clubSportsTable,
  sportModalitiesTable,
  playerSportRatingsTable,
} from "@workspace/db";
import {
  calculateMatchEloChanges,
  STARTING_ELO,
} from "../elo";
import { recalculateSportElo } from "../lib/recalculateElo";
import {
  isSuperAdminUser,
  requireCommunityAccess,
} from "../middlewares/requireCommunity";
import { getSportModality, validatePlayersForClub } from "../lib/modalities";

const router: IRouter = Router();

/**
 * Recalcula todo el Elo desde cero.
 *
 * Reglas:
 * 1. Todos los jugadores parten desde STARTING_ELO.
 * 2. Solo partidos CONFIRMADOS afectan el Elo.
 * 3. Partidos 0-0 no afectan el Elo.
 * 4. Solo resultados válidos afectan el Elo.
 * 5. El Elo se calcula independientemente por club.
 * 6. El historial Elo se reconstruye completamente.
 * 7. Los jugadores de cada partido provienen exclusivamente
 *    de matchPlayersTable.
 */
async function legacyRecalculateAllElo(): Promise<void> {
  // ------------------------------------------------------------
  // 1. Reiniciar Elo
  // ------------------------------------------------------------

  await db
    .update(playersTable)
    .set({ elo: STARTING_ELO });

  // ------------------------------------------------------------
  // 2. Reconstruir historial
  // ------------------------------------------------------------

  await db.delete(eloHistoryTable);

  // ------------------------------------------------------------
  // 3. Obtener partidos cronológicamente
  // ------------------------------------------------------------

  const allMatches = await db
    .select()
    .from(matchesTable)
    .orderBy(asc(matchesTable.playedAt));

  const confirmedMatches = allMatches.filter((match: any) => {
    if (match.status !== "confirmed") {
      return false;
    }

    // Un 0-0 no representa un resultado confirmado válido.
    if (
      match.team1Score === 0 &&
      match.team2Score === 0
    ) {
      return false;
    }

    if (
      match.result !== "team1" &&
      match.result !== "team2" &&
      match.result !== "draw"
    ) {
      return false;
    }

    return true;
  });

  if (confirmedMatches.length === 0) {
    return;
  }

  // ------------------------------------------------------------
  // 4. Obtener jugadores
  // ------------------------------------------------------------

  const players = await db
    .select()
    .from(playersTable);

  /**
   * Elo independiente por club.
   *
   * eloByClub[clubId][playerId] = Elo actual
   */
  const eloByClub: Record<
    number,
    Record<number, number>
  > = {};

  for (const player of players) {
    const clubId = player.clubId;

    if (clubId == null) {
      continue;
    }

    if (!eloByClub[clubId]) {
      eloByClub[clubId] = {};
    }

    eloByClub[clubId][player.id] = STARTING_ELO;
  }

  // ------------------------------------------------------------
  // 5. Procesar partidos
  // ------------------------------------------------------------

  for (const match of confirmedMatches) {
    const clubId = match.clubId;

    if (clubId == null) {
      continue;
    }

    if (!eloByClub[clubId]) {
      eloByClub[clubId] = {};
    }

    // ----------------------------------------------------------
    // Jugadores reales del partido
    // ----------------------------------------------------------

    const playersInMatch = await db
      .select()
      .from(matchPlayersTable)
      .where(
        eq(
          matchPlayersTable.matchId,
          match.id
        )
      );

    const team1 = playersInMatch
      .filter(
        (player) =>
          player.team === "team1"
      )
      .map((player) => ({
        id: player.playerId,
        elo:
          eloByClub[clubId][player.playerId] ??
          STARTING_ELO,
      }));

    const team2 = playersInMatch
      .filter(
        (player) =>
          player.team === "team2"
      )
      .map((player) => ({
        id: player.playerId,
        elo:
          eloByClub[clubId][player.playerId] ??
          STARTING_ELO,
      }));

    // Partido incompleto.
    if (
      team1.length === 0 ||
      team2.length === 0
    ) {
      continue;
    }

    // ----------------------------------------------------------
    // Resultado
    // ----------------------------------------------------------

    const team1Won =
      match.result === "team1";

    const isDraw =
      match.result === "draw";

    // ----------------------------------------------------------
    // Calcular Elo
    // ----------------------------------------------------------

    const changes = isDraw
      ? calculateMatchEloChanges(
          team1,
          team2,
          false,
          true
        )
      : calculateMatchEloChanges(
          team1,
          team2,
          team1Won
        );

    // ----------------------------------------------------------
    // Guardar historial
    // ----------------------------------------------------------

    await db
      .insert(eloHistoryTable)
      .values(
        changes.map((change) => ({
          playerId: change.playerId,
          matchId: match.id,
          sportId: match.sportId,
          eloBefore: change.eloBefore,
          eloAfter: change.eloAfter,
          eloChange: change.eloChange,
        }))
      );

    // ----------------------------------------------------------
    // Actualizar Elo temporal
    // ----------------------------------------------------------

    for (const change of changes) {
      eloByClub[clubId][change.playerId] =
        change.eloAfter;
    }
  }

  // ------------------------------------------------------------
  // 6. Persistir Elo final
  // ------------------------------------------------------------

  for (const player of players) {
    const clubId = player.clubId;

    if (clubId == null) {
      continue;
    }

    const finalElo =
      eloByClub[clubId]?.[player.id];

    if (finalElo === undefined) {
      continue;
    }

    await db
      .update(playersTable)
      .set({
        elo: finalElo,
      })
      .where(
        eq(
          playersTable.id,
          player.id
        )
      );
  }
}

async function recalculateAllElo(): Promise<void> {
  return recalculateSportElo();
}

/**
 * Enriquece un partido con:
 * - jugadores
 * - deporte
 * - resultado
 * - estado
 * - historial Elo
 */
async function enrichMatch(
  m: typeof matchesTable.$inferSelect
) {
  const matchPlayers = await db
    .select()
    .from(matchPlayersTable)
    .where(
      eq(
        matchPlayersTable.matchId,
        m.id
      )
    );

  const allPlayers = await db
    .select()
    .from(playersTable);

  const playerMap: Record<
    number,
    string
  > = {};

  for (const player of allPlayers) {
    playerMap[player.id] = player.name;
  }

  const [sport] = await db
    .select()
    .from(sportsTable)
    .where(
      eq(
        sportsTable.id,
        m.sportId
      )
    );

  const [modality] = await db
    .select()
    .from(sportModalitiesTable)
    .where(eq(sportModalitiesTable.id, m.modalityId));

  const history = await db
    .select()
    .from(eloHistoryTable)
    .where(
      eq(
        eloHistoryTable.matchId,
        m.id
      )
    );

  const eloChanges = history.map(
    (historyItem) => ({
      playerId:
        historyItem.playerId,

      playerName:
        playerMap[
          historyItem.playerId
        ] ?? "Desconocido",

      eloBefore:
        historyItem.eloBefore,

      eloAfter:
        historyItem.eloAfter,

      eloChange:
        historyItem.eloChange,
    })
  );

  const team1Players =
    matchPlayers
      .filter(
        (player) =>
          player.team === "team1"
      )
      .map((player) => ({
        id: player.playerId,
        name:
          playerMap[
            player.playerId
          ] ?? "Desconocido",
      }));

  const team2Players =
    matchPlayers
      .filter(
        (player) =>
          player.team === "team2"
      )
      .map((player) => ({
        id: player.playerId,
        name:
          playerMap[
            player.playerId
          ] ?? "Desconocido",
      }));

  return {
    id: m.id,

    sportId: m.sportId,

    modalityId: m.modalityId,

    modalityName:
      modality?.name ?? "Desconocida",

    teamSize:
      modality?.teamSize ?? 0,

    useSets:
      modality?.useSets ?? true,

    sportName:
      sport?.name ??
      "Desconocido",

    sportSlug:
      sport?.slug ?? "",

    team1Players,

    team2Players,

    team1Score:
      m.team1Score,

    team2Score:
      m.team2Score,

    sets:
      m.sets,

    result:
      m.result,

    status:
      (m as any).status ??
      "confirmed",

    reportedBy:
      (m as any).reportedBy ??
      null,

    encuentroId:
      (m as any).encuentroId ??
      null,

    playedAt:
      m.playedAt.toISOString(),

    createdAt:
      m.createdAt.toISOString(),

    eloChanges,
  };
}

// ============================================================
// GET /matches
// ============================================================

router.get(
  "/matches",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const user = req.user as { clubId?: number | null; isAdmin?: number | boolean | null };
    const clubId = isSuperAdminUser(user) ? null : user.clubId!;
    const matches = clubId == null
      ? await db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt))
      : await db.select().from(matchesTable).where(eq(matchesTable.clubId, clubId)).orderBy(desc(matchesTable.playedAt));

    const result =
      await Promise.all(
        matches.map(
          (match) =>
            enrichMatch(match)
        )
      );

    res.json(result);
  }
);

// ============================================================
// POST /matches
// ============================================================

router.post(
  "/matches",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const {
      sportId,
      modalityId,
      team1PlayerIds,
      team2PlayerIds,
      team1Score,
      team2Score,
      sets,
      playedAt,
      encuentroId,
      autoConfirm,
    } = req.body;

    if (
      !sportId ||
      !team1PlayerIds ||
      !team2PlayerIds ||
      !playedAt
    ) {
      res.status(400).json({
        error:
          "Faltan campos requeridos: sportId, modalityId, team1PlayerIds, team2PlayerIds, playedAt",
      });

      return;
    }

    if (
      !Array.isArray(team1PlayerIds) ||
      !Array.isArray(team2PlayerIds)
    ) {
      res.status(400).json({
        error:
          "team1PlayerIds y team2PlayerIds deben ser arrays",
      });

      return;
    }

    if (
      team1PlayerIds.length === 0 ||
      team2PlayerIds.length === 0
    ) {
      res.status(400).json({
        error:
          "Cada equipo debe tener al menos un jugador",
      });

      return;
    }

    const normalizedTeam1Ids = team1PlayerIds.map(Number);
    const normalizedTeam2Ids = team2PlayerIds.map(Number);
    const modality = await getSportModality(Number(sportId), Number(modalityId));
    if (!modality) {
      res.status(400).json({ error: "La modalidad no pertenece al deporte seleccionado" });
      return;
    }
    if (
      normalizedTeam1Ids.length !== modality.teamSize ||
      normalizedTeam2Ids.length !== modality.teamSize
    ) {
      res.status(400).json({
        error: `Cada equipo debe tener exactamente ${modality.teamSize} jugador(es)`,
      });
      return;
    }

    const allIds = [
      ...normalizedTeam1Ids,
      ...normalizedTeam2Ids,
    ];

    if (
      new Set(allIds).size !==
      allIds.length
    ) {
      res.status(400).json({
        error:
          "Un jugador no puede estar en ambos equipos",
      });

      return;
    }

    // ----------------------------------------------------------
    // Verificar deporte
    // ----------------------------------------------------------

    const [sport] = await db
      .select()
      .from(sportsTable)
      .where(
        eq(
          sportsTable.id,
          sportId
        )
      );

    if (!sport) {
      res.status(404).json({
        error:
          "Deporte no encontrado",
      });

      return;
    }

    // ----------------------------------------------------------
    // Club actual
    // ----------------------------------------------------------

    const user = req.user as { clubId?: number | null; isAdmin?: number | boolean | null };
    const requestedClubId = req.body.clubId === undefined ? null : Number(req.body.clubId);
    const clubId = isSuperAdminUser(user) ? requestedClubId : user.clubId!;

    // CORRECCIÓN: comprobación explícita de null para que
    // TypeScript pueda tratar clubId como number a partir de aquí.
    if (
      clubId == null ||
      !Number.isInteger(clubId) ||
      clubId <= 0
    ) {
      res.status(400).json({ error: "Los Super Admin deben indicar clubId para crear un partido" });
      return;
    }

    // ----------------------------------------------------------
    // Verificar jugadores del club
    // ----------------------------------------------------------

    const clubPlayers =
      await db
        .select({
          id:
            playersTable.id,
        })
        .from(playersTable)
        .where(
          eq(
            playersTable.clubId,
            clubId
          )
        );

    const clubPlayerIds =
      new Set(
        clubPlayers.map(
          (player) =>
            player.id
        )
      );

    const invalidPlayers =
      allIds.filter(
        (playerId: number) =>
          !clubPlayerIds.has(
            playerId
          )
      );

    if (
      invalidPlayers.length > 0
    ) {
      res.status(400).json({
        error:
          "Uno o más jugadores no pertenecen al club actual",
        playerIds:
          invalidPlayers,
      });

      return;
    }
    if (!(await validatePlayersForClub(allIds, clubId))) {
      res.status(400).json({ error: "Uno o más jugadores no pertenecen al club actual" });
      return;
    }

    // ----------------------------------------------------------
    // Resultado
    // ----------------------------------------------------------

    const t1Score =
      team1Score ?? 0;

    const t2Score =
      team2Score ?? 0;

    let result =
      "draw";

    if (
      t1Score >
      t2Score
    ) {
      result =
        "team1";
    } else if (
      t2Score >
      t1Score
    ) {
      result =
        "team2";
    }

    // ----------------------------------------------------------
    // Estado
    // ----------------------------------------------------------

    const status =
      autoConfirm
        ? "confirmed"
        : "pending_confirmation";

    // ----------------------------------------------------------
    // Crear partido
    // ----------------------------------------------------------

    const [match] =
      await db
        .insert(matchesTable)
        .values({
          sportId,
          modalityId: modality.id,

          clubId,

          team1Score:
            t1Score,

          team2Score:
            t2Score,

          sets:
            sets ?? null,

          result,

          status,

          encuentroId:
            encuentroId ??
            null,

          playedAt:
            new Date(
              playedAt
            ),
        } as any)
        .returning();

    // ----------------------------------------------------------
    // Crear relación jugadores-partido
    // ----------------------------------------------------------

    await db
      .insert(playerSportRatingsTable)
      .values(
        allIds.map((playerId: number) => ({
          playerId,
          sportId: Number(sportId),
          elo: STARTING_ELO,
        })),
      )
      .onConflictDoNothing({
        target: [playerSportRatingsTable.playerId, playerSportRatingsTable.sportId],
      });

    const matchPlayerValues = [
      ...normalizedTeam1Ids.map(
        (playerId: number) => ({
          matchId:
            match.id,

          playerId,

          team:
            "team1",
        })
      ),

      ...normalizedTeam2Ids.map(
        (playerId: number) => ({
          matchId:
            match.id,

          playerId,

          team:
            "team2",
        })
      ),
    ];

    await db
      .insert(
        matchPlayersTable
      )
      .values(
        matchPlayerValues
      );

    // ----------------------------------------------------------
    // Elo únicamente si nace confirmado
    // ----------------------------------------------------------

    if (
      status ===
      "confirmed"
    ) {
      await recalculateAllElo();
    }

    res.status(201).json(
      await enrichMatch(
        match
      )
    );
  }
);

// ============================================================
// POST /matches/:id/confirm
// ============================================================

router.post(
  "/matches/:id/confirm",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const rawId =
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

    const id =
      parseInt(
        rawId,
        10
      );

    if (isNaN(id)) {
      res.status(400).json({
        error:
          "ID inválido",
      });

      return;
    }

    const clubId =
      (
        req.user as {
          clubId: number;
        }
      ).clubId;

    const [existing] =
      await db
        .select()
        .from(matchesTable)
        .where(
          eq(
            matchesTable.id,
            id
          )
        );

    if (!existing) {
      res.status(404).json({
        error:
          "Partido no encontrado",
      });

      return;
    }

    if (
      !isSuperAdminUser(req.user) &&
      existing.clubId !== clubId
    ) {
      res.status(403).json({
        error:
          "Forbidden",
      });

      return;
    }

    // Ya confirmado: no recalcular innecesariamente.
    if (
      (existing as any).status ===
      "confirmed"
    ) {
      res.json(
        await enrichMatch(
          existing
        )
      );

      return;
    }

    // ----------------------------------------------------------
    // Validar jugadores
    // ----------------------------------------------------------

    const matchPlayers =
      await db
        .select()
        .from(matchPlayersTable)
        .where(
          eq(
            matchPlayersTable.matchId,
            id
          )
        );

    const team1 =
      matchPlayers.filter(
        (player) =>
          player.team ===
          "team1"
      );

    const team2 =
      matchPlayers.filter(
        (player) =>
          player.team ===
          "team2"
      );

    if (
      team1.length === 0 ||
      team2.length === 0
    ) {
      res.status(400).json({
        error:
          "No se puede confirmar un partido sin jugadores en ambos equipos",
      });

      return;
    }

    // ----------------------------------------------------------
    // No confirmar 0-0
    // ----------------------------------------------------------

    if (
      existing.team1Score ===
        0 &&
      existing.team2Score ===
        0
    ) {
      res.status(400).json({
        error:
          "No se puede confirmar un partido con resultado 0-0",
      });

      return;
    }

    // ----------------------------------------------------------
    // Confirmar
    // ----------------------------------------------------------

    const [updated] =
      await db
        .update(matchesTable)
        .set({
          status:
            "confirmed",
        } as any)
        .where(
          eq(
            matchesTable.id,
            id
          )
        )
        .returning();

    await recalculateAllElo();

    res.json(
      await enrichMatch(
        updated
      )
    );
  }
);

// ============================================================
// GET /matches/:id
// ============================================================

router.get(
  "/matches/:id",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const rawId =
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

    const id =
      parseInt(
        rawId,
        10
      );

    if (isNaN(id)) {
      res.status(400).json({
        error:
          "ID inválido",
      });

      return;
    }

    const clubId =
      (
        req.user as {
          clubId: number;
        }
      ).clubId;

    const [match] =
      await db
        .select()
        .from(matchesTable)
        .where(
          eq(
            matchesTable.id,
            id
          )
        );

    if (!match) {
      res.status(404).json({
        error:
          "Partido no encontrado",
      });

      return;
    }

    if (
      !isSuperAdminUser(req.user) &&
      match.clubId !== clubId
    ) {
      res.status(403).json({
        error:
          "Forbidden",
      });

      return;
    }

    res.json(
      await enrichMatch(
        match
      )
    );
  }
);

// ============================================================
// PATCH /matches/:id
// ============================================================

router.patch(
  "/matches/:id",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const rawId =
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

    const id =
      parseInt(
        rawId,
        10
      );

    if (isNaN(id)) {
      res.status(400).json({
        error:
          "ID inválido",
      });

      return;
    }

    const clubId =
      (
        req.user as {
          clubId: number;
        }
      ).clubId;

    const [existing] =
      await db
        .select()
        .from(matchesTable)
        .where(
          eq(
            matchesTable.id,
            id
          )
        );

    if (!existing) {
      res.status(404).json({
        error:
          "Partido no encontrado",
      });

      return;
    }

    if (
      !isSuperAdminUser(req.user) &&
      existing.clubId !== clubId
    ) {
      res.status(403).json({
        error:
          "Forbidden",
      });

      return;
    }

    const {
      team1PlayerIds,
      team2PlayerIds,
      modalityId,
      team1Score,
      team2Score,
      sets,
      playedAt,
      status,
    } = req.body;

    const resultingModalityId =
      modalityId === undefined
        ? existing.modalityId
        : Number(modalityId);

    const modality = await getSportModality(
      existing.sportId,
      resultingModalityId,
    );

    if (!modality) {
      res.status(400).json({
        error: "La modalidad no pertenece al deporte seleccionado",
      });
      return;
    }

    // ----------------------------------------------------------
    // Determinar valores resultantes
    // ----------------------------------------------------------

    const resultingTeam1Score =
      team1Score ??
      existing.team1Score;

    const resultingTeam2Score =
      team2Score ??
      existing.team2Score;

    const resultingStatus =
      status ??
      (existing as any).status ??
      "confirmed";

    // ----------------------------------------------------------
    // Si vienen jugadores, validarlos ANTES de modificar
    // el partido.
    // ----------------------------------------------------------

    let newTeam1Ids:
      number[] | null = null;

    let newTeam2Ids:
      number[] | null = null;

    if (
      team1PlayerIds !== undefined ||
      team2PlayerIds !== undefined
    ) {
      newTeam1Ids =
        Array.isArray(team1PlayerIds)
          ? team1PlayerIds.map(Number)
          : [];

      newTeam2Ids =
        Array.isArray(team2PlayerIds)
          ? team2PlayerIds.map(Number)
          : [];

      const allIds = [
        ...newTeam1Ids,
        ...newTeam2Ids,
      ];

      if (
        new Set(allIds).size !==
        allIds.length
      ) {
        res.status(400).json({
          error:
            "Un jugador no puede estar en ambos equipos",
        });

        return;
      }

      if (
        newTeam1Ids.length === 0 ||
        newTeam2Ids.length === 0
      ) {
        res.status(400).json({
          error:
            "Cada equipo debe tener al menos un jugador",
        });

        return;
      }

      if (
        newTeam1Ids.length !== modality.teamSize ||
        newTeam2Ids.length !== modality.teamSize
      ) {
        res.status(400).json({
          error: `Cada equipo debe tener exactamente ${modality.teamSize} jugador(es)`,
        });
        return;
      }

      const clubPlayers =
        await db
          .select({
            id:
              playersTable.id,
          })
          .from(playersTable)
          .where(
            eq(
              playersTable.clubId,
              clubId
            )
          );

      const clubPlayerIds =
        new Set(
          clubPlayers.map(
            (player) =>
              player.id
          )
        );

      const invalidPlayers =
        allIds.filter(
          (playerId: number) =>
            !clubPlayerIds.has(
              playerId
            )
        );

      if (
        invalidPlayers.length > 0
      ) {
        res.status(400).json({
          error:
            "Uno o más jugadores no pertenecen al club actual",
          playerIds:
            invalidPlayers,
        });

        return;
      }

      if (!(await validatePlayersForClub(allIds, clubId))) {
        res.status(400).json({
          error: "Uno o más jugadores no pertenecen al club actual",
        });
        return;
      }
    }

    // ----------------------------------------------------------
    // Validación de partido confirmado
    // ----------------------------------------------------------

    if (
      resultingStatus ===
        "confirmed" &&
      resultingTeam1Score ===
        0 &&
      resultingTeam2Score ===
        0
    ) {
      res.status(400).json({
        error:
          "Un partido confirmado debe tener un resultado válido",
      });

      return;
    }

    // ----------------------------------------------------------
    // Construir actualización
    // ----------------------------------------------------------

    const updates:
      Record<
        string,
        unknown
      > = {};

    if (
      team1Score !==
      undefined
    ) {
      updates.team1Score =
        team1Score;
    }

    if (
      team2Score !==
      undefined
    ) {
      updates.team2Score =
        team2Score;
    }

    if (
      sets !==
      undefined
    ) {
      updates.sets =
        sets;
    }

    if (
      playedAt !==
      undefined
    ) {
      updates.playedAt =
        new Date(
          playedAt
        );
    }

    if (
      status !==
      undefined
    ) {
      updates.status =
        status;
    }

    if (modalityId !== undefined) {
      updates.modalityId = resultingModalityId;
    }

    updates.result =
      resultingTeam1Score >
      resultingTeam2Score
        ? "team1"
        : resultingTeam2Score >
            resultingTeam1Score
          ? "team2"
          : "draw";

    // ----------------------------------------------------------
    // Actualizar partido
    // ----------------------------------------------------------

    const [updated] =
      await db
        .update(matchesTable)
        .set(updates)
        .where(
          eq(
            matchesTable.id,
            id
          )
        )
        .returning();

    // ----------------------------------------------------------
    // Actualizar jugadores del partido
    // ----------------------------------------------------------

    if (
      newTeam1Ids !== null &&
      newTeam2Ids !== null
    ) {
      await db
        .insert(playerSportRatingsTable)
        .values(
          [...newTeam1Ids, ...newTeam2Ids].map((playerId) => ({
            playerId,
            sportId: existing.sportId,
            elo: STARTING_ELO,
          })),
        )
        .onConflictDoNothing({
          target: [playerSportRatingsTable.playerId, playerSportRatingsTable.sportId],
        });

      await db
        .delete(
          matchPlayersTable
        )
        .where(
          eq(
            matchPlayersTable.matchId,
            id
          )
        );

      await db
        .insert(
          matchPlayersTable
        )
        .values([
          ...newTeam1Ids.map(
            (
              playerId: number
            ) => ({
              matchId: id,
              playerId,
              team:
                "team1",
            })
          ),

          ...newTeam2Ids.map(
            (
              playerId: number
            ) => ({
              matchId: id,
              playerId,
              team:
                "team2",
            })
          ),
        ]);
    }

    // ----------------------------------------------------------
    // Reconstruir Elo.
    //
    // Esto se hace siempre para garantizar que:
    // - editar un partido confirmado
    // - confirmar uno pendiente
    // - cambiar jugadores
    // - cambiar resultado
    // - cambiar fecha
    //
    // deje el ranking completamente consistente.
    // ----------------------------------------------------------

    await recalculateAllElo();

    res.json(
      await enrichMatch(
        updated
      )
    );
  }
);

// ============================================================
// DELETE /matches/:id
// ============================================================

router.delete(
  "/matches/:id",
  requireCommunityAccess,
  async (req, res): Promise<void> => {
    const rawId =
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

    const id =
      parseInt(
        rawId,
        10
      );

    if (isNaN(id)) {
      res.status(400).json({
        error:
          "ID inválido",
      });

      return;
    }

    const clubId =
      (
        req.user as {
          clubId: number;
        }
      ).clubId;

    const [existing] =
      await db
        .select()
        .from(matchesTable)
        .where(
          eq(
            matchesTable.id,
            id
          )
        );

    if (!existing) {
      res.status(404).json({
        error:
          "Partido no encontrado",
      });

      return;
    }

    if (
      !isSuperAdminUser(req.user) &&
      existing.clubId !== clubId
    ) {
      res.status(403).json({
        error:
          "Forbidden",
      });

      return;
    }

    await db
      .delete(matchesTable)
      .where(
        eq(
          matchesTable.id,
          id
        )
      );

    // El ranking debe representar los partidos restantes.
    await recalculateAllElo();

    res.sendStatus(204);
  }
);

// ============================================================
// GET /sports
// ============================================================

router.get(
  "/sports",
  async (req, res): Promise<void> => {
    const clubId =
      (
        req.user as {
          clubId?:
            | number
            | null;
        } |
        undefined
      )?.clubId;

    if (clubId) {
      const sports =
        await db
          .select({
            id:
              sportsTable.id,

            name:
              sportsTable.name,

            slug:
              sportsTable.slug,

            teamSize:
              sportsTable.teamSize,

            useSets:
              sportsTable.useSets,

            active:
              sportsTable.active,
          })
          .from(
            sportsTable
          )
          .innerJoin(
            clubSportsTable,
            eq(
              clubSportsTable.sportId,
              sportsTable.id
            )
          )
          .where(
            and(
              eq(
                clubSportsTable.clubId,
                clubId
              ),

              eq(
                clubSportsTable.active,
                true
              ),

              eq(
                sportsTable.active,
                true
              )
            )
          );

      res.json(sports);

      return;
    }

    const sports =
      await db
        .select()
        .from(
          sportsTable
        )
        .where(
          eq(
            sportsTable.active,
            true
          )
        );

    res.json(sports);
  }
);

export default router;
