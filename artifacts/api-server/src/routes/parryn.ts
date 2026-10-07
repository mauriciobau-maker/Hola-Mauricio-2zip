import { Router, type IRouter, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { eq, desc } from "drizzle-orm";
import {
  db,
  clubsTable,
  playersTable,
  encuentrosTable,
  asistenciaTable,
  matchesTable,
  matchPlayersTable,
  cobrosTable,
} from "@workspace/db";
import { resolveEffectiveClubId } from "../middlewares/requireCommunity";

const router: IRouter = Router();

// Inicializar cliente Gemini
let aiClient: GoogleGenAI | null = null;
try {
  aiClient = new GoogleGenAI();
} catch (err) {
  console.warn("[Parryn AI] GoogleGenAI client initialized without default environment credentials", err);
}

const PARRYN_SYSTEM_PROMPT = `
Eres PARRYN, el secretario deportivo y la mascota oficial de la comunidad deportiva.
Tu personalidad se define en los principios fundacionales del club:
- No juegas mejor, no ganas partidos: haces que todos puedan jugar.
- Eres el secretario del grupo, el más colaborador, el más entusiasta, siempre recuerdas todo, nunca criticas y nunca te enojas.
- Tu misión es quitarle fricción al organizador del club, crear encuentros cuando te lo pidan, informar quién está confirmado, quién falta, cuánto debe pagar cada uno, y motivar a los jugadores.
- Responde de forma cálida, cercana, motivadora y con emojis deportivos cuando corresponda (🎾, ⚽, 🏆, 📋).
- Mantén las respuestas ágiles y claras, listas para ser compartidas en un grupo de WhatsApp si te piden un comunicado.
`;

// Helper para parsear texto de intención y extraer parámetros de un nuevo encuentro
function parseEncuentroFromText(text: string, clubAddress?: string) {
  const lower = text.toLowerCase();

  // 1. Cupos / Plazas
  let maxSpots = 8;
  const spotsMatch = lower.match(/(\d{1,2})\s*(?:cupos?|jugadores?|personas?|plazas?)/);
  if (spotsMatch) {
    maxSpots = parseInt(spotsMatch[1], 10);
  } else {
    const rawNum = lower.match(/\b(4|6|8|10|12|16)\b/);
    if (rawNum) maxSpots = parseInt(rawNum[1], 10);
  }

  // 2. Ubicación
  let location = clubAddress || "Cancha Central";
  const locMatch = text.match(/(?:en|lugar:?)\s+([A-Za-z0-9\sÁÉÍÓÚáéíóúñÑ]+?)(?=(?:\s+a\s+las|\s+el\s+|\s+con\s+|\s+para\s+|$))/i);
  if (locMatch && locMatch[1].trim().length > 2) {
    location = locMatch[1].trim();
  }

  // 3. Hora
  let hour = 19;
  let minute = 0;
  const timeMatch = lower.match(/(?:a\s+las?|@)\s*(\d{1,2})(?::(\d{2}))?/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    if (timeMatch[2]) minute = parseInt(timeMatch[2], 10);
  }

  // 4. Día / Fecha
  const now = new Date();
  const targetDate = new Date(now);
  const daysOfWeek = ["domingo", "lunes", "martes", "miércoles", "miercoles", "jueves", "viernes", "sábado", "sabado"];

  if (lower.includes("mañana")) {
    targetDate.setDate(now.getDate() + 1);
  } else if (lower.includes("hoy")) {
    // keep today
  } else {
    let dayIdx = -1;
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lower.includes(daysOfWeek[i])) {
        dayIdx = i % 7;
        break;
      }
    }
    if (dayIdx >= 0) {
      const currentDay = now.getDay();
      let diff = dayIdx - currentDay;
      if (diff <= 0) diff += 7; // Próximo día correspondiente
      targetDate.setDate(now.getDate() + diff);
    } else {
      // Default: próximo viernes o sábado
      const currentDay = now.getDay();
      let diff = 5 - currentDay;
      if (diff <= 0) diff += 7;
      targetDate.setDate(now.getDate() + diff);
    }
  }

  targetDate.setHours(hour, minute, 0, 0);

  // 5. Título
  let title = "Americana de Pádel";
  if (lower.includes("torneo")) title = "Torneo del Club";
  else if (lower.includes("viernes")) title = "Pádel Viernes";
  else if (lower.includes("sábado") || lower.includes("sabado")) title = "Pádel Sabatino";
  else if (lower.includes("domingo")) title = "Domingo de Pádel";

  return { title, dateTime: targetDate, location, maxSpots };
}

// Helper para invocar Gemini con fallback entre modelos soportados
async function callGemini(contents: string, systemInstruction = PARRYN_SYSTEM_PROMPT): Promise<string | null> {
  if (!aiClient || !process.env.GEMINI_API_KEY) return null;

  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
  for (const model of models) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents,
        config: { systemInstruction },
      });
      if (response.text?.trim()) {
        return response.text.trim();
      }
    } catch (err: any) {
      console.warn(`[Parryn AI] Intento con modelo ${model} falló:`, err?.message?.slice(0, 100));
    }
  }
  return null;
}

// Helper para armar contexto completo y fresco del club
async function buildClubContext(clubId: number | null) {
  try {
    let clubName = "Club Deportivo";
    let clubAddress = "Cancha Central";
    if (clubId) {
      const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, clubId));
      if (club) {
        clubName = club.name;
        if (club.address) clubAddress = club.address;
      }
    }

    // Top 5 jugadores por ELO
    const topPlayers = await db
      .select({ id: playersTable.id, name: playersTable.name, elo: playersTable.elo })
      .from(playersTable)
      .where(clubId ? eq(playersTable.clubId, clubId) : undefined)
      .orderBy(desc(playersTable.elo))
      .limit(5);

    // Próximos encuentros
    const encuentros = await db
      .select()
      .from(encuentrosTable)
      .where(clubId ? eq(encuentrosTable.clubId, clubId) : undefined)
      .orderBy(desc(encuentrosTable.dateTime))
      .limit(3);

    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]));

    const encuentrosConDetalle = await Promise.all(
      encuentros.map(async (e) => {
        const asistencias = await db
          .select()
          .from(asistenciaTable)
          .where(eq(asistenciaTable.encuentroId, e.id));

        const confirmados = asistencias.filter((a) => a.status === "confirmed");
        const confirmadosNombres = confirmados.map((a) => playerMap.get(a.playerId) || `Jugador #${a.playerId}`);
        const pendientes = asistencias.filter((a) => a.status === "pending" || !a.status);
        const pendientesNombres = pendientes.map((a) => playerMap.get(a.playerId) || `Jugador #${a.playerId}`);

        const faltan = Math.max(0, (e.maxSpots || 8) - confirmados.length);
        return {
          id: e.id,
          titulo: e.title,
          fecha: e.dateTime,
          location: e.location,
          maxSpots: e.maxSpots || 8,
          confirmadosCount: confirmados.length,
          confirmadosNombres,
          pendientesNombres,
          cuposDisponibles: faltan,
          estado: e.estado,
        };
      })
    );

    // Resumen de Cobros
    const cobros = await db
      .select()
      .from(cobrosTable)
      .where(clubId ? eq(cobrosTable.clubId, clubId) : undefined);

    const pendientesList = cobros.filter((c) => c.estado === "pendiente");
    const totalPendiente = pendientesList.reduce((sum, c) => sum + (c.monto || 0), 0);
    const totalRecaudado = cobros
      .filter((c) => c.estado === "pagado")
      .reduce((sum, c) => sum + (c.monto || 0), 0);

    const deudores = pendientesList.slice(0, 5).map((c) => ({
      nombre: playerMap.get(c.playerId) || `Jugador #${c.playerId}`,
      monto: c.monto,
      concepto: c.concepto,
    }));

    return {
      clubName,
      clubAddress,
      topPlayers,
      encuentros: encuentrosConDetalle,
      cobros: {
        totalPendiente,
        totalRecaudado,
        cantidadCobros: cobros.length,
        cantidadPendientes: pendientesList.length,
        deudores,
      },
    };
  } catch (err) {
    console.error("Error construyendo contexto para Parryn:", err);
    return null;
  }
}

// GET /api/parryn/status -> Devuelve un boletín ejecutivo del secretario para el Dashboard
router.get("/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const clubId = await resolveEffectiveClubId(req);
    const context = await buildClubContext(clubId);

    if (!context) {
      res.json({
        available: true,
        secretaryName: "Parryn",
        summary: "¡Hola! Soy Parryn, tu secretario deportivo. Todo listo en el club.",
      });
      return;
    }

    const prox = context.encuentros[0];
    let highlight = "";
    if (prox) {
      if (prox.cuposDisponibles > 0) {
        highlight = `Para "${prox.titulo}", van ${prox.confirmadosCount}/${prox.maxSpots} confirmados. ¡Faltan ${prox.cuposDisponibles} cupos!`;
      } else {
        highlight = `"${prox.titulo}" tiene todos los cupos llenos (${prox.maxSpots}/${prox.maxSpots}). ¡Listos para armar cruces!`;
      }
    } else {
      highlight = "No hay encuentros activos agendados. ¿Lanzamos una nueva convocatoria?";
    }

    const topPlayer = context.topPlayers[0];

    res.json({
      available: true,
      secretaryName: "Parryn",
      clubName: context.clubName,
      highlight,
      nextEncuentro: prox || null,
      pendingPaymentTotal: context.cobros.totalPendiente,
      pendingPaymentCount: context.cobros.cantidadPendientes,
      leader: topPlayer ? `${topPlayer.name} (${topPlayer.elo} pts)` : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parryn/crear-encuentro -> Crea un nuevo encuentro de forma directa y guiada
router.post("/crear-encuentro", async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, title, dateTime, location, maxSpots } = req.body;
    const clubId = await resolveEffectiveClubId(req);
    const context = await buildClubContext(clubId);

    let parsedTitle = title || "Americana de Pádel";
    let parsedDateTime = dateTime ? new Date(dateTime) : new Date(Date.now() + 2 * 86400000);
    let parsedLocation = location || context?.clubAddress || "Cancha Central";
    let parsedSpots = maxSpots ? Number(maxSpots) : 8;

    if (prompt && (!title || !dateTime)) {
      const parsed = parseEncuentroFromText(prompt, context?.clubAddress);
      parsedTitle = title || parsed.title;
      parsedDateTime = dateTime ? new Date(dateTime) : parsed.dateTime;
      parsedLocation = location || parsed.location;
      parsedSpots = maxSpots ? Number(maxSpots) : parsed.maxSpots;
    }

    const [created] = await db
      .insert(encuentrosTable)
      .values({
        title: parsedTitle,
        dateTime: parsedDateTime,
        location: parsedLocation,
        maxSpots: parsedSpots,
        clubId: clubId || null,
        organizerId: (req as any).user?.id || null,
        estado: "abierto",
        formato: "americana",
      })
      .returning();

    // Auto-invitar a los jugadores registrados del club
    const players = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(clubId ? eq(playersTable.clubId, clubId) : undefined);

    if (players.length > 0) {
      await db.insert(asistenciaTable).values(
        players.map((p) => ({
          encuentroId: created.id,
          playerId: p.id,
          status: "pending",
        }))
      );
    }

    const fechaFormat = parsedDateTime.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    res.json({
      success: true,
      encuentro: {
        id: created.id,
        title: created.title,
        dateTime: created.dateTime,
        location: created.location,
        maxSpots: created.maxSpots,
      },
      message: `Encuentro "${created.title}" creado exitosamente para el ${fechaFormat}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parryn/chat -> Chat conversacional con el secretario del club
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "El mensaje es requerido" });
      return;
    }

    const clubId = await resolveEffectiveClubId(req);
    const context = await buildClubContext(clubId);

    // ⚡ DETECCIÓN DE INTENCIÓN DE CREAR O AGENDAR UN ENCUENTRO
    const isCreationIntent =
      /(?:crea|crear|arma|armar|agenda|agendar|organiza|organizar|programa|programar)\b.*?(?:encuentro|partido|torneo|americana|jornada)/i.test(message) ||
      /(?:nuevo|nueva)\s+(?:encuentro|partido|torneo|americana)/i.test(message);

    if (isCreationIntent) {
      const parsed = parseEncuentroFromText(message, context?.clubAddress);

      const [created] = await db
        .insert(encuentrosTable)
        .values({
          title: parsed.title,
          dateTime: parsed.dateTime,
          location: parsed.location,
          maxSpots: parsed.maxSpots,
          clubId: clubId || null,
          organizerId: (req as any).user?.id || null,
          estado: "abierto",
          formato: "americana",
        })
        .returning();

      // Convocar automáticamente a los jugadores del club
      const players = await db
        .select({ id: playersTable.id })
        .from(playersTable)
        .where(clubId ? eq(playersTable.clubId, clubId) : undefined);

      if (players.length > 0) {
        await db.insert(asistenciaTable).values(
          players.map((p) => ({
            encuentroId: created.id,
            playerId: p.id,
            status: "pending",
          }))
        );
      }

      const fechaFormat = parsed.dateTime.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      const whatsappText =
        `🎾 *CONVOCATORIA: ${created.title.toUpperCase()}* 🎾\n\n` +
        `📅 *Fecha:* ${fechaFormat}\n` +
        `📍 *Lugar:* ${created.location}\n` +
        `👥 *Cupos disponibles:* ${created.maxSpots}\n\n` +
        `👉 ¡Por favor confirmen su asistencia en la app para armar las parejas!\n\n` +
        `_Organizado con ❤️ por Parryn, secretario del club._`;

      const replyText =
        `🎾 ¡Listo! Como secretario de tu club he creado y agendado el encuentro *"${created.title}"* de inmediato:\n\n` +
        `• 📅 **Fecha:** ${fechaFormat}\n` +
        `• 📍 **Lugar:** ${created.location}\n` +
        `• 👥 **Cupos:** ${created.maxSpots} plazas\n` +
        `• 📋 **Convocados:** ${players.length} jugadores del club quedan en lista para confirmar asistencia.\n\n` +
        `📲 *Mensaje oficial para WhatsApp listo para compartir:*\n\n` +
        `${whatsappText}\n\n` +
        `👉 Puedes entrar directamente al encuentro con el botón de abajo para revisar los cupos o generar los partidos.`;

      res.json({
        reply: replyText,
        encuentroCreated: {
          id: created.id,
          title: created.title,
          dateTime: created.dateTime.toISOString(),
          location: created.location,
          maxSpots: created.maxSpots,
        },
        sender: "Parryn",
        success: true,
      });
      return;
    }

    const contextSummary = context
      ? `
INFORMACIÓN REAL ACTUAL DEL CLUB (${context.clubName}):
- Top jugadores en Ranking ELO: ${context.topPlayers.map((p) => `${p.name} (${p.elo} pts)`).join(", ") || "Sin ranking aún"}.
- Próximos encuentros: ${
          context.encuentros
            .map(
              (e) =>
                `"${e.titulo}" (${e.confirmadosCount}/${e.maxSpots} confirmados [${e.confirmadosNombres.slice(0, 4).join(", ")}], faltan ${e.cuposDisponibles} cupos. Pendientes de responder: [${e.pendientesNombres.slice(0, 4).join(", ")}])`
            )
            .join(" | ") || "No hay encuentros agendados en este momento"
        }.
- Finanzas del club: Pendiente por cobrar $${context.cobros.totalPendiente.toLocaleString("es-CL")} (${context.cobros.cantidadPendientes} cuotas pendientes), Recaudado $${context.cobros.totalRecaudado.toLocaleString("es-CL")}.
`
      : "";

    const prompt = `
Contexto en tiempo real del club deportivo:
${contextSummary}

Historial de conversación previo:
${Array.isArray(history) ? history.map((h: any) => `${h.role === "user" ? "Usuario" : "Parryn"}: ${h.text}`).join("\n") : ""}

Pregunta o petición del usuario:
${message}

Responde como Parryn, con tono positivo, conciso, útil y deportivo. Sé preciso con los datos exactos del club (nombres, números y cupos). Si te piden un comunicado para WhatsApp, entrégalo formateado con negritas y emojis listo para copiar.`;

    let reply = await callGemini(prompt);

    // Motor contextual inteligente de respaldo si no hay conexión a LLM externo
    if (!reply) {
      const lower = message.toLowerCase();
      let fallbackReply = `¡Hola! Soy Parryn, el secretario de ${context?.clubName || "tu club"}. 🎾\n\n`;

      if (lower.includes("falta") || lower.includes("confirmad") || lower.includes("quien") || lower.includes("encuentro") || lower.includes("partido")) {
        if (context?.encuentros && context.encuentros.length > 0) {
          const prox = context.encuentros[0];
          fallbackReply += `Para el próximo encuentro *"${prox.titulo}"*:\n\n` +
            `• ✅ **Confirmados (${prox.confirmadosCount}/${prox.maxSpots}):** ${prox.confirmadosNombres.length > 0 ? prox.confirmadosNombres.join(", ") : "Ninguno aún"}\n` +
            `• ⏳ **Cupos disponibles:** ${prox.cuposDisponibles}\n` +
            (prox.pendientesNombres.length > 0 ? `• ❓ **Sin confirmar todavía:** ${prox.pendientesNombres.join(", ")}\n\n` : "\n") +
            `👉 ¿Quieres que te redacte una citación rápida para enviarla al grupo de WhatsApp?`;
        } else {
          fallbackReply += "No veo encuentros activos programados en este momento. ¿Te gustaría que armemos una nueva convocatoria? Pídeme: 'Parryn, crea un encuentro este viernes a las 19:00'.";
        }
      } else if (lower.includes("cobro") || lower.includes("debe") || lower.includes("plata") || lower.includes("dinero") || lower.includes("pago") || lower.includes("cuota")) {
        fallbackReply += `En el balance financiero del club tenemos:\n\n` +
          `• ⏳ **Pendiente por cobrar:** $${(context?.cobros.totalPendiente || 0).toLocaleString("es-CL")} (${context?.cobros.cantidadPendientes || 0} cuotas)\n` +
          `• ✅ **Recaudado exitosamente:** $${(context?.cobros.totalRecaudado || 0).toLocaleString("es-CL")}\n\n` +
          `Puedes ver el desglose exacto de cada jugador en la **Planilla de Cobros**. ¿Necesitas un mensaje amable para recordar las cuotas por WhatsApp?`;
      } else if (lower.includes("ranking") || lower.includes("lider") || lower.includes("elo") || lower.includes("mejor")) {
        if (context?.topPlayers && context.topPlayers.length > 0) {
          fallbackReply += `🏆 **Líderes actuales del Ranking ELO:**\n\n` +
            context.topPlayers.map((p, idx) => `${idx + 1}. **${p.name}** — ${p.elo} pts`).join("\n") +
            `\n\n¡Cada partido disputado y validado actualiza estos números!`;
        } else {
          fallbackReply += "Aún no hay suficientes partidos para calcular el ranking. ¡A organizar partidos en la cancha!";
        }
      } else if (lower.includes("whatsapp") || lower.includes("mensaje") || lower.includes("convocat") || lower.includes("redact")) {
        if (context?.encuentros && context.encuentros.length > 0) {
          const prox = context.encuentros[0];
          fallbackReply += `Aquí tienes el mensaje oficial listo para copiar y enviar a WhatsApp: 📲\n\n` +
            `🎾 *CONVOCATORIA OFICIAL - ${prox.titulo.toUpperCase()}*\n` +
            `📅 Fecha: ${new Date(prox.fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}\n` +
            `📍 Lugar: ${prox.location || "Club Central"}\n` +
            `👥 Confirmados: ${prox.confirmadosCount}/${prox.maxSpots}\n` +
            `⚡ *Cupos disponibles: ${prox.cuposDisponibles}*\n\n` +
            `👉 ¡Por favor confirmen su asistencia en la app para fijar los cruces! 🏆`;
        } else {
          fallbackReply += `🎾 *¡CONVOCATORIA DE PÁDEL!* 🎾\n\n` +
            `¡Muchachos! Estamos armando partidos para esta semana. ¿Quiénes se anotan para la pista?\n\n` +
            `👉 Respondan este mensaje o confirmen directo en la app. ¡Vamos! 🔥`;
        }
      } else {
        fallbackReply += `Estoy listo para ayudarte como el secretario de tu club. Puedo:\n\n` +
          `• ⚡ **Crear un nuevo encuentro deportivo:** Dime por ejemplo *"Parryn, crea un encuentro este viernes a las 19:00 con 8 cupos"*.\n` +
          `• Avisarte quién falta por confirmar para el próximo partido.\n` +
          `• Mostrarte cómo van los cobros y quién tiene saldo pendiente.\n` +
          `• Informarte el ranking ELO y las mejores parejas.\n` +
          `• Redactar comunicados oficiales para enviar a WhatsApp.\n\n` +
          `¿Por dónde empezamos? 📋`;
      }

      reply = fallbackReply;
    }

    res.json({ reply, sender: "Parryn", success: true });
  } catch (err: any) {
    console.error("Error en Parryn Chat:", err);
    res.status(500).json({ error: err?.message || "Error desconocido" });
  }
});

// POST /api/parryn/convocatoria -> Redacta la convocatoria oficial de un encuentro para WhatsApp
router.post("/convocatoria", async (req: Request, res: Response): Promise<void> => {
  try {
    const { encuentroId } = req.body;
    if (!encuentroId) {
      res.status(400).json({ error: "encuentroId es requerido" });
      return;
    }

    const [encuentro] = await db
      .select()
      .from(encuentrosTable)
      .where(eq(encuentrosTable.id, Number(encuentroId)));

    if (!encuentro) {
      res.status(404).json({ error: "Encuentro no encontrado" });
      return;
    }

    const asistencias = await db
      .select()
      .from(asistenciaTable)
      .where(eq(asistenciaTable.encuentroId, encuentro.id));

    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]));

    const confirmados = asistencias.filter((a) => a.status === "confirmed");
    const confirmadosNombres = confirmados.map((a) => playerMap.get(a.playerId) || `Jugador #${a.playerId}`);
    const faltan = Math.max(0, (encuentro.maxSpots || 8) - confirmados.length);

    const prompt = `
Redacta un mensaje de convocatoria deportivo, atractivo y claro para enviar a un grupo de WhatsApp.
Encuentro: ${encuentro.title}
Lugar: ${encuentro.location}
Fecha y hora: ${new Date(encuentro.dateTime).toLocaleString("es-ES")}
Confirmados actuales (${confirmados.length}/${encuentro.maxSpots || 8}): ${confirmadosNombres.join(", ") || "Aún sin confirmados"}
Cupos disponibles: ${faltan}
Precio o cuota por jugador: ${(encuentro as any).costPerPlayer ? `$${(encuentro as any).costPerPlayer}` : "A definir"}

Firma como Parryn, secretario del club. Usa emojis deportivos (🎾, ⚡, 📍, ⏰) y formato con asteriscos para negritas de WhatsApp.`;

    const aiText = await callGemini(prompt);
    if (aiText) {
      res.json({ mensaje: aiText, success: true });
      return;
    }

    // Fallback template
    const fechaStr = new Date(encuentro.dateTime).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const template =
      `🎾 *CONVOCATORIA: ${encuentro.title.toUpperCase()}* 🎾\n\n` +
      `📅 *Fecha:* ${fechaStr}\n` +
      `📍 *Lugar:* ${encuentro.location}\n` +
      `👥 *Confirmados:* ${confirmados.length}/${encuentro.maxSpots || 8}\n` +
      (confirmadosNombres.length > 0 ? `✅ *Anotados:* ${confirmadosNombres.join(", ")}\n` : "") +
      `⚡ *Cupos disponibles:* ${faltan}\n\n` +
      `📲 ¡Por favor confirma tu asistencia cuanto antes para armar los cruces!\n\n` +
      `_Mensaje preparado por Parryn, tu secretario deportivo._`;

    res.json({ mensaje: template, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parryn/recordatorio-cobros -> Redacta un recordatorio educado y simpático de cobros para WhatsApp
router.post("/recordatorio-cobros", async (req: Request, res: Response): Promise<void> => {
  try {
    const clubId = await resolveEffectiveClubId(req);
    const context = await buildClubContext(clubId);

    const deudoresCount = context?.cobros.cantidadPendientes || 0;
    const total = context?.cobros.totalPendiente || 0;

    const prompt = `
Redacta un recordatorio amistoso, simpático y nada incómodo para enviar al grupo de WhatsApp del club de pádel sobre las cuotas pendientes de pago.
Club: ${context?.clubName || "Club Deportivo"}
Total pendiente conjunto: $${total.toLocaleString("es-CL")}
Cantidad de jugadores con cuotas por liquidar: ${deudoresCount}

Tono: Simpático, cercano, comprensivo, como el buen secretario deportivo del grupo que quiere que el club siga funcionando sin problemas de canchas ni pelotas.
Firma como Parryn.`;

    const aiText = await callGemini(prompt);
    if (aiText) {
      res.json({ mensaje: aiText, success: true });
      return;
    }

    const template =
      `🎾 *RECORDATORIO AMISTOSO DEL CLUB* 💸\n\n` +
      `¡Hola muchachos! Aquí Parryn pasando a dejar un recordatorio express.\n\n` +
      `Para mantener las canchas al día y las pelotas nuevas en cada partido, les recordamos revisar su saldo en la sección de cobros de la app.\n\n` +
      `⏳ Tenemos un total pendiente de $${total.toLocaleString("es-CL")} entre ${deudoresCount} cuotas.\n\n` +
      `¡Cualquier duda o comprobante avísenle al organizador! ¡Nos vemos en la pista! 🏆\n\n` +
      `_Con cariño, Parryn (Secretario del Club)_`;

    res.json({ mensaje: template, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parryn/resumen-encuentro -> Redacta el resumen oficial del torneo para WhatsApp
router.post("/resumen-encuentro", async (req: Request, res: Response): Promise<void> => {
  try {
    const { encuentroId } = req.body;
    if (!encuentroId) {
      res.status(400).json({ error: "encuentroId es requerido" });
      return;
    }

    const [encuentro] = await db
      .select()
      .from(encuentrosTable)
      .where(eq(encuentrosTable.id, Number(encuentroId)));

    if (!encuentro) {
      res.status(404).json({ error: "Encuentro no encontrado" });
      return;
    }

    const matches = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.encuentroId, Number(encuentroId)));

    const allPlayers = await db.select().from(playersTable);
    const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]));

    const matchesData = await Promise.all(
      matches.map(async (m) => {
        const mPlayers = await db
          .select()
          .from(matchPlayersTable)
          .where(eq(matchPlayersTable.matchId, m.id));
        const t1 = mPlayers.filter((p) => p.team === "team1").map((p) => playerMap.get(p.playerId) || "Jugador");
        const t2 = mPlayers.filter((p) => p.team === "team2").map((p) => playerMap.get(p.playerId) || "Jugador");
        return {
          id: m.id,
          team1: t1.join(" & ") || "Equipo 1",
          team2: t2.join(" & ") || "Equipo 2",
          score: `${m.team1Score || 0} - ${m.team2Score || 0}`,
          result: m.result || "Disputado",
        };
      })
    );

    const prompt = `
Redacta el resumen oficial de la jornada deportiva para enviar directamente al grupo de WhatsApp.
Encuentro: ${encuentro.title}
Lugar: ${encuentro.location}
Partidos jugados:
${matchesData.map((m) => `• ${m.team1} (${m.score}) vs ${m.team2}`).join("\n") || "Partidos completados con éxito"}

Firma como Parryn, el secretario del club. Usa emojis deportivos, tono épico y entusiasta, felicita a los participantes y destaca el espíritu deportivo.`;

    const aiText = await callGemini(prompt);
    if (aiText) {
      res.json({ resumen: aiText, success: true });
      return;
    }

    // Fallback template
    const template =
      `🎾 *¡GRAN JORNADA EN ${encuentro.title.toUpperCase()}!* 🏆\n\n` +
      `¡Muchas gracias a todos por la tremenda entrega y fair play en la cancha hoy!\n\n` +
      `📊 *Resultados de los partidos:*\n` +
      (matchesData.length > 0
        ? matchesData.map((m) => `• ${m.team1} vs ${m.team2} ➔ ${m.score}`).join("\n")
        : "• Todos los partidos fueron completados con éxito.") +
      `\n\n📈 Los rankings ELO y estadísticas ya están actualizados en la app.\n\n` +
      `_Organizado con ❤️ por Parryn, el secretario del club._`;

    res.json({ resumen: template, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
