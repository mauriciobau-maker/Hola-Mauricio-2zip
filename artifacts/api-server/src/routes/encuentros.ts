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
import { getCurrentClubId, isSuperAdminUser, requireCommunityAccess } from "../middlewares/requireCommunity";

const router = Router();

function requestClubId(req: Request): number | null {
  return getCurrentClubId(req);
}

async function getScopedEncuentro(encuentroId: number, req: Request) {
  const clubId = requestClubId(req);
  const [encuentro] = await db
    .select()
    .from(encuentrosTable)
    .where(
      clubId == null
        ? eq(encuentrosTable.id, encuentroId)
        : and(eq(encuentrosTable.id, encuentroId), eq(encuentrosTable.clubId, clubId)),
    );
  return encuentro;
}

router.use(requireCommunityAccess);

async function getAsistenciaList(encuentroId: number, clubId: number | null) {
  const players = clubId == null
    ? await db.select().from(playersTable)
    : await db.select().from(playersTable).where(eq(playersTable.clubId, clubId));
  const playerMap: Record<number, { name: string; nickname: string | null; phone: string | null; language: string | null }> = {};

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

  const cleanRows = Array.from(uniqueRowsMap.values()).filter((row) => playerMap[row.playerId]);

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

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const clubId = requestClubId(req);
    const list = clubId == null
      ? await db.select().from(encuentrosTable)
      : await db.select().from(encuentrosTable).where(eq(encuentrosTable.clubId, clubId));
    const result = await Promise.all(
      list.map(async (e) => {
        const asistencia = await getAsistenciaList(e.id, e.clubId);
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

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const e = await getScopedEncuentro(id, req);
    if (!e) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    const asistencia = await getAsistenciaList(id, e.clubId);
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

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    const bodyData = req.body.data ?? req.body;
    const { title, dateTime, location, maxSpots, notes, playerIds } = bodyData;
    const clubId = requestClubId(req);

    if (!Number.isInteger(clubId) || clubId! <= 0) {
      res.status(400).json({ message: "Debes seleccionar un club activo para crear un encuentro" });
      return;
    }

    if (Array.isArray(playerIds) && playerIds.length > 0) {
      const clubPlayers = await db.select({ id: playersTable.id }).from(playersTable)
        .where(eq(playersTable.clubId, clubId!));
      const allowedPlayerIds = new Set(clubPlayers.map((player) => player.id));
      if (playerIds.map(Number).some((playerId: number) => !allowedPlayerIds.has(playerId))) {
        res.status(400).json({ message: "Uno o más jugadores no pertenecen al club del encuentro" });
        return;
      }
    }

    const [created] = await db
      .insert(encuentrosTable)
      .values({
        title,
        dateTime: new Date(dateTime),
        location,
        maxSpots: maxSpots ? parseInt(maxSpots, 10) : null,
        notes: notes || null,
        organizerId: user.id,
        clubId,
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

    const asistencia = await getAsistenciaList(created.id, created.clubId);
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
    const requestedPlayerId = reqPlayerId === undefined || reqPlayerId === null
      ? null
      : Number(reqPlayerId);

    const e = await getScopedEncuentro(encuentroId, req);
    if (!e) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    const isOrganizer = e.organizerId === user.id;
    const isSuperAdmin = isSuperAdminUser(user);

    if (requestedPlayerId !== null && !isOrganizer && !isSuperAdmin) {
      res.status(403).json({ message: "Solo el organizador o un Super Admin puede actualizar la asistencia de otro jugador" });
      return;
    }

    const targetPlayerId = requestedPlayerId ?? user.playerId;

    if (!targetPlayerId) {
      res.status(400).json({ message: "No se encontró un jugador válido para actualizar" });
      return;
    }

    const [targetPlayer] = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(and(eq(playersTable.id, Number(targetPlayerId)), eq(playersTable.clubId, e.clubId!)));

    if (!targetPlayer) {
      res.status(403).json({ message: "El jugador no pertenece al club del encuentro" });
      return;
    }

    let finalStatus = status;

    if (status === "confirmed") {
      const asistenciaActual = await getAsistenciaList(encuentroId, e.clubId);
      const confirmedCount = asistenciaActual.filter(
        (a) => a.status === "confirmed" && a.playerId !== Number(targetPlayerId)
      ).length;

      if (e.maxSpots && confirmedCount >= e.maxSpots) {
        const waitlistCount = asistenciaActual.filter(
          (a) =>
            (a.status === "waitlist" || a.status === "reserva") &&
            a.playerId !== Number(targetPlayerId)
        ).length;

        if (waitlistCount >= 3) {
          res.status(400).json({
            message: "El encuentro y la lista de reserva (máximo 3 cupos) están completamente llenos.",
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
          eq(asistenciaTable.playerId, Number(targetPlayerId))
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
          await db.delete(asistenciaTable).where(eq(asistenciaTable.id, existingRows[i].id));
        }
      }
    } else {
      await db.insert(asistenciaTable).values({
        encuentroId,
        playerId: Number(targetPlayerId),
        status: finalStatus,
        respondedAt: new Date(),
      });
    }

    let asistenciaActualizada = await getAsistenciaList(encuentroId, e.clubId);
    const confirmedActual = asistenciaActualizada.filter((a) => a.status === "confirmed").length;

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
        asistenciaActualizada = await getAsistenciaList(encuentroId, e.clubId);
      }
    }

    res.json({
      encuentro: {
        ...e,
        dateTime: e?.dateTime instanceof Date ? e.dateTime.toISOString() : String(e?.dateTime),
        createdAt: e?.createdAt instanceof Date ? e.createdAt.toISOString() : String(e?.createdAt),
      },
      asistencia: asistenciaActualizada,
      assignedStatus: finalStatus,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }

    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const e = await getScopedEncuentro(id, req);
    if (!e) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    if (e.organizerId !== user.id && !user.isAdmin) {
      res.status(403).json({ message: "No tienes permiso para eliminar este encuentro" });
      return;
    }

    const existingMatches = await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(and(eq(matchesTable.encuentroId, id), eq(matchesTable.clubId, e.clubId!)));

    for (const match of existingMatches) {
      await db.delete(matchPlayersTable).where(eq(matchPlayersTable.matchId, match.id));
    }

    await db.delete(matchesTable).where(and(eq(matchesTable.encuentroId, id), eq(matchesTable.clubId, e.clubId!)));
    await db.delete(asistenciaTable).where(eq(asistenciaTable.encuentroId, id));
    await db.delete(encuentrosTable).where(eq(encuentrosTable.id, id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id/partidos", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const encuentro = await getScopedEncuentro(encuentroId, req);
    if (!encuentro) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    const rawMatches = await db
      .select()
      .from(matchesTable)
      .where(and(eq(matchesTable.encuentroId, encuentroId), eq(matchesTable.clubId, encuentro.clubId!)));

    const allPlayers = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.clubId, encuentro.clubId!));
    const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]));

    const formattedMatches = await Promise.all(
      rawMatches.map(async (match) => {
        const matchPlayers = await db
          .select()
          .from(matchPlayersTable)
          .where(eq(matchPlayersTable.matchId, match.id));

        const team1 = matchPlayers
          .filter((mp) => mp.team === "team1")
          .map((mp) => ({ id: mp.playerId, name: playerMap.get(mp.playerId) ?? `Jugador ${mp.playerId}` }));

        const team2 = matchPlayers
          .filter((mp) => mp.team === "team2")
          .map((mp) => ({ id: mp.playerId, name: playerMap.get(mp.playerId) ?? `Jugador ${mp.playerId}` }));

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
          playedAt: match.playedAt instanceof Date ? match.playedAt.toISOString() : String(match.playedAt),
        };
      })
    );

    res.json(formattedMatches);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/partidos/:matchId", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const rawMatchId = req.params.matchId;
    const matchId = parseInt(Array.isArray(rawMatchId) ? rawMatchId[0] : rawMatchId, 10);
    const encuentro = await getScopedEncuentro(encuentroId, req);
    if (!encuentro) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    const { team1Score, team2Score, result, sets } = req.body;
    const updateData: Record<string, any> = {};
    if (team1Score !== undefined) updateData.team1Score = team1Score;
    if (team2Score !== undefined) updateData.team2Score = team2Score;
    if (result !== undefined) updateData.result = result;
    if (sets !== undefined) updateData.sets = sets;

    const [updated] = await db
      .update(matchesTable)
      .set(updateData)
      .where(and(
        eq(matchesTable.id, matchId),
        eq(matchesTable.encuentroId, encuentroId),
        eq(matchesTable.clubId, encuentro.clubId!),
      ))
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

router.post("/:id/generar-partidos", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const encuentroId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    const { formato, sportId, teamSize, modalityId } = req.body;
    const encuentro = await getScopedEncuentro(encuentroId, req);
    if (!encuentro) {
      res.status(404).json({ message: "Encuentro no encontrado" });
      return;
    }

    const asistencia = await getAsistenciaList(encuentroId, encuentro.clubId);
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

    const oldMatches = await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(and(eq(matchesTable.encuentroId, encuentroId), eq(matchesTable.clubId, encuentro.clubId!)));

    for (const oldMatch of oldMatches) {
      await db.delete(matchPlayersTable).where(eq(matchPlayersTable.matchId, oldMatch.id));
    }

    await db
      .delete(matchesTable)
      .where(and(eq(matchesTable.encuentroId, encuentroId), eq(matchesTable.clubId, encuentro.clubId!)));

    const playerIds = confirmados.map((c) => c.playerId);
    const crucesPartidos: Array<{ team1: number[]; team2: number[] }> = [];

    if (sizePorEquipo === 2) {
      if (formato === "americana") {
        for (let i = 0; i <= playerIds.length - 4; i += 2) {
          crucesPartidos.push({
            team1: [playerIds[i], playerIds[i + 1]],
            team2: [playerIds[i + 2], playerIds[i + 3]],
          });
        }
      } else {
        for (let i = 0; i <= playerIds.length - 4; i += 4) {
          crucesPartidos.push({
            team1: [playerIds[i], playerIds[i + 1]],
            team2: [playerIds[i + 2], playerIds[i + 3]],
          });
        }
      }
    } else {
      for (let i = 0; i <= playerIds.length - (sizePorEquipo * 2); i += (sizePorEquipo * 2)) {
        const team1Players = playerIds.slice(i, i + sizePorEquipo);
        const team2Players = playerIds.slice(i + sizePorEquipo, i + (sizePorEquipo * 2));
        crucesPartidos.push({ team1: team1Players, team2: team2Players });
      }
    }

    const partidosCreados = [];

    for (const cruce of crucesPartidos) {
      const [newMatch] = await db
        .insert(matchesTable)
        .values({
          encuentroId,
          clubId: encuentro.clubId,
          sportId: idDeDeporte,
          modalityId: modality.id,
          team1Score: 0,
          team2Score: 0,
          result: "pending",
          playedAt: new Date(),
        })
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
