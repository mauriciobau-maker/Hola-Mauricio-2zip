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
  await db.update(playersTable).set({ elo: STARTING_ELO });
  await db.delete(eloHistoryTable);

  const allMatches = await db
    .select()
    .from(matchesTable)
    .orderBy(asc(matchesTable.playedAt));

  const confirmedMatches = allMatches.filter((match: any) => {
    if (match.status !== "confirmed") return false;
    if (match.team1Score === 0 && match.team2Score === 0) return false;
    if (
      match.result !== "team1" &&
      match.result !== "team2" &&
      match.result !== "draw"
    ) return false;
    return true;
  });

  if (confirmedMatches.length === 0) return;

  const players = await db.select().from(playersTable);
  const eloByClub: Record<number, Record<number, number>> = {};

  for (const player of players) {
    const clubId = player.clubId;
    if (clubId == null) continue;
    if (!eloByClub[clubId]) eloByClub[clubId] = {};
    eloByClub[clubId][player.id] = STARTING_ELO;
  }

  for (const match of confirmedMatches) {
    const clubId = match.clubId;
    if (clubId == null) continue;
    if (!eloByClub[clubId]) eloByClub[clubId] = {};

    const playersInMatch = await db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, match.id));

    const team1 = playersInMatch
      .filter((player) => player.team === "team1")
      .map((player) => ({
        id: player.playerId,
        elo: eloByClub[clubId][player.playerId] ?? STARTING_ELO,
      }));

    const team2 = playersInMatch
      .filter((player) => player.team === "team2")
      .map((player) => ({
        id: player.playerId,
        elo: eloByClub[clubId][player.playerId] ?? STARTING_ELO,
      }));

    if (team1.length === 0 || team2.length === 0) continue;

    const team1Won = match.result === "team1";
    const isDraw = match.result === "draw";
    const changes = isDraw
      ? calculateMatchEloChanges(team1, team2, false, true)
      : calculateMatchEloChanges(team1, team2, team1Won);

    await db.insert(eloHistoryTable).values(
      changes.map((change) => ({
        playerId: change.playerId,
        matchId: match.id,
        sportId: match.sportId,
        eloBefore: change.eloBefore,
        eloAfter: change.eloAfter,
        eloChange: change.eloChange,
      }))
    );

    for (const change of changes) {
      eloByClub[clubId][change.playerId] = change.eloAfter;
    }
  }

  for (const player of players) {
    const clubId = player.clubId;
    if (clubId == null) continue;
    const finalElo = eloByClub[clubId]?.[player.id];
    if (finalElo === undefined) continue;
    await db
      .update(playersTable)
      .set({ elo: finalElo })
      .where(eq(playersTable.id, player.id));
  }
}

async function recalculateAllElo(): Promise<void> {
  return recalculateSportElo();
}

async function enrichMatch(m: typeof matchesTable.$inferSelect) {
  const matchPlayers = await db
    .select()
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.matchId, m.id));

  const clubPlayers =
    m.clubId == null
      ? []
      : await db
          .select()
          .from(playersTable)
          .where(eq(playersTable.clubId, m.clubId));

  const playerMap: Record<number, string> = {};
  for (const player of clubPlayers) playerMap[player.id] = player.name;

  const clubPlayerIds = new Set(clubPlayers.map((p) => p.id));
  const filteredMatchPlayers = matchPlayers.filter((mp) =>
    clubPlayerIds.has(mp.playerId)
  );

  const [sport] = await db
    .select()
    .from(sportsTable)
    .where(eq(sportsTable.id, m.sportId));

  const [modality] = await db
    .select()
    .from(sportModalitiesTable)
    .where(eq(sportModalitiesTable.id, m.modalityId));

  const history = await db
    .select()
    .from(eloHistoryTable)
    .where(eq(eloHistoryTable.matchId, m.id));

  const filteredHistory = history.filter((h) => clubPlayerIds.has(h.playerId));
  const eloChanges = filteredHistory.map((historyItem) => ({
    playerId: historyItem.playerId,
    playerName: playerMap[historyItem.playerId] ?? "Desconocido",
    eloBefore: historyItem.eloBefore,
    eloAfter: historyItem.eloAfter,
    eloChange: historyItem.eloChange,
  }));

  const team1Players = filteredMatchPlayers
    .filter((player) => player.team === "team1")
    .map((player) => ({
      id: player.playerId,
      name: playerMap[player.playerId] ?? "Desconocido",
    }));

  const team2Players = filteredMatchPlayers
    .filter((player) => player.team === "team2")
    .map((player) => ({
      id: player.playerId,
      name: playerMap[player.playerId] ?? "Desconocido",
    }));

  return {
    id: m.id,
    sportId: m.sportId,
    modalityId: m.modalityId,
    modalityName: modality?.name ?? "Desconocida",
    teamSize: modality?.teamSize ?? 0,
    useSets: modality?.useSets ?? true,
    sportName: sport?.name ?? "Desconocido",
    sportSlug: sport?.slug ?? "",
    team1Players,
    team2Players,
    team1Score: m.team1Score,
    team2Score: m.team2Score,
    sets: m.sets,
    result: m.result,
    status: (m as any).status ?? "confirmed",
    reportedBy: (m as any).reportedBy ?? null,
    encuentroId: (m as any).encuentroId ?? null,
    playedAt: m.playedAt instanceof Date ? m.playedAt.toISOString() : String(m.playedAt),
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    eloChanges,
  };
}

router.use(requireCommunityAccess);

router.get("/matches", async (req, res): Promise<void> => {
  try {
    const user = req.user as { clubId?: number | null } | undefined;
    const clubId = isSuperAdminUser(req.user) ? null : user?.clubId ?? null;

    const matches = clubId == null
      ? await db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt))
      : await db
          .select()
          .from(matchesTable)
          .where(eq(matchesTable.clubId, clubId))
          .orderBy(desc(matchesTable.playedAt));

    const enriched = await Promise.all(matches.map(enrichMatch));
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/matches/:id", async (req, res): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [match] = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, id));

    if (!match) {
      res.status(404).json({ error: "Partido no encontrado" });
      return;
    }

    const user = req.user as { clubId?: number | null } | undefined;
    if (!isSuperAdminUser(req.user) && match.clubId !== user?.clubId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json(await enrichMatch(match));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/matches", async (req, res): Promise<void> => {
  try {
    const user = req.user as { clubId?: number | null } | undefined;
    const body = req.body?.data ?? req.body;
    const requestedClubId = body.clubId === undefined ? null : Number(body.clubId);
    const clubId = isSuperAdminUser(req.user) ? requestedClubId : user?.clubId ?? null;

    if (clubId == null || !Number.isInteger(clubId) || clubId <= 0) {
      res.status(400).json({ error: "Club inválido" });
      return;
    }

    const {
      sportId,
      modalityId,
      team1PlayerIds,
      team2PlayerIds,
      team1Score,
      team2Score,
      sets,
      result,
      status,
      playedAt,
      encuentroId,
    } = body;

    const resolvedSportId = Number(sportId ?? 1);
    const modality = await getSportModality(resolvedSportId, modalityId);
    if (!modality) {
      res.status(400).json({ error: "Modalidad no válida" });
      return;
    }

    const team1Ids = Array.isArray(team1PlayerIds) ? team1PlayerIds.map(Number) : [];
    const team2Ids = Array.isArray(team2PlayerIds) ? team2PlayerIds.map(Number) : [];
    const allPlayerIds = [...team1Ids, ...team2Ids];

    if (team1Ids.length !== modality.teamSize || team2Ids.length !== modality.teamSize) {
      res.status(400).json({ error: `Cada equipo debe tener exactamente ${modality.teamSize} jugador(es)` });
      return;
    }

    if (new Set(allPlayerIds).size !== allPlayerIds.length) {
      res.status(400).json({ error: "Un jugador no puede estar en ambos equipos" });
      return;
    }

    if (!(await validatePlayersForClub(allPlayerIds, clubId))) {
      res.status(400).json({ error: "Uno o más jugadores no pertenecen al club actual" });
      return;
    }

    const finalStatus = status ?? "confirmed";
    const finalTeam1Score = Number(team1Score ?? 0);
    const finalTeam2Score = Number(team2Score ?? 0);
    const finalResult =
      result ??
      (finalTeam1Score > finalTeam2Score
        ? "team1"
        : finalTeam2Score > finalTeam1Score
          ? "team2"
          : "draw");

    if (finalStatus === "confirmed" && finalTeam1Score === 0 && finalTeam2Score === 0) {
      res.status(400).json({ error: "Un partido confirmado debe tener un resultado válido" });
      return;
    }

    const [created] = await db
      .insert(matchesTable)
      .values({
        clubId,
        sportId: resolvedSportId,
        modalityId: modality.id,
        team1Score: finalTeam1Score,
        team2Score: finalTeam2Score,
        result: finalResult,
        status: finalStatus,
        sets: sets ?? null,
        playedAt: playedAt ? new Date(playedAt) : new Date(),
        encuentroId: encuentroId ? Number(encuentroId) : null,
      } as any)
      .returning();

    await db.insert(matchPlayersTable).values([
      ...team1Ids.map((playerId) => ({ matchId: created.id, playerId, team: "team1" as const })),
      ...team2Ids.map((playerId) => ({ matchId: created.id, playerId, team: "team2" as const })),
    ]);

    await recalculateAllElo();
    res.status(201).json(await enrichMatch(created));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/matches/:id", async (req, res): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Partido no encontrado" });
      return;
    }

    const user = req.user as { clubId?: number | null } | undefined;
    const clubId = existing.clubId;
    if (!isSuperAdminUser(req.user) && existing.clubId !== user?.clubId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (clubId == null) {
      res.status(400).json({ error: "El partido no tiene club asociado" });
      return;
    }

    const {
      team1Score,
      team2Score,
      sets,
      status,
      playedAt,
      modalityId,
      team1PlayerIds,
      team2PlayerIds,
    } = req.body?.data ?? req.body;

    const resultingModalityId = modalityId === undefined ? existing.modalityId : Number(modalityId);
    const modality = await getSportModality(existing.sportId, resultingModalityId);
    if (!modality) {
      res.status(400).json({ error: "Modalidad no válida" });
      return;
    }

    const resultingTeam1Score = team1Score ?? existing.team1Score;
    const resultingTeam2Score = team2Score ?? existing.team2Score;
    const resultingStatus = status ?? (existing as any).status ?? "confirmed";

    let newTeam1Ids: number[] | null = null;
    let newTeam2Ids: number[] | null = null;

    if (team1PlayerIds !== undefined || team2PlayerIds !== undefined) {
      newTeam1Ids = Array.isArray(team1PlayerIds) ? team1PlayerIds.map(Number) : [];
      newTeam2Ids = Array.isArray(team2PlayerIds) ? team2PlayerIds.map(Number) : [];
      const allIds = [...newTeam1Ids, ...newTeam2Ids];

      if (new Set(allIds).size !== allIds.length) {
        res.status(400).json({ error: "Un jugador no puede estar en ambos equipos" });
        return;
      }
      if (newTeam1Ids.length === 0 || newTeam2Ids.length === 0) {
        res.status(400).json({ error: "Cada equipo debe tener al menos un jugador" });
        return;
      }
      if (newTeam1Ids.length !== modality.teamSize || newTeam2Ids.length !== modality.teamSize) {
        res.status(400).json({ error: `Cada equipo debe tener exactamente ${modality.teamSize} jugador(es)` });
        return;
      }
      if (!(await validatePlayersForClub(allIds, clubId))) {
        res.status(400).json({ error: "Uno o más jugadores no pertenecen al club actual", playerIds: allIds });
        return;
      }
    }

    if (resultingStatus === "confirmed" && resultingTeam1Score === 0 && resultingTeam2Score === 0) {
      res.status(400).json({ error: "Un partido confirmado debe tener un resultado válido" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (team1Score !== undefined) updates.team1Score = team1Score;
    if (team2Score !== undefined) updates.team2Score = team2Score;
    if (sets !== undefined) updates.sets = sets;
    if (playedAt !== undefined) updates.playedAt = new Date(playedAt);
    if (status !== undefined) updates.status = status;
    if (modalityId !== undefined) updates.modalityId = resultingModalityId;
    updates.result =
      resultingTeam1Score > resultingTeam2Score
        ? "team1"
        : resultingTeam2Score > resultingTeam1Score
          ? "team2"
          : "draw";

    const [updated] = await db.update(matchesTable).set(updates).where(eq(matchesTable.id, id)).returning();

    if (newTeam1Ids !== null && newTeam2Ids !== null) {
      await db
        .insert(playerSportRatingsTable)
        .values([...newTeam1Ids, ...newTeam2Ids].map((playerId) => ({ playerId, sportId: existing.sportId, elo: STARTING_ELO })))
        .onConflictDoNothing({
          target: [playerSportRatingsTable.playerId, playerSportRatingsTable.sportId],
        });

      await db.delete(matchPlayersTable).where(eq(matchPlayersTable.matchId, id));
      await db.insert(matchPlayersTable).values([
        ...newTeam1Ids.map((playerId) => ({ matchId: id, playerId, team: "team1" as const })),
        ...newTeam2Ids.map((playerId) => ({ matchId: id, playerId, team: "team2" as const })),
      ]);
    }

    await recalculateAllElo();
    res.json(await enrichMatch(updated));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/matches/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const user = req.user as { clubId?: number | null } | undefined;
  const [existing] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Partido no encontrado" });
    return;
  }

  if (!isSuperAdminUser(req.user) && existing.clubId !== user?.clubId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(matchesTable).where(eq(matchesTable.id, id));
  await recalculateAllElo();
  res.sendStatus(204);
});

router.get("/sports", async (req, res): Promise<void> => {
  const clubId = (req.user as { clubId?: number | null } | undefined)?.clubId;

  if (clubId) {
    const sports = await db
      .select({
        id: sportsTable.id,
        name: sportsTable.name,
        slug: sportsTable.slug,
        teamSize: sportsTable.teamSize,
        useSets: sportsTable.useSets,
        active: sportsTable.active,
      })
      .from(sportsTable)
      .innerJoin(clubSportsTable, eq(clubSportsTable.sportId, sportsTable.id))
      .where(
        and(
          eq(clubSportsTable.clubId, clubId),
          eq(clubSportsTable.active, true),
          eq(sportsTable.active, true)
        )
      );
    res.json(sports);
    return;
  }

  const sports = await db
    .select()
    .from(sportsTable)
    .where(eq(sportsTable.active, true));
  res.json(sports);
});

export default router;
