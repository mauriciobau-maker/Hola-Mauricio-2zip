import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  encuentrosTable,
  asistenciaTable,
  playersTable,
  matchesTable,
  matchPlayersTable,
  sportModalitiesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

async function getAsistenciaList(encuentroId: number) {
  const players = await db.select().from(playersTable);
  const playerMap: Record<
    number,
    {
      name: string;
      nickname: string | null;
      phone: string | null;
      language: string | null;
    }
  > = {};

  for (const p of players) {
    playerMap[p.id] = {
      name: p.name,
      nickname: p.nickname ?? null,
      phone: (p as any).phone ?? null,
      language: (p as any).language ?? "es",
    };
  }

  const rows = await db
    .select()
    .from(asistenciaTable)
    .where(eq(asistenciaTable.encuentroId, encuentroId));

  const uniqueRowsMap = new Map<number, typeof rows[0]>();
  for (const r of rows) {
    if (!uniqueRowsMap.has(r.playerId)) {
      uniqueRowsMap.set(r.playerId, r);
    } else {
      const existing = uniqueRowsMap.get(r.playerId)!;
      if (r.id > existing.id) {
        uniqueRowsMap.set(r.playerId, r);
      }
    }
  }

  const cleanRows = Array.from(uniqueRowsMap.values());

  return cleanRows.map((r) => ({
    id: r.id,
    encuentroId: r.encuentroId,
    playerId: r.playerId,
    playerName: playerMap[r.playerId]?.name ?? "Desconocido",
    playerNickname: playerMap[r.playerId]?.nickname ?? null,
    playerPhone: playerMap[r.playerId]?.phone ?? null,
    playerLanguage: playerMap[r.playerId]?.language ?? "es",
    status: r.status,
    respondedAt: r.respondedAt
      ? r.respondedAt instanceof Date
        ? r.respondedAt.toISOString()
        : String(r.respondedAt)
      : null,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
  }));
}

// GET /api/encuentros
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userClubId = (req as any).user?.clubId;
    const queryClubId = req.query.clubId ? parseInt(req.query.clubId as string, 10) : null;
    const effectiveClubId = queryClubId || userClubId;

    let query = db.select().from(encuentrosTable);
    const list = effectiveClubId
      ? await db.select().from(encuentrosTable).where(eq(encuentrosTable.clubId, effectiveClubId))
      : await db.select().from(encuentrosTable);

    const result = await Promise.all(
      list.map(async (e) => {
        const asistencia = await getAsistenciaList(e.id);
        const formattedEncuentro = {
          ...e,
          dateTime:
            e.dateTime instanceof Date
              ? e.dateTime.toISOString()
              : String(e.dateTime),
          createdAt:
            e.createdAt instanceof Date
              ? e.createdAt.toISOString()
              : String(e.createdAt),
        };

        return {
          ...formattedEncuentro,
          encuentro: formattedEncuentro,
          asistencia,
        };
      })
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/encuentros/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const [e] = await db
      .select()
      .from(encuentrosTable)
      .where(eq(encuentrosTable.id, id));
    if (!e) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    const asistencia = await getAsistenciaList(id);
    res.json({
      encuentro: {
        ...e,
        dateTime:
          e.dateTime instanceof Date
            ? e.dateTime.toISOString()
            : String(e.dateTime),
        createdAt:
          e.createdAt instanceof Date
            ? e.createdAt.toISOString()
            : String(e.createdAt),
      },
      asistencia,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/encuentros
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    const bodyData = req.body.data ?? req.body;
    const { title, dateTime, location, maxSpots, notes, playerIds, durationMinutes, courtsAvailable, sportId, formato } = bodyData;

    const effectiveClubId = bodyData.clubId
      ? Number(bodyData.clubId)
      : req.headers["x-club-id"]
      ? Number(req.headers["x-club-id"])
      : (user.clubId || null);

    const [created] = await db
      .insert(encuentrosTable)
      .values({
        title,
        dateTime: new Date(dateTime),
        location,
        maxSpots: maxSpots ? parseInt(maxSpots, 10) : null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 90,
        courtsAvailable: courtsAvailable ? parseInt(courtsAvailable, 10) : 1,
        sportId: sportId ? parseInt(sportId, 10) : null,
        formato: formato || (sportId === 3 ? "pichanga" : "americana"),
        notes: notes || null,
        clubId: effectiveClubId,
        organizerId: user.id ? String(user.id) : null,
      })
      .returning();

    const uniquePlayerIds = new Set<number>();
    if (playerIds && Array.isArray(playerIds) && playerIds.length > 0) {
      for (const pid of playerIds) {
        if (pid) uniquePlayerIds.add(Number(pid));
      }
    }

    // Auto-confirm the creator if linked to a player profile
    if (user.playerId) {
      uniquePlayerIds.add(Number(user.playerId));
    }

    for (const playerId of uniquePlayerIds) {
      const isCreator = user.playerId && Number(user.playerId) === playerId;
      await db.insert(asistenciaTable).values({
        encuentroId: created.id,
        playerId,
        status: isCreator ? "confirmed" : "pending",
        respondedAt: isCreator ? new Date() : null,
      });
    }

    const asistencia = await getAsistenciaList(created.id);
    const formattedEncuentro = {
      ...created,
      dateTime:
        created.dateTime instanceof Date
          ? created.dateTime.toISOString()
          : String(created.dateTime),
      createdAt:
        created.createdAt instanceof Date
          ? created.createdAt.toISOString()
          : String(created.createdAt),
    };

    res.status(201).json({
      ...formattedEncuentro,
      encuentro: formattedEncuentro,
      asistencia,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/encuentros/:id
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const [e] = await db.select().from(encuentrosTable).where(eq(encuentrosTable.id, id));
    if (!e) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    const isOrganizer =
      String(user.id) === String(e.organizerId) ||
      Boolean(user.isAdmin) ||
      Boolean(user.isClubAdmin && user.isClubAdmin > 0) ||
      (user.playerId && String(user.playerId) === String(e.organizerId));
    if (!isOrganizer) {
      res.status(403).json({ message: "Solo el organizador o administrador puede editar este encuentro." });
      return;
    }

    const bodyData = req.body.data ?? req.body;
    const updates: Record<string, any> = {};

    if (bodyData.title !== undefined) updates.title = bodyData.title.trim();
    if (bodyData.dateTime !== undefined) updates.dateTime = new Date(bodyData.dateTime);
    if (bodyData.location !== undefined) updates.location = bodyData.location.trim();
    if (bodyData.maxSpots !== undefined) {
      updates.maxSpots = bodyData.maxSpots ? parseInt(bodyData.maxSpots, 10) : null;
    }
    if (bodyData.durationMinutes !== undefined) {
      updates.durationMinutes = bodyData.durationMinutes ? parseInt(bodyData.durationMinutes, 10) : 90;
    }
    if (bodyData.courtsAvailable !== undefined) {
      updates.courtsAvailable = bodyData.courtsAvailable ? parseInt(bodyData.courtsAvailable, 10) : 1;
    }
    if (bodyData.notes !== undefined) updates.notes = bodyData.notes ? bodyData.notes.trim() : null;
    if (bodyData.sportId !== undefined) updates.sportId = bodyData.sportId ? parseInt(bodyData.sportId, 10) : null;
    if (bodyData.formato !== undefined) updates.formato = bodyData.formato;

    const [updated] = await db
      .update(encuentrosTable)
      .set(updates)
      .where(eq(encuentrosTable.id, id))
      .returning();

    // Si se modificó maxSpots, reajustar lista de confirmados vs reserva
    if (updates.maxSpots !== undefined) {
      const asistenciaActual = await getAsistenciaList(id);
      const limit = updates.maxSpots;
      if (limit && limit > 0) {
        const confirmados = asistenciaActual.filter((a) => a.status === "confirmed");
        if (confirmados.length > limit) {
          const excedent = confirmados.slice(limit);
          for (const exc of excedent) {
            await db
              .update(asistenciaTable)
              .set({ status: "waitlist" })
              .where(and(eq(asistenciaTable.encuentroId, id), eq(asistenciaTable.playerId, exc.playerId)));
          }
        } else if (confirmados.length < limit) {
          const enReserva = asistenciaActual.filter((a) => a.status === "waitlist" || a.status === "reserva");
          const slots = limit - confirmados.length;
          const aPromover = enReserva.slice(0, slots);
          for (const prom of aPromover) {
            await db
              .update(asistenciaTable)
              .set({ status: "confirmed" })
              .where(and(eq(asistenciaTable.encuentroId, id), eq(asistenciaTable.playerId, prom.playerId)));
          }
        }
      }
    }

    const asistenciaFinal = await getAsistenciaList(id);
    res.json({
      encuentro: {
        ...updated,
        dateTime: updated.dateTime instanceof Date ? updated.dateTime.toISOString() : String(updated.dateTime),
        createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : String(updated.createdAt),
      },
      asistencia: asistenciaFinal,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/encuentros/:id/rsvp
router.post("/:id/rsvp", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    const rawId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const { status, playerId: reqPlayerId } = req.body;

    const targetPlayerId = reqPlayerId ? Number(reqPlayerId) : user.playerId;

    if (!targetPlayerId) {
      res
        .status(400)
        .json({ message: "No se encontró un jugador válido para actualizar" });
      return;
    }

    const [e] = await db
      .select()
      .from(encuentrosTable)
      .where(eq(encuentrosTable.id, encuentroId));

    if (!e) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    // Seguridad: Si se intenta modificar la asistencia de otro jugador, debe ser organizador del encuentro o admin
    if (reqPlayerId && Number(reqPlayerId) !== user.playerId) {
      const isOrganizer = user.id === e.organizerId || user.isAdmin;
      if (!isOrganizer) {
        res.status(403).json({
          message: "Solo el organizador del encuentro o un administrador puede confirmar o modificar la asistencia de otros participantes.",
        });
        return;
      }
    }

    let finalStatus = status;

    if (status === "confirmed") {
      const asistenciaActual = await getAsistenciaList(encuentroId);
      const confirmedCount = asistenciaActual.filter(
        (a) => a.status === "confirmed" && a.playerId !== targetPlayerId
      ).length;

      if (e.maxSpots && confirmedCount >= e.maxSpots) {
        const waitlistCount = asistenciaActual.filter(
          (a) =>
            (a.status === "waitlist" || a.status === "reserva") &&
            a.playerId !== targetPlayerId
        ).length;

        if (waitlistCount >= 3) {
          res.status(400).json({
            message: `El encuentro y la lista de reserva (máximo 3 cupos) están completamente llenos.`,
          });
          return;
        }

        finalStatus = "waitlist";
      }
    }

    const existingRows = await db
      .select()
      .from(asistenciaTable)
      .where(
        and(
          eq(asistenciaTable.encuentroId, encuentroId),
          eq(asistenciaTable.playerId, targetPlayerId)
        )
      );

    if (existingRows.length > 0) {
      const mainRecord = existingRows[0];
      await db
        .update(asistenciaTable)
        .set({ status: finalStatus, respondedAt: new Date() })
        .where(eq(asistenciaTable.id, mainRecord.id));

      if (existingRows.length > 1) {
        for (let i = 1; i < existingRows.length; i++) {
          await db
            .delete(asistenciaTable)
            .where(eq(asistenciaTable.id, existingRows[i].id));
        }
      }
    } else {
      await db.insert(asistenciaTable).values({
        encuentroId,
        playerId: targetPlayerId,
        status: finalStatus,
        respondedAt: new Date(),
      });
    }

    let asistenciaActualizada = await getAsistenciaList(encuentroId);
    const confirmedActual = asistenciaActualizada.filter(
      (a) => a.status === "confirmed"
    ).length;

    if (!e.maxSpots || confirmedActual < e.maxSpots) {
      const enReserva = asistenciaActualizada
        .filter((a) => a.status === "waitlist" || a.status === "reserva")
        .sort((a, b) => {
          const tA = a.respondedAt ? new Date(a.respondedAt).getTime() : 0;
          const tB = b.respondedAt ? new Date(b.respondedAt).getTime() : 0;
          return tA - tB;
        });

      if (enReserva.length > 0) {
        const promovido = enReserva[0];
        await db
          .update(asistenciaTable)
          .set({ status: "confirmed", respondedAt: new Date() })
          .where(eq(asistenciaTable.id, promovido.id));

        asistenciaActualizada = await getAsistenciaList(encuentroId);
      }
    }

    res.json({
      encuentro: {
        ...e,
        dateTime:
          e?.dateTime instanceof Date
            ? e.dateTime.toISOString()
            : String(e?.dateTime),
        createdAt:
          e?.createdAt instanceof Date
            ? e.createdAt.toISOString()
            : String(e?.createdAt),
      },
      asistencia: asistenciaActualizada,
      assignedStatus: finalStatus,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/encuentros/:id
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const [e] = await db
      .select()
      .from(encuentrosTable)
      .where(eq(encuentrosTable.id, id));
    if (!e) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    if (e.organizerId !== user.id && !user.isAdmin) {
      res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este encuentro" });
      return;
    }

    // 🧹 Limpieza en cascada: eliminar partidos y relaciones antes del encuentro
    const existingMatches = await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(eq(matchesTable.encuentroId, id));

    for (const match of existingMatches) {
      await db
        .delete(matchPlayersTable)
        .where(eq(matchPlayersTable.matchId, match.id));
    }

    await db.delete(matchesTable).where(eq(matchesTable.encuentroId, id));
    await db.delete(asistenciaTable).where(eq(asistenciaTable.encuentroId, id));
    await db.delete(encuentrosTable).where(eq(encuentrosTable.id, id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/encuentros/:id/partidos
router.get("/:id/partidos", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    const rawMatches = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.encuentroId, encuentroId))
      .orderBy(matchesTable.round, matchesTable.court, matchesTable.id);

    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]));

    const formattedMatches = await Promise.all(
      rawMatches.map(async (match) => {
        const matchPlayers = await db
          .select()
          .from(matchPlayersTable)
          .where(eq(matchPlayersTable.matchId, match.id));

        const team1 = matchPlayers
          .filter((mp) => mp.team === "team1")
          .map((mp) => ({
            id: mp.playerId,
            name: playerMap.get(mp.playerId) ?? `Jugador ${mp.playerId}`,
          }));

        const team2 = matchPlayers
          .filter((mp) => mp.team === "team2")
          .map((mp) => ({
            id: mp.playerId,
            name: playerMap.get(mp.playerId) ?? `Jugador ${mp.playerId}`,
          }));

        return {
          id: match.id,
          encuentroId: match.encuentroId,
          round: match.round ?? 1,
          court: match.court ?? 1,
          team1Players: team1,
          team2Players: team2,
          team1Score: match.team1Score ?? 0,
          team2Score: match.team2Score ?? 0,
          result: match.result,
          sets: match.sets,
          status: match.status,
          pendingResult: match.result === "pending",
          playedAt:
            match.playedAt instanceof Date
              ? match.playedAt.toISOString()
              : String(match.playedAt),
        };
      })
    );

    res.json(formattedMatches);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/encuentros/:id/partidos
router.delete("/:id/partidos", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    const [e] = await db.select().from(encuentrosTable).where(eq(encuentrosTable.id, encuentroId));
    if (!e) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    const isOrganizer = user.id === e.organizerId || user.isAdmin;
    if (!isOrganizer) {
      res.status(403).json({ message: "Solo el organizador o un administrador puede eliminar los partidos del encuentro." });
      return;
    }

    const oldMatches = await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(eq(matchesTable.encuentroId, encuentroId));

    for (const oldMatch of oldMatches) {
      await db.delete(matchPlayersTable).where(eq(matchPlayersTable.matchId, oldMatch.id));
    }
    await db.delete(matchesTable).where(eq(matchesTable.encuentroId, encuentroId));

    res.json({ success: true, message: "Partidos del encuentro eliminados correctamente." });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/encuentros/:id/partidos/:matchId -> Guardar resultado / sets del partido
router.patch("/:id/partidos/:matchId", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawMatchId = req.params.matchId;
    const matchId = parseInt(Array.isArray(rawMatchId) ? rawMatchId[0] : rawMatchId, 10);
    const rawEncuentroId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawEncuentroId) ? rawEncuentroId[0] : rawEncuentroId, 10);

    const { team1Score, team2Score, result, sets, status } = req.body;

    const [existingMatch] = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId));

    if (!existingMatch) {
      res.status(404).json({ message: "Partido no encontrado" });
      return;
    }

    const t1 = team1Score !== undefined ? Number(team1Score) : existingMatch.team1Score ?? 0;
    const t2 = team2Score !== undefined ? Number(team2Score) : existingMatch.team2Score ?? 0;

    const updateData: Record<string, any> = {};
    if (team1Score !== undefined) updateData.team1Score = t1;
    if (team2Score !== undefined) updateData.team2Score = t2;
    if (sets !== undefined) updateData.sets = sets;

    if (result !== undefined) {
      updateData.result = result;
    } else if (team1Score !== undefined && team2Score !== undefined) {
      updateData.result = t1 > t2 ? "team1" : t2 > t1 ? "team2" : "draw";
    }

    if (status !== undefined) {
      updateData.status = status;
    } else if (t1 > 0 || t2 > 0) {
      updateData.status = "confirmed";
    }

    // Asegurar clubId si no estaba asignado
    if (!existingMatch.clubId) {
      const [encuentro] = await db
        .select({ clubId: encuentrosTable.clubId })
        .from(encuentrosTable)
        .where(eq(encuentrosTable.id, encuentroId));
      const effectiveClubId = encuentro?.clubId || (req.user as any)?.clubId || 1;
      updateData.clubId = effectiveClubId;
    }

    const [updated] = await db
      .update(matchesTable)
      .set(updateData)
      .where(eq(matchesTable.id, matchId))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/encuentros/:id/finalizar
router.patch("/:id/finalizar", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    const matches = await db.select().from(matchesTable).where(eq(matchesTable.encuentroId, encuentroId));
    const pendingCount = matches.filter((m) => m.status === "pending_confirmation" || m.result === "pending").length;

    const [updated] = await db
      .update(encuentrosTable)
      .set({ estado: "finalizado" })
      .where(eq(encuentrosTable.id, encuentroId))
      .returning();

    res.json({
      success: true,
      encuentro: updated,
      pendingCount,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/encuentros/:id/generar-partidos
router.post("/:id/generar-partidos", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const {
      formato = "americana",
      sportId,
      teamSize,
      modalityId,
      courts,
      rounds,
      previewOnly,
      rivalTeamName,
    } = req.body;

    const asistencia = await getAsistenciaList(encuentroId);
    const confirmados = asistencia.filter((a) => a.status === "confirmed");

    const [encuentroDb] = await db
      .select()
      .from(encuentrosTable)
      .where(eq(encuentrosTable.id, encuentroId));

    // Deportes: 1 = Pádel, 2 = Tenis, 3 = Fútbol
    const idDeDeporte = sportId ? Number(sportId) : (encuentroDb?.sportId ? Number(encuentroDb.sportId) : 1);
    const isFootball =
      idDeDeporte === 3 ||
      encuentroDb?.title?.toLowerCase().includes("fútbol") ||
      encuentroDb?.title?.toLowerCase().includes("futbol") ||
      encuentroDb?.title?.toLowerCase().includes("pichanga");

    let sizePorEquipo = 2;
    if (isFootball) {
      if (teamSize) {
        sizePorEquipo = Number(teamSize);
      } else if (confirmados.length >= 22) {
        sizePorEquipo = 11;
      } else if (confirmados.length >= 14) {
        sizePorEquipo = 7;
      } else if (confirmados.length >= 10) {
        sizePorEquipo = 5;
      } else {
        sizePorEquipo = Math.max(2, Math.floor(confirmados.length / 2));
      }
    } else {
      sizePorEquipo = teamSize ? Number(teamSize) : 2;
    }

    const modalityRows = await db
      .select()
      .from(sportModalitiesTable)
      .where(eq(sportModalitiesTable.sportId, idDeDeporte));

    let modality = modalityId
      ? modalityRows.find((row) => row.id === Number(modalityId))
      : modalityRows.find((row) => row.teamSize === sizePorEquipo && row.active);

    if (!modality && modalityRows.length > 0) {
      modality = [...modalityRows].sort(
        (a, b) => Math.abs(a.teamSize - sizePorEquipo) - Math.abs(b.teamSize - sizePorEquipo)
      )[0];
    }
    const safeModalityId = modality?.id || (modalityRows[0]?.id ?? 1);

    const minJugadores = isFootball
      ? (formato === "triangular" ? 6 : Math.min(4, sizePorEquipo * 2))
      : sizePorEquipo * 2;

    if (confirmados.length < minJugadores) {
      res.status(400).json({
        message: isFootball
          ? `Se requieren al menos ${minJugadores} jugadores confirmados para armar partidos de fútbol. Actualmente hay ${confirmados.length}.`
          : `Se requieren al menos ${minJugadores} jugadores confirmados para generar partidos (Tamaño por equipo requerido: ${sizePorEquipo}). Actualmente hay ${confirmados.length}.`,
      });
      return;
    }

    // Traer información deportiva completa para balancear por Elo
    const allDbPlayers = await db.select().from(playersTable);
    const playerDetailMap = new Map<number, any>();
    for (const p of allDbPlayers) {
      playerDetailMap.set(p.id, p);
    }

    // Ordenar confirmados por Elo descendente
    const sortedPlayers = [...confirmados].sort((a, b) => {
      const eloA = playerDetailMap.get(a.playerId)?.elo || 1500;
      const eloB = playerDetailMap.get(b.playerId)?.elo || 1500;
      return eloB - eloA;
    });

    type MatchFixture = {
      round: number;
      court: number;
      team1: number[];
      team2: number[];
      team1Starters?: number[];
      team1Subs?: number[];
      team2Starters?: number[];
      team2Subs?: number[];
      resting?: number[];
      matchType?: string;
      rivalTeamName?: string;
    };

    const crucesPartidos: MatchFixture[] = [];
    let canchas = 1;
    let numRondas = 1;
    let jugadoresPorTurno = confirmados.length;
    let descansanPorTurno = 0;

    if (isFootball) {
      canchas = courts ? Math.max(1, Number(courts)) : 1;

      if (formato === "triangular") {
        numRondas = 3;
        // Distribuir jugadores en 3 equipos equilibrados por Elo mediante snake-draft de 3 vías
        const teamA: number[] = [];
        const teamB: number[] = [];
        const teamC: number[] = [];

        sortedPlayers.forEach((p, idx) => {
          const cycle = Math.floor(idx / 3);
          const pos = idx % 3;
          if (cycle % 2 === 0) {
            if (pos === 0) teamA.push(p.playerId);
            else if (pos === 1) teamB.push(p.playerId);
            else teamC.push(p.playerId);
          } else {
            if (pos === 0) teamC.push(p.playerId);
            else if (pos === 1) teamB.push(p.playerId);
            else teamA.push(p.playerId);
          }
        });

        crucesPartidos.push({
          round: 1,
          court: 1,
          team1: teamA,
          team2: teamB,
          resting: teamC,
          matchType: "internal",
        });
        crucesPartidos.push({
          round: 2,
          court: 1,
          team1: teamB,
          team2: teamC,
          resting: teamA,
          matchType: "internal",
        });
        crucesPartidos.push({
          round: 3,
          court: 1,
          team1: teamA,
          team2: teamC,
          resting: teamB,
          matchType: "internal",
        });

        jugadoresPorTurno = Math.floor((teamA.length + teamB.length) / 2) * 2;
        descansanPorTurno = teamC.length;
      } else if (formato === "rival") {
        numRondas = 1;
        const allPlayerIds = sortedPlayers.map((p) => p.playerId);
        const startersCount = Math.min(allPlayerIds.length, sizePorEquipo);
        const team1Starters = allPlayerIds.slice(0, startersCount);
        const team1Subs = allPlayerIds.slice(startersCount);

        crucesPartidos.push({
          round: 1,
          court: 1,
          team1: allPlayerIds,
          team2: [],
          team1Starters,
          team1Subs,
          team2Starters: [],
          team2Subs: [],
          resting: [],
          matchType: "rival",
          rivalTeamName: rivalTeamName || "Rival Externo",
        });

        jugadoresPorTurno = startersCount;
        descansanPorTurno = team1Subs.length;
      } else {
        // Pichanga / 2 Equipos Equilibrados (formato por defecto para fútbol)
        numRondas = rounds ? Math.max(1, Number(rounds)) : 1;

        // Distribución snake draft por Elo para paridad deportiva absoluta
        const t1Ids: number[] = [];
        const t2Ids: number[] = [];
        sortedPlayers.forEach((p, idx) => {
          const mod = idx % 4;
          if (mod === 0 || mod === 3) {
            t1Ids.push(p.playerId);
          } else {
            t2Ids.push(p.playerId);
          }
        });

        const startersCount1 = Math.min(t1Ids.length, sizePorEquipo);
        const startersCount2 = Math.min(t2Ids.length, sizePorEquipo);
        const team1Starters = t1Ids.slice(0, startersCount1);
        const team1Subs = t1Ids.slice(startersCount1);
        const team2Starters = t2Ids.slice(0, startersCount2);
        const team2Subs = t2Ids.slice(startersCount2);

        for (let r = 1; r <= numRondas; r++) {
          crucesPartidos.push({
            round: r,
            court: 1,
            team1: t1Ids,
            team2: t2Ids,
            team1Starters,
            team1Subs,
            team2Starters,
            team2Subs,
            resting: [],
            matchType: "internal",
          });
        }

        jugadoresPorTurno = startersCount1 + startersCount2;
        descansanPorTurno = team1Subs.length + team2Subs.length;
      }
    } else {
      // PÁDEL / TENIS: Formatos por parejas con canchas y rotación
      const maxCourts = Math.max(1, Math.floor(confirmados.length / minJugadores));
      canchas = courts ? Math.max(1, Math.min(Number(courts), maxCourts)) : maxCourts;
      jugadoresPorTurno = canchas * minJugadores;
      descansanPorTurno = confirmados.length - jugadoresPorTurno;

      if (rounds) {
        numRondas = Math.max(1, Math.min(15, Number(rounds)));
      } else {
        if (formato === "desafio") {
          numRondas = 1;
        } else if (confirmados.length === 4) {
          numRondas = 3;
        } else if (confirmados.length === 5) {
          numRondas = 5;
        } else if (confirmados.length >= 8) {
          numRondas = 3;
        } else {
          numRondas = 3;
        }
      }

      const timesPlayed = new Map<number, number>();
      const partnerHistory = new Map<string, number>();
      const opponentHistory = new Map<string, number>();

      const getPairKey = (p1: number, p2: number) => `${Math.min(p1, p2)}-${Math.max(p1, p2)}`;
      const recordMatch = (t1: number[], t2: number[]) => {
        if (t1.length === 2) {
          const k1 = getPairKey(t1[0], t1[1]);
          partnerHistory.set(k1, (partnerHistory.get(k1) || 0) + 1);
        }
        if (t2.length === 2) {
          const k2 = getPairKey(t2[0], t2[1]);
          partnerHistory.set(k2, (partnerHistory.get(k2) || 0) + 1);
        }
        for (const a of t1) {
          for (const b of t2) {
            const ok = getPairKey(a, b);
            opponentHistory.set(ok, (opponentHistory.get(ok) || 0) + 1);
          }
        }
      };

      if (formato === "parejas_fijas") {
        const parejas: Array<{ id: number; players: number[]; avgElo: number }> = [];
        const numParejas = Math.floor(confirmados.length / 2);
        for (let i = 0; i < numParejas; i++) {
          const p1 = sortedPlayers[i].playerId;
          const p2 = sortedPlayers[confirmados.length - 1 - i].playerId;
          const avgElo = Math.round(
            ((playerDetailMap.get(p1)?.elo || 1500) + (playerDetailMap.get(p2)?.elo || 1500)) / 2
          );
          parejas.push({ id: i + 1, players: [p1, p2], avgElo });
        }

        const P = parejas.length;
        for (let r = 1; r <= numRondas; r++) {
          const shift = (r - 1) % Math.max(1, P - 1);
          const rotatedPairs = [
            parejas[0],
            ...parejas.slice(1 + shift),
            ...parejas.slice(1, 1 + shift),
          ];

          let courtIndex = 1;
          for (let i = 0; i < Math.floor(P / 2) && courtIndex <= canchas; i++) {
            const pairA = rotatedPairs[i];
            const pairB = rotatedPairs[P - 1 - i];
            if (pairA && pairB && pairA.id !== pairB.id) {
              crucesPartidos.push({
                round: r,
                court: courtIndex,
                team1: pairA.players,
                team2: pairB.players,
              });
              courtIndex++;
            }
          }
        }
      } else if (formato === "desafio") {
        for (let c = 1; c <= canchas; c++) {
          const offset = (c - 1) * minJugadores;
          const group = sortedPlayers.slice(offset, offset + minJugadores);
          if (group.length === minJugadores) {
            crucesPartidos.push({
              round: 1,
              court: c,
              team1: [group[0].playerId, group[3].playerId],
              team2: [group[1].playerId, group[2].playerId],
            });
          }
        }
      } else {
        // FORMATO AMERICANA (Rotación individual inteligente)
        const canonical8Rounds: Array<Array<{ c: number; t1: number[]; t2: number[] }>> = [
          [
            { c: 1, t1: [0, 7], t2: [1, 6] },
            { c: 2, t1: [2, 5], t2: [3, 4] },
          ],
          [
            { c: 1, t1: [0, 1], t2: [2, 7] },
            { c: 2, t1: [3, 6], t2: [4, 5] },
          ],
          [
            { c: 1, t1: [0, 2], t2: [3, 1] },
            { c: 2, t1: [4, 7], t2: [5, 6] },
          ],
          [
            { c: 1, t1: [0, 3], t2: [4, 2] },
            { c: 2, t1: [5, 1], t2: [6, 7] },
          ],
          [
            { c: 1, t1: [0, 4], t2: [5, 3] },
            { c: 2, t1: [6, 2], t2: [7, 1] },
          ],
          [
            { c: 1, t1: [0, 5], t2: [6, 4] },
            { c: 2, t1: [7, 3], t2: [1, 2] },
          ],
          [
            { c: 1, t1: [0, 6], t2: [7, 5] },
            { c: 2, t1: [1, 4], t2: [2, 3] },
          ],
        ];

        const canonical4Rounds: Array<{ t1: number[]; t2: number[] }> = [
          { t1: [0, 3], t2: [1, 2] },
          { t1: [0, 1], t2: [2, 3] },
          { t1: [0, 2], t2: [1, 3] },
        ];

        for (let r = 1; r <= numRondas; r++) {
          let activePlayers: typeof sortedPlayers = [];
          let restingPlayerIds: number[] = [];

          if (descansanPorTurno === 0) {
            activePlayers = [...sortedPlayers];
          } else {
            const sortedByGames = [...sortedPlayers].sort((a, b) => {
              const playedA = timesPlayed.get(a.playerId) || 0;
              const playedB = timesPlayed.get(b.playerId) || 0;
              if (playedA !== playedB) return playedA - playedB;
              return (a.playerId + r) % sortedPlayers.length - (b.playerId + r) % sortedPlayers.length;
            });

            activePlayers = sortedByGames.slice(0, jugadoresPorTurno);
            restingPlayerIds = sortedByGames.slice(jugadoresPorTurno).map((p) => p.playerId);
          }

          for (const p of activePlayers) {
            timesPlayed.set(p.playerId, (timesPlayed.get(p.playerId) || 0) + 1);
          }

          activePlayers.sort((a, b) => {
            const eloA = playerDetailMap.get(a.playerId)?.elo || 1500;
            const eloB = playerDetailMap.get(b.playerId)?.elo || 1500;
            return eloB - eloA;
          });

          if (activePlayers.length === 4 && canchas === 1) {
            const matchIdx = (r - 1) % 3;
            const cDef = canonical4Rounds[matchIdx];
            const t1 = [activePlayers[cDef.t1[0]].playerId, activePlayers[cDef.t1[1]].playerId];
            const t2 = [activePlayers[cDef.t2[0]].playerId, activePlayers[cDef.t2[1]].playerId];
            crucesPartidos.push({
              round: r,
              court: 1,
              team1: t1,
              team2: t2,
              resting: restingPlayerIds,
            });
            recordMatch(t1, t2);
          } else if (activePlayers.length === 8 && canchas === 2) {
            const roundIdx = (r - 1) % 7;
            const rPlan = canonical8Rounds[roundIdx];
            for (const cMatch of rPlan) {
              const t1 = [activePlayers[cMatch.t1[0]].playerId, activePlayers[cMatch.t1[1]].playerId];
              const t2 = [activePlayers[cMatch.t2[0]].playerId, activePlayers[cMatch.t2[1]].playerId];
              crucesPartidos.push({
                round: r,
                court: cMatch.c,
                team1: t1,
                team2: t2,
                resting: restingPlayerIds,
              });
              recordMatch(t1, t2);
            }
          } else {
            for (let c = 1; c <= canchas; c++) {
              const groupOffset = (c - 1) * minJugadores;
              const courtGroup = activePlayers.slice(groupOffset, groupOffset + minJugadores);
              if (courtGroup.length === minJugadores) {
                const ids = courtGroup.map((p) => p.playerId);
                const configs = [
                  { t1: [ids[0], ids[3]], t2: [ids[1], ids[2]] },
                  { t1: [ids[0], ids[1]], t2: [ids[2], ids[3]] },
                  { t1: [ids[0], ids[2]], t2: [ids[1], ids[3]] },
                ];

                let bestConfig = configs[0];
                let minCost = Infinity;

                for (const cfg of configs) {
                  const k1 = getPairKey(cfg.t1[0], cfg.t1[1]);
                  const k2 = getPairKey(cfg.t2[0], cfg.t2[1]);
                  const part1 = partnerHistory.get(k1) || 0;
                  const part2 = partnerHistory.get(k2) || 0;

                  const elo1 = Math.round(
                    ((playerDetailMap.get(cfg.t1[0])?.elo || 1500) +
                      (playerDetailMap.get(cfg.t1[1])?.elo || 1500)) /
                      2
                  );
                  const elo2 = Math.round(
                    ((playerDetailMap.get(cfg.t2[0])?.elo || 1500) +
                      (playerDetailMap.get(cfg.t2[1])?.elo || 1500)) /
                      2
                  );
                  const eloDiff = Math.abs(elo1 - elo2);

                  const cost = (part1 + part2) * 1000 + eloDiff;
                  if (cost < minCost) {
                    minCost = cost;
                    bestConfig = cfg;
                  }
                }

                crucesPartidos.push({
                  round: r,
                  court: c,
                  team1: bestConfig.t1,
                  team2: bestConfig.t2,
                  resting: restingPlayerIds,
                });
                recordMatch(bestConfig.t1, bestConfig.t2);
              }
            }
          }
        }
      }
    }

    if (previewOnly) {
      const previewCruces = crucesPartidos.map((cruce, idx) => {
        const t1 = cruce.team1.map((id) => playerDetailMap.get(id)?.name || `Jugador ${id}`);
        const t2 = cruce.team2.map((id) => playerDetailMap.get(id)?.name || `Jugador ${id}`);
        const elo1 = cruce.team1.length > 0
          ? Math.round(cruce.team1.reduce((acc, id) => acc + (playerDetailMap.get(id)?.elo || 1500), 0) / cruce.team1.length)
          : 1500;
        const elo2 = cruce.team2.length > 0
          ? Math.round(cruce.team2.reduce((acc, id) => acc + (playerDetailMap.get(id)?.elo || 1500), 0) / cruce.team2.length)
          : 1500;
        const restingNames = (cruce.resting || []).map(
          (id) => playerDetailMap.get(id)?.name || `Jugador ${id}`
        );
        const team1StartersNames = (cruce.team1Starters || []).map((id) => playerDetailMap.get(id)?.name || `Jugador ${id}`);
        const team1SubsNames = (cruce.team1Subs || []).map((id) => playerDetailMap.get(id)?.name || `Jugador ${id}`);
        const team2StartersNames = (cruce.team2Starters || []).map((id) => playerDetailMap.get(id)?.name || `Jugador ${id}`);
        const team2SubsNames = (cruce.team2Subs || []).map((id) => playerDetailMap.get(id)?.name || `Jugador ${id}`);

        return {
          matchIndex: idx + 1,
          round: cruce.round,
          court: cruce.court,
          team1: cruce.team1,
          team2: cruce.team2,
          team1Names: isFootball
            ? (formato === "triangular"
                ? `Equipo ${idx === 0 ? "A" : idx === 1 ? "B" : "A"}: ${t1.join(", ")}`
                : `Equipo Blanco (${team1StartersNames.length} titulares${team1SubsNames.length > 0 ? `, ${team1SubsNames.length} suplentes` : ""}): ${t1.join(", ")}`)
            : t1.join(" & "),
          team2Names: isFootball
            ? (cruce.matchType === "rival"
                ? (cruce.rivalTeamName || "Rival Externo")
                : (formato === "triangular"
                    ? `Equipo ${idx === 0 ? "B" : idx === 1 ? "C" : "C"}: ${t2.join(", ")}`
                    : `Equipo Azul (${team2StartersNames.length} titulares${team2SubsNames.length > 0 ? `, ${team2SubsNames.length} suplentes` : ""}): ${t2.join(", ")}`))
            : t2.join(" & "),
          team1AvgElo: elo1,
          team2AvgElo: elo2,
          diffElo: Math.abs(elo1 - elo2),
          restingNames,
          team1StartersNames,
          team1SubsNames,
          team2StartersNames,
          team2SubsNames,
          matchType: cruce.matchType || "internal",
          rivalTeamName: cruce.rivalTeamName,
        };
      });

      res.json({
        preview: true,
        summary: {
          totalConfirmed: confirmados.length,
          courts: canchas,
          rounds: numRondas,
          totalMatches: crucesPartidos.length,
          matchesPerRound: Math.round(crucesPartidos.length / numRondas),
          restingPerRound: descansanPorTurno,
          format: formato,
          isFootball,
        },
        cruces: previewCruces,
        message: isFootball
          ? `Planificación de fútbol lista: ${crucesPartidos.length} partido(s), ${jugadoresPorTurno} titulares en cancha, ${descansanPorTurno} suplentes en banca.`
          : `Fixture generado con ${crucesPartidos.length} partidos en ${numRondas} rondas (${canchas} pista${canchas > 1 ? "s" : ""}).`,
      });
      return;
    }

    // 🧹 Limpieza preventiva de partidos previamente generados para este encuentro
    const oldMatches = await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(eq(matchesTable.encuentroId, encuentroId));

    for (const oldMatch of oldMatches) {
      await db
        .delete(matchPlayersTable)
        .where(eq(matchPlayersTable.matchId, oldMatch.id));
    }
    await db
      .delete(matchesTable)
      .where(eq(matchesTable.encuentroId, encuentroId));

    const partidosCreados = [];
    const effectiveClubId = encuentroDb?.clubId || (req.user as any)?.clubId || 1;

    for (const cruce of crucesPartidos) {
      const [newMatch] = await db
        .insert(matchesTable)
        .values({
          clubId: effectiveClubId,
          encuentroId,
          sportId: idDeDeporte,
          modalityId: safeModalityId,
          round: cruce.round,
          court: cruce.court,
          team1Score: 0,
          team2Score: 0,
          result: "pending",
          status: "pending_confirmation",
          matchType: cruce.matchType || "internal",
          rivalTeamName: cruce.rivalTeamName || null,
          playedAt: new Date(),
        } as any)
        .returning();

      for (const pId of cruce.team1) {
        const isSub = (cruce.team1Subs || []).includes(pId);
        await db.insert(matchPlayersTable).values({
          matchId: newMatch.id,
          playerId: pId,
          team: "team1",
          isSubstitute: isSub,
          role: isSub ? "substitute" : "starter",
        });
      }

      for (const pId of cruce.team2) {
        const isSub = (cruce.team2Subs || []).includes(pId);
        await db.insert(matchPlayersTable).values({
          matchId: newMatch.id,
          playerId: pId,
          team: "team2",
          isSubstitute: isSub,
          role: isSub ? "substitute" : "starter",
        });
      }

      partidosCreados.push(newMatch);
    }

    res.status(201).json({
      success: true,
      count: partidosCreados.length,
      matches: partidosCreados,
      summary: {
        totalConfirmed: confirmados.length,
        courts: canchas,
        rounds: numRondas,
        totalMatches: partidosCreados.length,
        isFootball,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;