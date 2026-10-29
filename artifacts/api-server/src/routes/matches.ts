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
  encuentrosTable,
} from "@workspace/db";
import {
  calculateMatchEloChanges,
  STARTING_ELO,
} from "../elo";
import { recalculateSportElo } from "../lib/recalculateElo";
import {
  requireAuth,
  requireClub,
  resolveEffectiveClubId,
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

    // El fútbol se rige por tabla tradicional de puntos (3-1-0), goles y DG, no por sistema Elo
    if (match.sportId === 3) {
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

    if (team1.length === 0) {
      continue;
    }

    let effectiveTeam2 = team2;
    const isRivalMatch = (match as any).matchType === "rival" || Boolean((match as any).rivalTeamName);
    if (team2.length === 0 && isRivalMatch) {
      effectiveTeam2 = [{ id: -1, elo: STARTING_ELO }];
    } else if (team2.length === 0) {
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
          effectiveTeam2,
          false,
          true
        ).filter((change) => change.playerId > 0)
      : calculateMatchEloChanges(
          team1,
          effectiveTeam2,
          team1Won
        ).filter((change) => change.playerId > 0);

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

  const isFootballMatch = sport?.slug === "futbol" || sport?.name?.toLowerCase().includes("fútbol") || m.sportId === 3;

  const eloChanges = isFootballMatch
    ? []
    : history.map((historyItem) => ({
        playerId: historyItem.playerId,
        playerName: playerMap[historyItem.playerId] ?? "Desconocido",
        eloBefore: historyItem.eloBefore,
        eloAfter: historyItem.eloAfter,
        eloChange: historyItem.eloChange,
      }));

  const team1Players = matchPlayers
    .filter((player) => player.team === "team1" && !player.isSubstitute)
    .map((player) => ({
      id: player.playerId,
      name: playerMap[player.playerId] ?? "Desconocido",
      isSubstitute: false,
    }));

  const team1Substitutes = matchPlayers
    .filter((player) => player.team === "team1" && player.isSubstitute)
    .map((player) => ({
      id: player.playerId,
      name: playerMap[player.playerId] ?? "Desconocido",
      isSubstitute: true,
    }));

  const team2Players = matchPlayers
    .filter((player) => player.team === "team2" && !player.isSubstitute)
    .map((player) => ({
      id: player.playerId,
      name: playerMap[player.playerId] ?? "Desconocido",
      isSubstitute: false,
    }));

  const team2Substitutes = matchPlayers
    .filter((player) => player.team === "team2" && player.isSubstitute)
    .map((player) => ({
      id: player.playerId,
      name: playerMap[player.playerId] ?? "Desconocido",
      isSubstitute: true,
    }));

  return {
    id: m.id,
    clubId: m.clubId,

    sportId: m.sportId,

    modalityId: m.modalityId,

    modalityName:
      modality?.name ?? "Desconocida",

    modalitySlug:
      modality?.slug ?? "",

    teamSize:
      modality?.teamSize ?? 0,

    useSets:
      modality?.useSets ?? true,

    sportName:
      sport?.name ??
      "Desconocido",

    sportSlug:
      sport?.slug ?? "",

    matchType:
      (m as any).matchType ?? "internal",

    rivalTeamName:
      (m as any).rivalTeamName ?? null,

    team1Players,

    team1Substitutes,

    team2Players,

    team2Substitutes,

    team1Score:
      m.team1Score,

    team2Score:
      m.team2Score,

    sets:
      m.sets,

    result:
      m.result === "team1" || m.result === "team2" || m.result === "draw"
        ? m.result
        : (m.team1Score ?? 0) > (m.team2Score ?? 0)
          ? "team1"
          : (m.team2Score ?? 0) > (m.team1Score ?? 0)
            ? "team2"
            : "draw",

    status:
      (m as any).status ??
      "confirmed",

    submittedByPlayerId:
      (m as any).submittedByPlayerId ??
      null,

    submittedByPlayerName:
      (m as any).submittedByPlayerId
        ? playerMap[(m as any).submittedByPlayerId] ?? null
        : null,

    confirmedByUserId:
      (m as any).confirmedByUserId ??
      null,

    confirmedAt:
      (m as any).confirmedAt
        ? (m as any).confirmedAt instanceof Date
          ? (m as any).confirmedAt.toISOString()
          : String((m as any).confirmedAt)
        : null,

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
  async (req, res): Promise<void> => {
    const clubId = await resolveEffectiveClubId(req);

    if (!clubId) {
      res.json([]);
      return;
    }

    const rawSportId = req.query.sportId;
    const sportId = rawSportId !== undefined && rawSportId !== "" ? Number(rawSportId) : null;

    const whereClause =
      sportId && Number.isInteger(sportId) && sportId > 0
        ? and(eq(matchesTable.clubId, clubId), eq(matchesTable.sportId, sportId))
        : eq(matchesTable.clubId, clubId);

    const matches = await db
      .select()
      .from(matchesTable)
      .where(whereClause)
      .orderBy(
        desc(
          matchesTable.playedAt
        )
      );

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
  requireAuth,
  requireClub,
  async (req, res): Promise<void> => {
    const {
      sportId,
      modalityId,
      matchType = "internal",
      rivalTeamName,
      team1PlayerIds,
      team1SubstituteIds = [],
      team2PlayerIds = [],
      team2SubstituteIds = [],
      team1Score,
      team2Score,
      sets,
      playedAt,
      encuentroId,
      autoConfirm,
    } = req.body;

    if (!sportId || !playedAt) {
      res.status(400).json({
        error: "Faltan campos requeridos: sportId, playedAt",
      });
      return;
    }

    if (!Array.isArray(team1PlayerIds) || team1PlayerIds.length === 0) {
      res.status(400).json({
        error: "team1PlayerIds debe ser un array con al menos un jugador titular",
      });
      return;
    }

    const isRival = matchType === "rival" || Boolean(rivalTeamName && String(rivalTeamName).trim());
    const normalizedRivalName = rivalTeamName ? String(rivalTeamName).trim() : null;

    if (isRival && !normalizedRivalName) {
      res.status(400).json({
        error: "Debes ingresar el nombre del equipo rival",
      });
      return;
    }

    if (!isRival && (!Array.isArray(team2PlayerIds) || team2PlayerIds.length === 0)) {
      res.status(400).json({
        error: "team2PlayerIds debe ser un array con al menos un jugador titular para partidos internos",
      });
      return;
    }

    let modality = modalityId ? await getSportModality(Number(sportId), Number(modalityId)) : null;
    if (!modality) {
      const [firstModality] = await db
        .select()
        .from(sportModalitiesTable)
        .where(
          and(
            eq(sportModalitiesTable.sportId, Number(sportId)),
            eq(sportModalitiesTable.active, true),
          ),
        )
        .limit(1);
      modality = firstModality ?? null;
    }

    if (!modality) {
      res.status(400).json({ error: "No se encontró una modalidad válida para el deporte seleccionado" });
      return;
    }

    const normalizedTeam1Ids = team1PlayerIds.map(Number);
    const normalizedTeam1SubIds = Array.isArray(team1SubstituteIds) ? team1SubstituteIds.map(Number) : [];
    const normalizedTeam2Ids = isRival ? [] : team2PlayerIds.map(Number);
    const normalizedTeam2SubIds = isRival || !Array.isArray(team2SubstituteIds) ? [] : team2SubstituteIds.map(Number);

    const minTeam = modality.minTeamSize ?? modality.teamSize;
    const maxTeam = modality.maxTeamSize ?? modality.teamSize;

    if (normalizedTeam1Ids.length < minTeam || normalizedTeam1Ids.length > maxTeam) {
      res.status(400).json({
        error:
          minTeam === maxTeam
            ? `El equipo titular debe tener exactamente ${modality.teamSize} jugador(es)`
            : `El equipo titular debe tener entre ${minTeam} y ${maxTeam} jugadores`,
      });
      return;
    }

    if (!isRival) {
      if (normalizedTeam2Ids.length < minTeam || normalizedTeam2Ids.length > maxTeam) {
        res.status(400).json({
          error:
            minTeam === maxTeam
              ? `El equipo 2 titular debe tener exactamente ${modality.teamSize} jugador(es)`
              : `El equipo 2 titular debe tener entre ${minTeam} y ${maxTeam} jugadores`,
        });
        return;
      }
    }

    // Comprobar que no haya duplicados
    const allT1 = [...normalizedTeam1Ids, ...normalizedTeam1SubIds];
    if (new Set(allT1).size !== allT1.length) {
      res.status(400).json({
        error: "Un jugador no puede estar duplicado en el equipo 1 (titulares y suplentes deben ser únicos)",
      });
      return;
    }

    if (!isRival) {
      const allT2 = [...normalizedTeam2Ids, ...normalizedTeam2SubIds];
      if (new Set(allT2).size !== allT2.length) {
        res.status(400).json({
          error: "Un jugador no puede estar duplicado en el equipo 2 (titulares y suplentes deben ser únicos)",
        });
        return;
      }

      const allMatchPlayers = [...allT1, ...allT2];
      if (new Set(allMatchPlayers).size !== allMatchPlayers.length) {
        res.status(400).json({
          error: "Un jugador no puede estar en ambos equipos a la vez",
        });
        return;
      }
    }

    // ----------------------------------------------------------
    // Verificar deporte
    // ----------------------------------------------------------
    const [sport] = await db
      .select()
      .from(sportsTable)
      .where(eq(sportsTable.id, Number(sportId)));

    if (!sport) {
      res.status(404).json({
        error: "Deporte no encontrado",
      });
      return;
    }

    // ----------------------------------------------------------
    // Club actual y verificación de jugadores
    // ----------------------------------------------------------
    const allClubPlayerIdsToCheck = isRival ? allT1 : [...allT1, ...normalizedTeam2Ids, ...normalizedTeam2SubIds];

    let clubId = req.body.clubId ? Number(req.body.clubId) : null;
    if (!clubId && req.headers["x-club-id"]) {
      const headerVal = Number(Array.isArray(req.headers["x-club-id"]) ? req.headers["x-club-id"][0] : req.headers["x-club-id"]);
      if (!isNaN(headerVal) && headerVal > 0) clubId = headerVal;
    }
    if (!clubId && allClubPlayerIdsToCheck.length > 0) {
      const [firstPlayer] = await db
        .select({ clubId: playersTable.clubId })
        .from(playersTable)
        .where(eq(playersTable.id, allClubPlayerIdsToCheck[0]))
        .limit(1);
      if (firstPlayer?.clubId) {
        clubId = firstPlayer.clubId;
      }
    }
    if (!clubId) {
      clubId = await resolveEffectiveClubId(req);
    }
    if (!clubId && req.user) {
      clubId = (req.user as any).clubId;
    }

    if (!clubId) {
      res.status(400).json({ error: "No se pudo determinar el club para el partido" });
      return;
    }

    if (!(await validatePlayersForClub(allClubPlayerIdsToCheck, clubId))) {
      res.status(400).json({ error: "Uno o más jugadores no pertenecen al club actual" });
      return;
    }

    // ----------------------------------------------------------
    // Resultado
    // ----------------------------------------------------------
    const t1Score = team1Score ?? 0;
    const t2Score = team2Score ?? 0;
    let result = "draw";
    if (t1Score > t2Score) {
      result = "team1";
    } else if (t2Score > t1Score) {
      result = "team2";
    }

    const status = autoConfirm ? "confirmed" : "pending_confirmation";

    // ----------------------------------------------------------
    // Crear partido
    // ----------------------------------------------------------
    const [match] = await db
      .insert(matchesTable)
      .values({
        sportId: Number(sportId),
        modalityId: modality.id,
        matchType: isRival ? "rival" : "internal",
        rivalTeamName: isRival ? normalizedRivalName : null,
        clubId,
        team1Score: t1Score,
        team2Score: t2Score,
        sets: sets ?? null,
        result,
        status,
        submittedByPlayerId: (req.user as any)?.playerId ?? null,
        encuentroId: encuentroId ?? null,
        playedAt: new Date(playedAt),
      } as any)
      .returning();

    // ----------------------------------------------------------
    // Crear relación jugadores-partido (titulares y suplentes)
    // ----------------------------------------------------------
    await db
      .insert(playerSportRatingsTable)
      .values(
        allClubPlayerIdsToCheck.map((playerId: number) => ({
          playerId,
          sportId: Number(sportId),
          elo: STARTING_ELO,
        })),
      )
      .onConflictDoNothing({
        target: [playerSportRatingsTable.playerId, playerSportRatingsTable.sportId],
      });

    const matchPlayerValues = [
      ...normalizedTeam1Ids.map((playerId: number) => ({
        matchId: match.id,
        playerId,
        team: "team1",
        isSubstitute: false,
        role: "starter",
      })),
      ...normalizedTeam1SubIds.map((playerId: number) => ({
        matchId: match.id,
        playerId,
        team: "team1",
        isSubstitute: true,
        role: "substitute",
      })),
      ...normalizedTeam2Ids.map((playerId: number) => ({
        matchId: match.id,
        playerId,
        team: "team2",
        isSubstitute: false,
        role: "starter",
      })),
      ...normalizedTeam2SubIds.map((playerId: number) => ({
        matchId: match.id,
        playerId,
        team: "team2",
        isSubstitute: true,
        role: "substitute",
      })),
    ];

    await db.insert(matchPlayersTable).values(matchPlayerValues);

    // ----------------------------------------------------------
    // Elo únicamente si nace confirmado
    // ----------------------------------------------------------
    if (status === "confirmed") {
      await recalculateAllElo();
    }

    res.status(201).json(await enrichMatch(match));
  }
);

// ============================================================
// POST /matches/:id/confirm
// ============================================================

router.post(
  "/matches/:id/confirm",
  requireAuth,
  requireClub,
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

    const user = req.user as any;
    const isStaff = user?.isAdmin === 1 || user?.isClubAdmin === 1;

    if (existing.clubId && existing.clubId !== clubId && !isStaff) {
      res.status(403).json({
        error: "Forbidden",
      });
      return;
    }

    if (!existing.clubId && clubId) {
      existing.clubId = clubId;
      await db.update(matchesTable).set({ clubId }).where(eq(matchesTable.id, id));
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

    const isRivalMatch = (existing as any).matchType === "rival" || Boolean((existing as any).rivalTeamName);

    if (team1.length === 0 || (!isRivalMatch && team2.length === 0)) {
      res.status(400).json({
        error: isRivalMatch
          ? "No se puede confirmar un partido sin jugadores en nuestro equipo"
          : "No se puede confirmar un partido sin jugadores en ambos equipos",
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
    // Reglas de Seguridad Fair Play: Validación Cruzada
    // ----------------------------------------------------------
    if (!isStaff) {
      const userPlayerId = user?.playerId;
      if (!userPlayerId) {
        res.status(403).json({
          error: "Debes tener una ficha de jugador vinculada para confirmar resultados deportivos.",
        });
        return;
      }

      const playerInMatch = matchPlayers.find((p) => p.playerId === userPlayerId);
      if (!playerInMatch) {
        res.status(403).json({
          error: "No participaste en este partido. La confirmación debe ser realizada por un contrincante o por el administrador.",
        });
        return;
      }

      // En partidos internos entre miembros del club: validación cruzada obligatoria
      if (!isRivalMatch) {
        const submitterId = (existing as any).submittedByPlayerId;
        if (submitterId) {
          const submitterInMatch = matchPlayers.find((p) => p.playerId === submitterId);
          if (submitterInMatch && submitterInMatch.team === playerInMatch.team) {
            res.status(400).json({
              error: "No puedes auto-aprobar el marcador cargado por tu propio equipo. La confirmación debe ser realizada por un contrincante o por el administrador del club.",
            });
            return;
          }
        }
      }
    }

    // ----------------------------------------------------------
    // Confirmar y Auditoría
    // ----------------------------------------------------------

    const [updated] =
      await db
        .update(matchesTable)
        .set({
          status: "confirmed",
          confirmedByUserId: String(user.id || user.email || (isStaff ? "admin" : "rival")),
          confirmedAt: new Date(),
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
  requireAuth,
  requireClub,
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
      match.clubId !==
      clubId
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
  requireAuth,
  requireClub,
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

    const user = req.user as any;
    const isStaff = user?.isAdmin === 1 || user?.isClubAdmin === 1;

    let isEncuentroOrganizer = false;
    if (existing.encuentroId) {
      const [encuentro] = await db
        .select()
        .from(encuentrosTable)
        .where(eq(encuentrosTable.id, existing.encuentroId));
      if (
        encuentro &&
        (String(encuentro.organizerId) === String(user?.id) ||
          (user?.playerId && String(encuentro.organizerId) === String(user.playerId)))
      ) {
        isEncuentroOrganizer = true;
      }
    }

    if (existing.clubId && existing.clubId !== clubId && !isStaff && !isEncuentroOrganizer) {
      res.status(403).json({
        error: "Forbidden",
      });
      return;
    }

    if (!existing.clubId && clubId) {
      existing.clubId = clubId;
      await db.update(matchesTable).set({ clubId }).where(eq(matchesTable.id, id));
    }

    const currentMatchPlayers = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, id));

    const isParticipant = Boolean(
      user?.playerId &&
        currentMatchPlayers.some((p) => p.playerId === user.playerId)
    );

    if (!isStaff && !isEncuentroOrganizer && !isParticipant) {
      res.status(403).json({
        error:
          "No tienes permisos para modificar este partido. Solo los jugadores del partido, el organizador del encuentro o los administradores pueden editarlo.",
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

    if (
      !isStaff &&
      !isEncuentroOrganizer &&
      (team1PlayerIds !== undefined || team2PlayerIds !== undefined)
    ) {
      res.status(403).json({
        error:
          "Solo los administradores del club o el organizador del encuentro pueden modificar la alineación de jugadores.",
      });
      return;
    }

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

    if (req.body.rivalTeamName !== undefined) {
      updates.rivalTeamName = req.body.rivalTeamName ? String(req.body.rivalTeamName).trim() : null;
    }

    if (req.body.matchType !== undefined) {
      updates.matchType = req.body.matchType;
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
  requireAuth,
  requireClub,
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
      existing.clubId !==
      clubId
    ) {
      res.status(403).json({
        error:
          "Forbidden",
      });

      return;
    }

    const user = req.user as any;
    const isStaff = user?.isAdmin === 1 || user?.isClubAdmin === 1;

    let isEncuentroOrganizer = false;
    if (existing.encuentroId) {
      const [encuentro] = await db
        .select()
        .from(encuentrosTable)
        .where(eq(encuentrosTable.id, existing.encuentroId));
      if (
        encuentro &&
        (String(encuentro.organizerId) === String(user?.id) ||
          (user?.playerId && String(encuentro.organizerId) === String(user.playerId)))
      ) {
        isEncuentroOrganizer = true;
      }
    }

    if (!isStaff && !isEncuentroOrganizer) {
      res.status(403).json({
        error: "Solo los administradores del club o el organizador del encuentro pueden eliminar partidos.",
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