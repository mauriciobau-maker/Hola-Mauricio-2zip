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
    const { title, dateTime, location, maxSpots, notes, playerIds } = bodyData;

    const [created] = await db
      .insert(encuentrosTable)
      .values({
        title,
        dateTime: new Date(dateTime),
        location,
        maxSpots: maxSpots ? parseInt(maxSpots, 10) : null,
        notes: notes || null,
        organizerId: user.id,
      })
      .returning();

    if (playerIds && Array.isArray(playerIds) && playerIds.length > 0) {
      const uniquePlayerIds = Array.from(new Set(playerIds.map(Number)));
      for (const playerId of uniquePlayerIds) {
        await db.insert(asistenciaTable).values({
          encuentroId: created.id,
          playerId,
          status: "pending",
        });
      }
    }

    const asistencia = await getAsistenciaList(created.id);
    res.status(201).json({
      encuentro: {
        ...created,
        dateTime:
          created.dateTime instanceof Date
            ? created.dateTime.toISOString()
            : String(created.dateTime),
        createdAt:
          created.createdAt instanceof Date
            ? created.createdAt.toISOString()
            : String(created.createdAt),
      },
      asistencia,
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
      .where(eq(matchesTable.encuentroId, encuentroId));

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
          team1Players: team1,
          team2Players: team2,
          team1Score: match.team1Score ?? 0,
          team2Score: match.team2Score ?? 0,
          result: match.result,
          sets: match.sets,
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

// PATCH /api/encuentros/:id/partidos/:matchId -> Guardar resultado / sets del partido
router.patch("/:id/partidos/:matchId", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawMatchId = req.params.matchId;
    const matchId = parseInt(Array.isArray(rawMatchId) ? rawMatchId[0] : rawMatchId, 10);

    const { team1Score, team2Score, result, sets } = req.body;

    const updateData: Record<string, any> = {};
    if (team1Score !== undefined) updateData.team1Score = team1Score;
    if (team2Score !== undefined) updateData.team2Score = team2Score;
    if (result !== undefined) updateData.result = result;
    if (sets !== undefined) updateData.sets = sets;

    const [updated] = await db
      .update(matchesTable)
      .set(updateData)
      .where(eq(matchesTable.id, matchId))
      .returning();

    if (!updated) {
      res.status(404).json({ message: "Partido no encontrado" });
      return;
    }

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
    const { formato, sportId, teamSize, modalityId, previewOnly } = req.body;

    const asistencia = await getAsistenciaList(encuentroId);
    const confirmados = asistencia.filter((a) => a.status === "confirmed");

    const idDeDeporte = sportId ? Number(sportId) : 1;
    const sizePorEquipo = teamSize ? Number(teamSize) : (idDeDeporte === 2 ? 5 : 2);
    const modalityRows = await db
      .select()
      .from(sportModalitiesTable)
      .where(eq(sportModalitiesTable.sportId, idDeDeporte));
    const modality = modalityId
      ? modalityRows.find((row) => row.id === Number(modalityId))
      : modalityRows.find((row) => row.teamSize === sizePorEquipo && row.active);
    if (!modality) {
      res.status(400).json({ message: "No existe una modalidad válida para el deporte seleccionado." });
      return;
    }
    const minJugadores = sizePorEquipo * 2;

    if (confirmados.length < minJugadores) {
      res.status(400).json({
        message: `Se requieren al menos ${minJugadores} jugadores confirmados para generar partidos (Tamaño por equipo requerido: ${sizePorEquipo}).`,
      });
      return;
    }

    // Traer ficha deportiva completa para balancear por Elo y Drive/Revés
    const allDbPlayers = await db.select().from(playersTable);
    const playerDetailMap = new Map<number, any>();
    for (const p of allDbPlayers) {
      playerDetailMap.set(p.id, p);
    }

    const playerIds = confirmados.map((c) => c.playerId);
    // Ordenar confirmados por Elo para aplicar emparejamiento equilibrado
    const sortedPlayers = [...confirmados].sort((a, b) => {
      const eloA = playerDetailMap.get(a.playerId)?.elo || 1500;
      const eloB = playerDetailMap.get(b.playerId)?.elo || 1500;
      return eloB - eloA;
    });

    const crucesPartidos: Array<{ team1: number[]; team2: number[] }> = [];

    if (sizePorEquipo === 2) {
      if (formato === "americana") {
        // En formato americana: rotación para que jueguen con compañeros variados
        for (let i = 0; i <= sortedPlayers.length - 4; i += 4) {
          const p1 = sortedPlayers[i].playerId;
          const p2 = sortedPlayers[i + 1].playerId;
          const p3 = sortedPlayers[i + 2].playerId;
          const p4 = sortedPlayers[i + 3].playerId;
          // Ronda 1: (1, 4) vs (2, 3) -> Equilibrio de Elo
          crucesPartidos.push({ team1: [p1, p4], team2: [p2, p3] });
        }
      } else {
        // Formato estándar competitivo: pareo #1 + #4 vs #2 + #3 (máxima paridad deportiva)
        for (let i = 0; i <= sortedPlayers.length - 4; i += 4) {
          const p1 = sortedPlayers[i].playerId;
          const p2 = sortedPlayers[i + 1].playerId;
          const p3 = sortedPlayers[i + 2].playerId;
          const p4 = sortedPlayers[i + 3].playerId;
          crucesPartidos.push({ team1: [p1, p4], team2: [p2, p3] });
        }
      }
    } else {
      for (let i = 0; i <= playerIds.length - (sizePorEquipo * 2); i += (sizePorEquipo * 2)) {
        const team1Players = playerIds.slice(i, i + sizePorEquipo);
        const team2Players = playerIds.slice(i + sizePorEquipo, i + (sizePorEquipo * 2));
        crucesPartidos.push({ team1: team1Players, team2: team2Players });
      }
    }

    if (previewOnly) {
      const previewCruces = crucesPartidos.map((cruce, idx) => {
        const t1 = cruce.team1.map((id) => playerDetailMap.get(id)?.name || `Jugador ${id}`);
        const t2 = cruce.team2.map((id) => playerDetailMap.get(id)?.name || `Jugador ${id}`);
        const elo1 = Math.round(cruce.team1.reduce((acc, id) => acc + (playerDetailMap.get(id)?.elo || 1500), 0) / cruce.team1.length);
        const elo2 = Math.round(cruce.team2.reduce((acc, id) => acc + (playerDetailMap.get(id)?.elo || 1500), 0) / cruce.team2.length);
        return {
          matchIndex: idx + 1,
          team1: cruce.team1,
          team2: cruce.team2,
          team1Names: t1.join(" & "),
          team2Names: t2.join(" & "),
          team1AvgElo: elo1,
          team2AvgElo: elo2,
          diffElo: Math.abs(elo1 - elo2),
        };
      });

      res.json({
        preview: true,
        cruces: previewCruces,
        message: "Vista previa generada con equilibrio de Elo por Parryn.",
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

    for (const cruce of crucesPartidos) {
      const [newMatch] = await db
        .insert(matchesTable)
        .values({
          encuentroId,
          sportId: idDeDeporte,
          modalityId: modality.id,
          team1Score: 0,
          team2Score: 0,
          result: "pending",
          status: "pending_confirmation",
          playedAt: new Date(),
        } as any)
        .returning();

      for (const pId of cruce.team1) {
        await db.insert(matchPlayersTable).values({
          matchId: newMatch.id,
          playerId: pId,
          team: "team1",
        });
      }

      for (const pId of cruce.team2) {
        await db.insert(matchPlayersTable).values({
          matchId: newMatch.id,
          playerId: pId,
          team: "team2",
        });
      }

      partidosCreados.push(newMatch);
    }

    res.status(201).json({
      success: true,
      count: partidosCreados.length,
      matches: partidosCreados,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;