import { Router, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { requireAuth, resolveEffectiveClubId } from "../middlewares/requireCommunity";
import { db, encuentrosTable, clubsTable, sportsTable, clubSportsTable, sportModalitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: Router = Router();

// Inicialización segura del cliente Gemini con headers recomendados
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (e) {
    console.warn("[Parryn AI] Error inicializando GoogleGenAI:", e);
    return null;
  }
}

function getSystemInstruction(sportName = "Pádel", sportSlug = "padel"): string {
  const isFutbol = sportSlug === "futbol" || sportName.toLowerCase().includes("fútbol") || sportName.toLowerCase().includes("futbol");
  const isTenis = sportSlug === "tenis" || sportName.toLowerCase().includes("tenis") || sportName.toLowerCase().includes("tennis");
  const isPadel = sportSlug === "padel" || sportName.toLowerCase().includes("pádel") || sportName.toLowerCase().includes("padel");

  let sportSpecificRules = "";
  if (isFutbol) {
    sportSpecificRules = `
- DEPORTE ACTIVO: FÚTBOL (Fútbol 5, Fútbol 7, Fútbol 11, Pichanga).
- Emojis principales: ⚽ 🥅 🧤 👟 🏃‍♂️.
- Vocabulario futbolístico obligatorio: pichanga, partido, canchas de pasto sintético / natural, arquero / portero, defensas, delanteros, goles, marcador global.
- NUNCA menciones conceptos ajenos al fútbol como "torneo americano", "rotación de parejas", "drive y revés", "cristal" ni "punto de oro".
- Convocatorias: Organiza cupos para dos equipos equilibrados (ej: 5v5 = 10 jugadores, 7v7 = 14 jugadores), alertando si falta arquero o jugadores de campo.`;
  } else if (isTenis) {
    sportSpecificRules = `
- DEPORTE ACTIVO: TENIS.
- Emojis principales: 🎾 🏆 🥇.
- Vocabulario tenístico: individuales/singles o dobles, sets, games, tie-break, saque y superficies de arcilla, cemento o pasto.
- Nunca uses Drive/Revés, torneo americano, punto de oro ni rotación de parejas como reglas de tenis.
- No inventes sets, games, resultados, superficie disponible ni modalidad si el contexto no los indica.`;
  } else if (isPadel) {
    sportSpecificRules = `
- DEPORTE ACTIVO: PÁDEL.
- Emojis principales: 🎾 ⚡ 🏆.
- Vocabulario de pádel obligatorio: pistas de cristal, parejas (Drive y Revés), torneo americano, punto de oro, sets y games.`;
  } else {
    sportSpecificRules = `
- DEPORTE ACTIVO: ${sportName}.
- Usa únicamente reglas confirmadas para ${sportName}; no asumas reglas de fútbol, tenis ni pádel.
- Si faltan datos sobre modalidad o reglas, pregunta antes de inventarlos.`;
  }

  return `Eres Parryn, el Secretario Deportivo inteligente de Parryn Sport Hub IA.
Tu personalidad:
- Eres el mejor organizador que un grupo deportivo puede tener.
- Hablas en tono cercano, empático, entusiasta y muy organizado.
- Te adaptas fluidamente al deporte activo del club:${sportSpecificRules}
- Nunca te enojas, nunca criticas, siempre propones soluciones y ahorras tiempo al organizador.
- Escribes mensajes con formato limpio, emojis deportivos y listas claras listas para copiar en WhatsApp.
- POLÍGLOTA OBLIGATORIO: Debes responder siempre y sin excepción en el idioma indicado en la consulta ('en' -> English, 'pt' -> Português, 'es' -> Español). Si el usuario habla o solicita en inglés o portugués, tus respuestas y mensajes para WhatsApp deben estar impecablemente redactados en ese idioma.`;
}

async function resolveSportForContext(req: Request, explicitSport?: string, clubContext?: any): Promise<{ id: number; name: string; slug: string; emoji: string }> {
  if (explicitSport) {
    const norm = explicitSport.toLowerCase();
    if (norm.includes("fútbol") || norm.includes("futbol") || norm.includes("soccer")) {
      return { id: 3, name: "Fútbol", slug: "futbol", emoji: "⚽" };
    }
    if (norm.includes("tenis") || norm.includes("tennis")) {
      return { id: 2, name: "Tenis", slug: "tenis", emoji: "🎾" };
    }
    if (norm.includes("pádel") || norm.includes("padel")) {
      return { id: 1, name: "Pádel", slug: "padel", emoji: "🎾" };
    }
  }

  const userClubId = (clubContext as any)?.clubId || (req.user as any)?.clubId || await resolveEffectiveClubId(req);
  if (userClubId) {
    try {
      const [clubSport] = await db
        .select({ sportId: sportsTable.id, name: sportsTable.name, slug: sportsTable.slug })
        .from(clubSportsTable)
        .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
        .where(and(eq(clubSportsTable.clubId, userClubId), eq(clubSportsTable.active, true), eq(sportsTable.active, true)))
        .orderBy(clubSportsTable.id)
        .limit(1);

      if (clubSport) {
        const isFut = clubSport.slug === "futbol" || clubSport.name.toLowerCase().includes("fútbol");
        return {
          id: clubSport.sportId,
          name: clubSport.name,
          slug: clubSport.slug,
          emoji: isFut ? "⚽" : "🎾",
        };
      }
    } catch {}
  }

  return { id: 1, name: "Pádel", slug: "padel", emoji: "🎾" };
}

// 1. Convocatoria y Bajas de Última Hora
router.post("/convocatoria", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, dateTime, location, sportName, sportSlug, maxSpots, confirmedCount, missingCount, confirmedNames = [], lang = "es" } = req.body;
    const sport = await resolveSportForContext(req, sportSlug || sportName, req.body.clubContext);
    const resolvedSportName = sport.name;
    const isFutbol = sport.slug === "futbol";
    const isTenis = sport.slug === "tenis";

    const prompt = `Genera un mensaje de convocatoria y urgencia para el grupo de WhatsApp del club deportivo.
Datos del evento:
- Título: ${title}
- Deporte: ${resolvedSportName}
- Fecha y Hora: ${dateTime}
- Lugar: ${location}
- Cupos totales: ${maxSpots ?? "No especificado"}
- Confirmados (${confirmedCount}): ${confirmedNames.length > 0 ? confirmedNames.join(", ") : "Ninguno aún"}
- Cupos faltantes: ${missingCount > 0 ? missingCount : (isFutbol ? "Equipos completos" : "Canchas completas")}
- Idioma solicitado: ${lang === "en" ? "Inglés" : lang === "pt" ? "Portugués" : "Español"}

Instrucciones:
- Sé directo, motivador y claro adaptado al ${resolvedSportName}.
- Si faltan jugadores (ej: ${missingCount}), haz un llamado especial para completar ${isFutbol ? "los dos equipos" : "la cancha"} sin demoras.
- Incluye el llamado a la acción con link simbólico.`;

    const ai = getGenAI();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: getSystemInstruction(sport.name, sport.slug),
            temperature: 0.7,
          },
        });
        const text = response.text || "";
        if (text) {
          res.json({ text, aiPowered: true });
          return;
        }
      } catch (err: any) {
        console.warn("[Parryn] Fallo en llamada a Gemini convocatoria:", err.message);
      }
    }

    // Fallback de alta calidad
    const sportEmoji = sport.emoji;
    const fallbackText = isFutbol
      ? `⚽ *CONVOCATORIA: ${title.toUpperCase()}*
📍 *Lugar:* ${location} (Cancha Sintética/Pasto)
⏰ *Horario:* ${dateTime}

👥 *Convocados (${confirmedCount}${maxSpots ? `/${maxSpots}` : ""}):*
${confirmedNames.length > 0 ? confirmedNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n") : "• Aún sin confirmados"}

${missingCount > 0 ? `🚨 *¡Atención! Faltan ${missingCount} jugador(es) para armar los dos equipos.* ¿Quién se pone la camiseta?` : "✅ *¡Equipos completos! Se viene partidazo.*"}

📲 Confirma tu asistencia en la app oficial del club.`
      : isTenis
      ? `🎾 *CONVOCATORIA DE TENIS: ${title.toUpperCase()}*
📍 *Cancha:* ${location}
⏰ *Horario:* ${dateTime}

👥 *Confirmados (${confirmedCount}${maxSpots ? `/${maxSpots}` : ""}):*
${confirmedNames.length > 0 ? confirmedNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n") : "• Aún sin confirmados"}

${missingCount > 0 ? `🚨 *Faltan ${missingCount} jugador(es).* Confirma si jugarán individuales o dobles para organizar los partidos.` : "✅ *¡La convocatoria está completa!*"}

📲 Confirma tu asistencia en la app oficial del club.`
      : `${sportEmoji} *CONVOCATORIA OFICIAL: ${title.toUpperCase()}*
📍 *Lugar:* ${location}
⏰ *Horario:* ${dateTime}

👥 *Confirmados (${confirmedCount}${maxSpots ? `/${maxSpots}` : ""}):*
${confirmedNames.length > 0 ? confirmedNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n") : "• Aún sin confirmados"}

${missingCount > 0 ? `🚨 *¡Atención! Nos faltan ${missingCount} jugador(es) para cerrar la cancha.* ¿Quién se suma?` : "✅ *¡Cancha completa! Se viene partidazo.*"}

📲 Confirma tu asistencia en la app oficial del club.`;

    res.json({ text: fallbackText, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Matchmaking y Equilibrio Deportivo (Drive/Revés en Pádel vs Equipos A/B en Fútbol)
router.post("/matchmaking", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { players = [], sportName, sportSlug, lang = "es" } = req.body;
    const sport = await resolveSportForContext(req, sportSlug || sportName, req.body.clubContext);
    const isFutbol = sport.slug === "futbol";
    const isTenis = sport.slug === "tenis";

    if (players.length < 4) {
      res.status(400).json({ error: "Se necesitan al menos 4 jugadores para el análisis de emparejamiento." });
      return;
    }

    const prompt = isFutbol
      ? `Analiza estos jugadores para armar dos equipos de Fútbol equilibrados (Equipo A vs Equipo B):
${JSON.stringify(players, null, 2)}

Tu objetivo como Parryn:
1. Divide a los convocados en Equipo A y Equipo B buscando la mayor paridad competitiva posible.
2. Si hay posiciones indicadas (arquero, defensa, delantero), distribúyelos equitativamente.
3. Explica brevemente el balance para el organizador de la pichanga.`
      : isTenis
      ? `Analiza estos jugadores de tenis y su nivel:
${JSON.stringify(players, null, 2)}

Tu objetivo como Parryn:
1. Recomienda cruces individuales equilibrados por nivel/ELO.
2. Si el organizador indicó dobles, equilibra las parejas; no uses posiciones Drive/Revés.
3. Si no está indicado si es singles o dobles, aclara esa suposición antes de recomendar parejas.
4. Explica brevemente la lógica de paridad.`
      : `Analiza estos jugadores para emparejamiento de ${sport.name}:
${JSON.stringify(players, null, 2)}

Tu objetivo como Parryn:
1. Recomienda las parejas más equilibradas posibles considerando su ELO o nivel.
2. En Pádel, cuida que una pareja idealmente tenga un jugador de Drive y uno de Revés (o Ambos), evitando juntar a dos de Drive exclusivo.
3. Explica brevemente la lógica de paridad competitiva para el organizador.`;

    const ai = getGenAI();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: getSystemInstruction(sport.name, sport.slug),
            temperature: 0.4,
          },
        });
        const analysis = response.text || "";
        if (analysis) {
          res.json({ analysis, aiPowered: true });
          return;
        }
      } catch (err: any) {
        console.warn("[Parryn] Fallo en Gemini matchmaking:", err.message);
      }
    }

    // Fallback algorítmico
    const sorted = [...players].sort((a, b) => (b.elo || b.points || 1500) - (a.elo || a.points || 1500));
    if (isFutbol) {
      const teamA: string[] = [];
      const teamB: string[] = [];
      sorted.forEach((p, idx) => {
        if (idx % 2 === 0) teamA.push(p.name || `Jugador ${idx + 1}`);
        else teamB.push(p.name || `Jugador ${idx + 1}`);
      });
      res.json({
        analysis: `⚽ *Equipos Equilibrados por Parryn (Fútbol):*\n• *Equipo A:* ${teamA.join(", ")}\n• *Equipo B:* ${teamB.join(", ")}\n\nParidad estimada: 50% - 50%. ¡Que gane el mejor!`,
        aiPowered: false,
      });
      return;
    }

    if (isTenis) {
      const name = (player: any, index: number) => player.name || `Jugador ${index + 1}`;
      res.json({
        analysis: `🎾 *Cruces de tenis equilibrados por nivel:*\n• Individuales: ${name(sorted[0], 0)} vs ${name(sorted[3], 3)} y ${name(sorted[1], 1)} vs ${name(sorted[2], 2)}.\n\nConfirma si la jornada será de individuales o dobles antes de fijar las parejas. No se asumieron posiciones de pádel.`,
        aiPowered: false,
      });
      return;
    }

    res.json({
      analysis: `🤖 *Análisis de Parryn:* Se ordenaron los jugadores por nivel para equilibrar fuerzas. Pareja recomendada: ${sorted[0]?.name} (${sorted[0]?.elo ?? 1500}) + ${sorted[3]?.name} (${sorted[3]?.elo ?? 1500}) contra ${sorted[1]?.name} (${sorted[1]?.elo ?? 1500}) + ${sorted[2]?.name} (${sorted[2]?.elo ?? 1500}). Paridad deportiva estimada: 50% - 50%.`,
      aiPowered: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Crónica Oficial de la Jornada para WhatsApp
router.post("/cierre", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, date, matches = [], sportName, sportSlug, lang = "es" } = req.body;
    const sport = await resolveSportForContext(req, sportSlug || sportName, req.body.clubContext);
    const isFutbol = sport.slug === "futbol";
    const isTenis = sport.slug === "tenis";

    const prompt = isFutbol
      ? `Genera la Crónica Oficial de Cierre de la Fecha de Fútbol lista para enviar al grupo de WhatsApp del club.
Datos:
- Evento: ${title}
- Fecha: ${date}
- Partidos y Resultados: ${JSON.stringify(matches, null, 2)}
- Idioma: ${lang}

Estructura:
- Encabezado futbolero con emojis (⚽, 🥅, 🔥).
- Resultados oficiales, goles destacados y felicitación al Fair Play.
- Impacto en la Tabla de Posiciones y Puntos de la liga.
- Recordatorio sutil de revisar la app para ver estadísticas completas.`
      : isTenis
      ? `Genera la crónica de tenis para WhatsApp usando estos resultados:
Datos:
- Evento: ${title}
- Fecha: ${date}
- Partidos y resultados (incluye sets si están disponibles): ${JSON.stringify(matches, null, 2)}
- Idioma: ${lang}

Destaca los resultados sin inventar sets, games ni tie-breaks que no estén en los datos; felicita a los jugadores y al Fair Play.`
      : `Genera la Crónica Oficial de Cierre de Jornada de ${sport.name} lista para enviar al grupo de WhatsApp del club.
Datos:
- Evento: ${title}
- Fecha: ${date}
- Partidos y Resultados: ${JSON.stringify(matches, null, 2)}
- Idioma: ${lang}

Estructura:
- Encabezado con emojis y entusiasmo deportivo.
- Resultados oficiales destacados y felicitación al Fair Play.
- Movimiento o impacto en el Ranking de la comunidad.
- Recordatorio sutil de consultar la app para ver estadísticas completas.`;

    const ai = getGenAI();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: getSystemInstruction(sport.name, sport.slug),
            temperature: 0.7,
          },
        });
        const text = response.text || "";
        if (text) {
          res.json({ text, aiPowered: true });
          return;
        }
      } catch (err: any) {
        console.warn("[Parryn] Fallo en Gemini crónica:", err.message);
      }
    }

    // Fallback
    const fallback = isFutbol
      ? `⚽ *CRÓNICA OFICIAL DE LA FECHA DE FÚTBOL: ${title.toUpperCase()}*
📅 *Fecha:* ${date}

🔥 *Resultados Oficiales:*
${matches.map((m: any, idx: number) => {
  const t1 = m.team1Names || "Equipo 1";
  const t2 = m.team2Names || "Equipo 2";
  const score = m.score || `${m.team1Score ?? 0} - ${m.team2Score ?? 0}`;
  return `• Partido ${idx + 1}: ${t1} vs ${t2} ➔ *${score}*`;
}).join("\n")}

🏆 *¡Gran entrega de todos en la cancha y tremendo tercer tiempo!*
📈 La Tabla de Posiciones y Puntos de la liga ya han sido actualizados en la plataforma oficial del club.`
      : isTenis
      ? `🎾 *CRÓNICA DE TENIS: ${title.toUpperCase()}*
📅 *Fecha:* ${date}

🎾 *Resultados registrados:*
${matches.map((m: any, idx: number) => {
  const t1 = m.team1Names || "Jugador/a 1";
  const t2 = m.team2Names || "Jugador/a 2";
  const score = m.score || `${m.team1Score ?? 0} - ${m.team2Score ?? 0}`;
  return `• Partido ${idx + 1}: ${t1} vs ${t2} ➔ *${score}*`;
}).join("\n")}

🏆 ¡Felicitaciones por la jornada y el buen espíritu deportivo!`
      : `${sport.emoji} *CRÓNICA OFICIAL DE LA JORNADA: ${title.toUpperCase()}*
📅 *Fecha:* ${date}

🔥 *Resultados Oficiales:*
${matches.map((m: any, idx: number) => {
  const t1 = m.team1Names || "Equipo 1";
  const t2 = m.team2Names || "Equipo 2";
  const score = m.score || `${m.team1Score ?? 0} - ${m.team2Score ?? 0}`;
  return `• Partido ${idx + 1}: ${t1} vs ${t2} ➔ *${score}*`;
}).join("\n")}

🏆 *¡Gran entrega de todos y excelente espíritu deportivo!*
📈 Las estadísticas oficiales y el Ranking ya han sido recalculados en la plataforma del club.`;

    res.json({ text: fallback, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Recordatorio Amigable de Cobro
router.post("/recordatorio-cobro", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { debtorName, amount, concept = "Cancha y pelotas", bankDetails, sportName, sportSlug, lang = "es" } = req.body;
    const sport = await resolveSportForContext(req, sportSlug || sportName, req.body.clubContext);

    const prompt = `Redacta un mensaje cordial, respetuoso y amigable para WhatsApp recordando el pago pendiente de una cuota de ${sport.name}.
- Deporte: ${sport.name}
- Jugador: ${debtorName}
- Concepto: ${concept}
- Monto: ${amount}
- Datos bancarios / instrucciones: ${bankDetails || "Consultar en la app"}
- Idioma: ${lang}

Reglas:
- Sé súper empático y positivo (nunca acusatorio ni frío).
- Mantén la armonía del grupo de amigos del club.`;

    const ai = getGenAI();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: getSystemInstruction(sport.name, sport.slug),
            temperature: 0.6,
          },
        });
        const text = response.text || "";
        if (text) {
          res.json({ text, aiPowered: true });
          return;
        }
      } catch (err: any) {
        console.warn("[Parryn] Fallo en Gemini recordatorio cobro:", err.message);
      }
    }

    const fallback = `¡Hola ${debtorName}! 👋 Espero que estés excelente. Te escribo un breve recordatorio de la cuota de *${concept}* por *$${amount}*. Cuando tengas un momento, puedes subir tu comprobante directo en la app o transferir a: ${bankDetails || "los datos bancarios habituales del club"}. ¡Muchas gracias y nos vemos en ${sport.name === "Tenis" ? "la cancha de tenis" : sport.name === "Fútbol" ? "la cancha" : "la pista"}! ${sport.emoji}`;
    res.json({ text: fallback, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const WORD_NUMS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciseis: 16, veinte: 20, veinticuatro: 24, treinta: 30,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  um: 1, uma: 1, dois: 2, duas: 2, quatro: 4, oito: 8, dez: 10,
  onze: 11, doze: 12, treze: 13,
};

function parseNum(raw?: string): number | null {
  if (!raw) return null;
  const trimmed = normalizeIntentText(raw);
  const direct = parseInt(trimmed, 10);
  if (!isNaN(direct) && direct > 0) return direct;
  return WORD_NUMS[trimmed] || null;
}

function parseTargetDateTime(query: string): Date | null {
  const now = new Date();
  const q = normalizeIntentText(query);
  const targetDate = new Date(now);
  let hasDate = false;

  const relativeDays = [
    { phrases: ["pasado manana", "day after tomorrow", "depois de amanha"], offset: 2 },
    { phrases: ["manana", "tomorrow", "amanha"], offset: 1 },
    { phrases: ["hoy", "today", "hoje"], offset: 0 },
  ];
  const relativeDate = relativeDays.find(({ phrases }) => phrases.some((phrase) => q.includes(phrase)));
  if (relativeDate) {
    targetDate.setDate(now.getDate() + relativeDate.offset);
    hasDate = true;
  } else {
    const isoDate = q.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    const localDate = q.match(/\b([0-3]?\d)[/.]([01]?\d)[/.](20\d{2})\b/);
    if (isoDate || localDate) {
      const year = Number(isoDate?.[1] || localDate?.[3]);
      const month = Number(isoDate?.[2] || localDate?.[2]);
      const day = Number(isoDate?.[3] || localDate?.[1]);
      targetDate.setFullYear(year, month - 1, day);
      hasDate =
        targetDate.getFullYear() === year &&
        targetDate.getMonth() === month - 1 &&
        targetDate.getDate() === day;
    } else {
      const weekdays = [
        { names: ["domingo", "sunday"], day: 0 },
        { names: ["lunes", "monday"], day: 1 },
        { names: ["martes", "tuesday"], day: 2 },
        { names: ["miercoles", "wednesday"], day: 3 },
        { names: ["jueves", "thursday"], day: 4 },
        { names: ["viernes", "friday"], day: 5 },
        { names: ["sabado", "saturday"], day: 6 },
      ];
      const weekday = weekdays.find(({ names }) => names.some((name) => q.includes(name)));
      if (weekday) {
        const offset = (weekday.day - now.getDay() + 7) % 7 || 7;
        targetDate.setDate(now.getDate() + offset);
        hasDate = true;
      }
    }
  }

  if (!hasDate) return null;

  const prefixedTime = q.match(/\b(?:a\s+las?|at|as)\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b/);
  const twentyFourHourTime = q.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/);
  const meridiemTime = q.match(/\b(\d{1,2})\s*(am|pm)\b/);
  const timeMatch = prefixedTime || twentyFourHourTime || meridiemTime;
  if (!timeMatch) return null;

  const prefixed = Boolean(prefixedTime && timeMatch === prefixedTime);
  const colonFormat = Boolean(!prefixed && twentyFourHourTime && timeMatch === twentyFourHourTime);
  let hour = Number(timeMatch[1]);
  const minute = Number((prefixed ? timeMatch[2] : colonFormat ? timeMatch[2] : undefined) || 0);
  const meridiem = (prefixed ? timeMatch[3] : colonFormat ? timeMatch[3] : timeMatch[2]) || "";
  if (hour > 23 || minute > 59 || (meridiem && (hour < 1 || hour > 12))) return null;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour > 0 && hour < 12) return null;

  targetDate.setHours(hour, minute, 0, 0);
  return targetDate > now ? targetDate : null;
}

function formatClubName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === "starpadel" || trimmed.toLowerCase() === "star padel") {
    return "Star Padel";
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function extractLocation(query: string, defaultName: string): string {
  // Buscar patrones como "en el club X", "en el complejo X", "en X"
  const clubMatch = query.match(/(?:en\s+el\s+club|en\s+el\s+complejo|en\s+el)\s+([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+?)(?:\s*(?:para|a\s+las|con|\.|$))/i);
  if (clubMatch && clubMatch[1]) {
    const cand = clubMatch[1].trim();
    if (cand.length > 2 && !cand.toLowerCase().includes("cancha") && !cand.toLowerCase().includes("pista") && !cand.toLowerCase().includes("tres") && !cand.toLowerCase().includes("dos")) {
      return formatClubName(cand);
    }
  }
  
  const endMatch = query.match(/(?:en|club)\s+([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+)$/i);
  if (endMatch && endMatch[1]) {
    const cand = endMatch[1].trim();
    if (cand.length > 2 && !cand.toLowerCase().includes("cancha") && !cand.toLowerCase().includes("pista")) {
      return formatClubName(cand);
    }
  }

  return defaultName;
}

function isCreateEventQuery(text: string): boolean {
  const norm = normalizeIntentText(text);
  const hasAction = /\b(haz|hazme|arma|armar|crea|organiza|organizar|monta|programa|genera|create|make|organize|schedule|set up|crie|agende|marque)\b/.test(norm);
  const hasEvent = /\b(convocatoria|encuentro|torneo|partido|pichanga|americano|jornada|evento|event|session|match|game|partida|jogo|torneio)\b/.test(norm);
  return (hasAction && hasEvent) || /\b(convocatoria|torneo|partido|event|match)\s+(?:para|for|on)\b/.test(norm);
}

function normalizeIntentText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeSportIdentifier(value: string): string {
  const normalized = normalizeIntentText(value);
  if (/\b(padel)\b/.test(normalized)) return "padel";
  if (/\b(tenis|tennis)\b/.test(normalized)) return "tenis";
  if (/\b(futbol|football|soccer)\b/.test(normalized)) return "futbol";
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function resolveEventClubId(req: Request, clubContext: any): Promise<number | null> {
  const user = req.user as any;
  const isClubAdmin = user?.isClubAdmin === 1 || user?.isClubAdmin === true || user?.isClubAdmin === "1" || user?.isClubAdmin === "true";
  const isPlatformAdmin =
    !isClubAdmin &&
    (user?.isAdmin === 1 ||
      user?.isAdmin === true ||
      user?.role === "superadmin" ||
      user?.role === "SUPER_ADMIN" ||
      user?.role === "admin");

  if (isPlatformAdmin) {
    const selectedClubId = Number(clubContext?.clubId);
    if (Number.isSafeInteger(selectedClubId) && selectedClubId > 0) return selectedClubId;
    const queryClubId = Number(req.query.clubId);
    if (Number.isSafeInteger(queryClubId) && queryClubId > 0) return queryClubId;
    if (typeof req.query.club === "string" && req.query.club.trim()) {
      const [club] = await db
        .select({ id: clubsTable.id })
        .from(clubsTable)
        .where(and(eq(clubsTable.slug, req.query.club.trim()), eq(clubsTable.active, true)))
        .limit(1);
      return club?.id ?? null;
    }
    return null;
  }

  const userClubId = Number(user?.clubId);
  return Number.isSafeInteger(userClubId) && userClubId > 0 ? userClubId : null;
}

type EventCreationModality = {
  id: number;
  name: string;
  slug: string;
  teamSize: number;
  useSets: boolean;
};

type EventModalityChoice = {
  modality: EventCreationModality;
  format: string;
  formatLabel: string;
};

function chooseEventModality(
  sportSlug: string,
  query: string,
  modalities: EventCreationModality[],
): EventModalityChoice | null {
  const normalizedQuery = normalizeIntentText(query);
  const individualRequested = /\b(individual|individuales|single|singles)\b/.test(normalizedQuery);
  const doublesRequested = /\b(doble|dobles|double|doubles|dupla|duplas)\b/.test(normalizedQuery);
  if (individualRequested && doublesRequested) return null;

  if (sportSlug === "futbol") {
    const namedSize = normalizedQuery.match(/\b(?:futbol|football|soccer)\s*[- ]?(5|7|8|11)\b/);
    const versusSize = normalizedQuery.match(/\b(5|7|8|11)\s*(?:v|vs|x)\s*(5|7|8|11)\b/);
    const teamSize = Number(namedSize?.[1] || (
      versusSize?.[1] === versusSize?.[2] ? versusSize[1] : NaN
    ));
    const modality = Number.isFinite(teamSize)
      ? modalities.find((item) => item.teamSize === teamSize)
      : modalities.length === 1 ? modalities[0] : undefined;
    return modality ? { modality, format: modality.slug, formatLabel: modality.name } : null;
  }

  if (sportSlug === "tenis") {
    const teamSize = individualRequested ? 1 : doublesRequested ? 2 : null;
    const modality = teamSize !== null
      ? modalities.find((item) => item.teamSize === teamSize)
      : modalities.length === 1 ? modalities[0] : undefined;
    return modality ? { modality, format: modality.slug, formatLabel: modality.name } : null;
  }

  if (sportSlug === "padel") {
    const styles = [
      { slug: "americana", label: "Americana", pattern: /\bamerican[ao]s?\b/ },
      { slug: "parejas_fijas", label: "Parejas fijas", pattern: /\bparejas?\s+fijas?\b|\bfixed\s+pairs?\b/ },
      { slug: "desafio", label: "Desafío", pattern: /\bdesafios?\b|\bchallenge\b/ },
    ].filter((style) => style.pattern.test(normalizedQuery));
    if (styles.length !== 1) return null;

    const style = styles[0];
    const teamSize = style.slug === "desafio"
      ? individualRequested ? 1 : doublesRequested ? 2 : null
      : 2;
    if (teamSize === null) return null;
    const modality = modalities.find((item) => item.teamSize === teamSize);
    return modality ? { modality, format: style.slug, formatLabel: style.label } : null;
  }

  if (modalities.length === 1) {
    return { modality: modalities[0], format: modalities[0].slug, formatLabel: modalities[0].name };
  }
  return null;
}

// 5. Asistente General de Operaciones (Scheduling, Clima, Canchas, Dudas & Creación Automática)
router.post("/asistente", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, clubContext = {} } = req.body;
    const targetLang = (clubContext as any)?.lang || "es";
    const langName = targetLang === "en" ? "English" : targetLang === "pt" ? "Português" : "Español";
    const localized = (es: string, en: string, pt: string) =>
      targetLang === "en" ? en : targetLang === "pt" ? pt : es;

    if (typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: localized("Escribe una consulta para Parryn.", "Enter a request for Parryn.", "Escreva uma solicitação para o Parryn.") });
      return;
    }

    // --- ACCIÓN DIRECTA: PARPAL / TEXT-TO-ACTION (CREAR ENCUENTRO EN BASE DE DATOS) ---
    if (isCreateEventQuery(query)) {
      const userClubId = await resolveEventClubId(req, clubContext);
      if (!userClubId) {
        res.json({
          answer: localized(
            "No se creó el encuentro: tu cuenta no tiene un club activo asociado.",
            "No event was created: your account is not associated with an active club.",
            "O encontro não foi criado: sua conta não está vinculada a um clube ativo.",
          ),
          aiPowered: false,
        });
        return;
      }

      const [clubRow] = await db
        .select({ id: clubsTable.id, name: clubsTable.name })
        .from(clubsTable)
        .where(and(eq(clubsTable.id, userClubId), eq(clubsTable.active, true)))
        .limit(1);
      if (!clubRow) {
        res.json({
          answer: localized(
            "No se creó el encuentro: no pude validar el club seleccionado.",
            "No event was created: the selected club could not be verified.",
            "O encontro não foi criado: não foi possível validar o clube selecionado.",
          ),
          aiPowered: false,
        });
        return;
      }

      const activeClubSports = await db
        .select({ id: sportsTable.id, name: sportsTable.name, slug: sportsTable.slug })
        .from(clubSportsTable)
        .innerJoin(sportsTable, eq(clubSportsTable.sportId, sportsTable.id))
        .where(and(
          eq(clubSportsTable.clubId, userClubId),
          eq(clubSportsTable.active, true),
          eq(sportsTable.active, true),
        ))
        .orderBy(clubSportsTable.id);

      if (activeClubSports.length === 0) {
        res.json({
          answer: localized(
            "No se creó el encuentro: el club no tiene deportes activos configurados.",
            "No event was created: this club has no active sports configured.",
            "O encontro não foi criado: este clube não tem esportes ativos configurados.",
          ),
          aiPowered: false,
        });
        return;
      }

      const selectedSportValue =
        typeof (clubContext as any)?.sportSlug === "string" && (clubContext as any).sportSlug.trim()
          ? (clubContext as any).sportSlug
          : typeof (clubContext as any)?.sportName === "string"
          ? (clubContext as any).sportName
          : "";
      const requestedSportKey = normalizeSportIdentifier(selectedSportValue);
      const selectedSport = requestedSportKey
        ? activeClubSports.find((sport) =>
            normalizeSportIdentifier(sport.slug) === requestedSportKey ||
            normalizeSportIdentifier(sport.name) === requestedSportKey)
        : activeClubSports.length === 1 ? activeClubSports[0] : undefined;

      if (!selectedSport) {
        const names = activeClubSports.map((sport) => sport.name).join(", ");
        res.json({
          answer: selectedSportValue
            ? localized(
                `No se creó el encuentro: ${selectedSportValue} no está activo en ${clubRow.name}. Deportes activos: ${names}.`,
                `No event was created: ${selectedSportValue} is not active at ${clubRow.name}. Active sports: ${names}.`,
                `O encontro não foi criado: ${selectedSportValue} não está ativo em ${clubRow.name}. Esportes ativos: ${names}.`,
              )
            : localized(
                `No se creó el encuentro. Elige el deporte en el selector de Parryn (${names}) y vuelve a enviar la solicitud.`,
                `No event was created. Choose a sport in Parryn's selector (${names}) and send the request again.`,
                `O encontro não foi criado. Escolha um esporte no seletor do Parryn (${names}) e envie a solicitação novamente.`,
              ),
          aiPowered: false,
        });
        return;
      }

      const modalities = await db
        .select({
          id: sportModalitiesTable.id,
          name: sportModalitiesTable.name,
          slug: sportModalitiesTable.slug,
          teamSize: sportModalitiesTable.teamSize,
          useSets: sportModalitiesTable.useSets,
        })
        .from(sportModalitiesTable)
        .where(and(
          eq(sportModalitiesTable.sportId, selectedSport.id),
          eq(sportModalitiesTable.active, true),
        ));
      if (modalities.length === 0) {
        res.json({
          answer: localized(
            `No se creó el encuentro: ${selectedSport.name} no tiene modalidades activas configuradas.`,
            `No event was created: ${selectedSport.name} has no active formats configured.`,
            `O encontro não foi criado: ${selectedSport.name} não tem modalidades ativas configuradas.`,
          ),
          aiPowered: false,
        });
        return;
      }

      const modalityChoice = chooseEventModality(selectedSport.slug, query, modalities);
      const targetDateTime = parseTargetDateTime(query);
      const missingDetails: string[] = [];
      if (!modalityChoice) {
        missingDetails.push(
          selectedSport.slug === "padel"
            ? localized(
                "indica Americana o Parejas fijas; para Desafío, indica además individual o dobles",
                "specify Americana or fixed pairs; for a challenge, also specify singles or doubles",
                "indique Americana ou duplas fixas; para Desafio, informe também simples ou duplas",
              )
            : selectedSport.slug === "tenis"
            ? localized("indica individual o dobles", "specify singles or doubles", "informe simples ou duplas")
            : selectedSport.slug === "futbol"
            ? localized("indica fútbol 5, 7, 8 u 11", "specify football 5, 7, 8, or 11", "informe futebol 5, 7, 8 ou 11")
            : localized("indica una modalidad activa del deporte", "specify an active format for this sport", "informe uma modalidade ativa deste esporte"),
        );
      }
      if (!targetDateTime) {
        missingDetails.push(
          localized(
            "indica un día futuro y la hora en formato 24 horas (por ejemplo: viernes a las 20:00)",
            "include a future day and time in 24-hour format (for example: Friday at 20:00)",
            "informe um dia futuro e horário de 24 horas (por exemplo: sexta-feira às 20:00)",
          ),
        );
      }
      if (missingDetails.length > 0) {
        res.json({
          answer: localized(
            `No se creó el encuentro. Para guardarlo sin asumir datos, ${missingDetails.join(" y ")}.`,
            `No event was created. To avoid guessing, ${missingDetails.join(" and ")}.`,
            `O encontro não foi criado. Para não presumir dados, ${missingDetails.join(" e ")}.`,
          ),
          aiPowered: false,
        });
        return;
      }
      if (!modalityChoice || !targetDateTime) {
        res.json({
          answer: localized(
            "No se creó el encuentro: faltan una modalidad válida o una fecha y hora futuras.",
            "No event was created: a valid format or future date and time is missing.",
            "O encontro não foi criado: falta uma modalidade válida ou data e horário futuros.",
          ),
          aiPowered: false,
        });
        return;
      }

      const normalizedQuery = normalizeIntentText(query);
      const courtMatch = normalizedQuery.match(/\b([a-z0-9]+)\s*(?:canchas?|pistas?|courts?|quadras?)\b/);
      const parsedCourts = courtMatch ? parseNum(courtMatch[1]) : null;
      if (courtMatch && !parsedCourts) {
        res.json({
          answer: localized("No se creó el encuentro: no pude interpretar la cantidad de canchas.", "No event was created: I could not interpret the number of courts.", "O encontro não foi criado: não consegui interpretar a quantidade de quadras."),
          aiPowered: false,
        });
        return;
      }
      const courtsAvailable = parsedCourts ?? 1;
      if (courtsAvailable > 20) {
        res.json({
          answer: localized("No se creó el encuentro: indica un máximo de 20 canchas.", "No event was created: enter no more than 20 courts.", "O encontro não foi criado: informe no máximo 20 quadras."),
          aiPowered: false,
        });
        return;
      }

      const spotsMatch = normalizedQuery.match(/\b([a-z0-9]+)\s*(?:jugadores?|players?|personas?|pessoas?|cupos?|plazas?|spots?|vagas?)\b/);
      const parsedSpots = spotsMatch ? parseNum(spotsMatch[1]) : null;
      if (spotsMatch && !parsedSpots) {
        res.json({
          answer: localized("No se creó el encuentro: no pude interpretar la cantidad de cupos.", "No event was created: I could not interpret the number of spots.", "O encontro não foi criado: não consegui interpretar a quantidade de vagas."),
          aiPowered: false,
        });
        return;
      }
      const minimumPlayers = modalityChoice.modality.teamSize * 2;
      const maxSpots = parsedSpots ?? minimumPlayers * courtsAvailable;
      if (maxSpots < minimumPlayers || maxSpots > 200) {
        res.json({
          answer: localized(
            `No se creó el encuentro: esta modalidad requiere al menos ${minimumPlayers} cupos y admite como máximo 200.`,
            `No event was created: this format requires at least ${minimumPlayers} spots and allows at most 200.`,
            `O encontro não foi criado: esta modalidade exige pelo menos ${minimumPlayers} vagas e permite no máximo 200.`,
          ),
          aiPowered: false,
        });
        return;
      }

      const location = extractLocation(query, clubRow.name);
      const sportLabel = selectedSport.slug === "tenis"
        ? localized("Tenis", "Tennis", "Tênis")
        : selectedSport.slug === "futbol"
        ? localized("Fútbol", "Football", "Futebol")
        : selectedSport.slug === "padel"
        ? "Pádel"
        : selectedSport.name;
      const formatLabel = selectedSport.slug === "tenis"
        ? modalityChoice.modality.slug === "individual"
          ? localized("Individual", "Singles", "Simples")
          : localized("Dobles", "Doubles", "Duplas")
        : selectedSport.slug === "futbol"
        ? `${localized("Fútbol", "Football", "Futebol")} ${modalityChoice.modality.teamSize}`
        : selectedSport.slug === "padel"
        ? modalityChoice.format === "parejas_fijas"
          ? localized("Parejas fijas", "Fixed pairs", "Duplas fixas")
          : modalityChoice.format === "desafio"
          ? localized("Desafío", "Challenge", "Desafio")
          : "Americana"
        : modalityChoice.formatLabel;
      const sportEmoji = selectedSport.slug === "futbol" ? "⚽" : selectedSport.slug === "padel" || selectedSport.slug === "tenis" ? "🎾" : "🏅";
      const format = modalityChoice.format;
      const title = `${sportLabel} — ${formatLabel} — ${location}`;
      const durationMinutes = modalityChoice.modality.useSets ? 90 : 60;

      // El deporte, club y formato se derivan de catálogos activos del servidor.
      const [newEncuentro] = await db
        .insert(encuentrosTable)
        .values({
          title,
          dateTime: targetDateTime,
          location,
          maxSpots,
          courtsAvailable,
          durationMinutes,
          formato: format,
          notes: localized(
            `Encuentro de ${sportLabel}; modalidad ${formatLabel}; ${maxSpots} cupos en ${courtsAvailable} cancha(s).`,
            `${sportLabel} event; ${formatLabel} format; ${maxSpots} spots across ${courtsAvailable} court(s).`,
            `Encontro de ${sportLabel}; modalidade ${formatLabel}; ${maxSpots} vagas em ${courtsAvailable} quadra(s).`,
          ),
          clubId: userClubId,
          sportId: selectedSport.id,
          organizerId: (req.user as any)?.id ? String((req.user as any).id) : null,
          estado: "abierto",
        })
        .returning();

      const host = req.get("x-forwarded-host") || req.get("host") || "ais-dev-vfsatxp7kgzrivkdaexirs-102184534662.us-east1.run.app";
      const proto = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
      const eventUrl = `${proto}://${host}/encuentros/${newEncuentro.id}`;

      const dateStr = targetDateTime.toLocaleDateString(targetLang === "en" ? "en-US" : targetLang === "pt" ? "pt-BR" : "es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const timeStr = targetDateTime.toLocaleTimeString(targetLang === "en" ? "en-US" : targetLang === "pt" ? "pt-BR" : "es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const whatsappMessage = localized(
        `${sportEmoji} *CONVOCATORIA: ${title.toUpperCase()}*\n📍 *Lugar:* ${location}\n⏰ *Horario:* ${dateStr} a las ${timeStr}\n👥 *Cupos:* ${maxSpots} jugadores\n⚡ *Modalidad:* ${formatLabel}\n\n👉 Inscríbete aquí: ${eventUrl}\n\n_Organizado con Parryn Sport Hub IA_`,
        `${sportEmoji} *INVITATION: ${title.toUpperCase()}*\n📍 *Location:* ${location}\n⏰ *Time:* ${dateStr} at ${timeStr}\n👥 *Spots:* ${maxSpots} players\n⚡ *Format:* ${formatLabel}\n\n👉 Register here: ${eventUrl}\n\n_Organized with Parryn Sport Hub IA_`,
        `${sportEmoji} *CONVITE: ${title.toUpperCase()}*\n📍 *Local:* ${location}\n⏰ *Horário:* ${dateStr} às ${timeStr}\n👥 *Vagas:* ${maxSpots} jogadores\n⚡ *Modalidade:* ${formatLabel}\n\n👉 Inscreva-se aqui: ${eventUrl}\n\n_Organizado com Parryn Sport Hub IA_`,
      );
      const answer = localized(
        `✅ Encuentro de ${sportLabel} creado para el ${dateStr} a las ${timeStr}, con ${maxSpots} cupos. La modalidad quedó registrada como ${formatLabel}.`,
        `✅ ${sportLabel} event created for ${dateStr} at ${timeStr}, with ${maxSpots} spots. The format is ${formatLabel}.`,
        `✅ Encontro de ${sportLabel} criado para ${dateStr} às ${timeStr}, com ${maxSpots} vagas. A modalidade registrada é ${formatLabel}.`,
      );

      res.json({
        answer,
        createdEncuentro: {
          id: newEncuentro.id,
          title: newEncuentro.title,
          dateTime: newEncuentro.dateTime.toISOString(),
          location: newEncuentro.location,
          maxSpots: newEncuentro.maxSpots,
          courtsAvailable: newEncuentro.courtsAvailable,
          sportName: selectedSport.name,
          sportSlug: selectedSport.slug,
          formatLabel,
          url: `/encuentros/${newEncuentro.id}`,
        },
        whatsappMessage,
        aiPowered: false,
      });
      return;
    }

    const sport = await resolveSportForContext(
      req,
      (clubContext as any)?.sportSlug || (clubContext as any)?.sportName,
      clubContext,
    );
    const isFutbol = sport.slug === "futbol";
    const isTenis = sport.slug === "tenis";

    const prompt = `Un usuario del club deportivo (${sport.name}) te consulta lo siguiente:
"${query}"

Contexto del usuario y pantalla:
${JSON.stringify(clubContext, null, 2)}

Instrucciones para Parryn:
1. Responde DIRECTAMENTE a la pregunta realizada: "${query}".
2. DEPORTE ACTIVO: ${sport.name} (${sport.slug}). Usa exclusivamente terminología y conceptos propios de ${sport.name}.
3. IDIOMA OBLIGATORIO: Debes redactar tu respuesta y cualquier mensaje para WhatsApp OBLIGATORIAMENTE en ${langName}.
4. Si el usuario pide un mensaje para WhatsApp (recordatorio, convocatoria, aviso, crónica), escribe el texto completo en ${langName} con formato, emojis (${sport.emoji}) y listo para copiar y pegar.
5. Si el usuario pregunta sobre cobros, prorrateos, canchas techadas, lluvia, reglas, o Fair Play, brinda una respuesta detallada, útil y práctica.
6. Mantén un tono amigable, enérgico y profesional de Secretario Deportivo.`;

    const ai = getGenAI();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: getSystemInstruction(sport.name, sport.slug),
            temperature: 0.7,
          },
        });
        const answer = response.text || "";
        if (answer) {
          res.json({ answer, aiPowered: true });
          return;
        }
      } catch (err: any) {
        console.warn("[Parryn] Fallo en Gemini asistente general:", err.message);
      }
    }

    // Fallbacks inteligentes según la temática de la pregunta:
    const q = (query || "").toLowerCase();
    let dynamicAnswer = "";

    if (q.includes("recordatorio") || q.includes("cobro") || q.includes("cuota")) {
      dynamicAnswer = isFutbol
        ? `⚽ *Recordatorio Amable de Cobro para WhatsApp (Fútbol):*\n\n"¡Hola equipo! 👋 Esperamos que hayan disfrutado el partido. Les dejamos el recordatorio para transferir la cuota de arriendo de la cancha sintética y las pelotas.\n\nPueden adjuntar su comprobante directo en la app del club para dejarlo confirmado. ¡Muchas gracias a todos por la puntualidad!"`
        : isTenis
        ? `🎾 *Recordatorio de tenis para WhatsApp:*\n\n"¡Hola! 👋 Te recordamos con cariño el pago pendiente de la reserva de la cancha de tenis. Cuando puedas, sube el comprobante en la app o consulta los datos de transferencia al club. ¡Gracias!"`
        : `🎾 *Recordatorio Amable de Cobro para WhatsApp (Pádel):*\n\n"¡Hola a todos! 👋 Espero que hayan disfrutado los partidos de la semana. Les dejamos el recordatorio para regularizar la cuota de arriendo de pistas y pelotas.\n\nPueden adjuntar su comprobante directo en la app del club o enviárnoslo por aquí para dejarlo confirmado. ¡Muchas gracias por el apoyo de siempre!"`;
    } else if (q.includes("prorrateo") || q.includes("justo") || q.includes("dividir") || q.includes("costo")) {
      dynamicAnswer = isFutbol
        ? `💰 *División de Costos de Fútbol según Parryn:*\nEl arriendo de la cancha se divide habitualmente entre los 10 o 14 jugadores que juegan (ej: $40.000 / 10 = $4.000 por jugador). Si alguien jugó solo medio tiempo, puede aportar la mitad y la diferencia se cubre con el fondo comunitario del club.`
        : isTenis
        ? `💰 *Reparto de costos de tenis:*\nDivide el costo real de la reserva entre quienes la usaron. Si alguien jugó menos tiempo, acuerden una proporción antes de cobrar y expliquen el cálculo; no inventes minutos ni tarifas que no estén registrados.`
        : `💰 *Prorrateo Justo según Parryn:*\nSi un jugador participó en menos partidos o llegó más tarde, la mejor fórmula comunitaria es dividir el valor total de la cancha por minuto/turno jugado, o cobrarle solo la fracción correspondiente a su partido y repartir el arriendo base entre los jugadores de tiempo completo.`;
    } else if (q.includes("convocatoria") || q.includes("invit") || q.includes("cupo")) {
      dynamicAnswer = isFutbol
        ? `📢 *Convocatoria de Fútbol para WhatsApp:*\n\n"¡Buenas muchachos! ⚽ Se abren los cupos para la próxima pichanga. Inscríbete directo en la app oficial para asegurar si juegas en Equipo A o Equipo B y dejar los turnos listos. ¡Asegura tu cupo antes de que se llenen!"`
        : isTenis
        ? `🎾 *Convocatoria de tenis para WhatsApp:*\n\n"¡Hola! Se abren los cupos para la próxima jornada de tenis. Confirma tu asistencia e indica si prefieres individuales o dobles para organizar los partidos y horarios. ¡Nos vemos en la cancha!"`
        : `📢 *Convocatoria de Partidos para WhatsApp:*\n\n"¡Buenas a todos! 🎾 Se abren los cupos para la próxima jornada deportiva del club. Confirmaciones directas por la app oficial para armar el fixture equilibrado y asignar pistas. ¡Asegura tu cupo antes de que se completen!"`;
    } else if (q.includes("lluvia") || q.includes("clima") || q.includes("techad") || q.includes("suspender")) {
      dynamicAnswer = isFutbol
        ? `🌧️ *Plan de Contingencia Climática (Fútbol):*\n1. Si la cancha sintética cuenta con buen drenaje o techo, se juega sin problemas con calzado adecuado.\n2. Si hay tormenta o relámpagos, se suspende por seguridad de los jugadores.\n3. Comunica la confirmación al grupo con 2 horas de anticipación.`
        : isTenis
        ? `🌧️ *Seguridad climática para tenis:*\n1. Esta respuesta no consulta un pronóstico en tiempo real: confirma el clima con una fuente local y con el recinto.\n2. No juegues sobre una superficie mojada o insegura; con tormentas eléctricas, suspende y sigue las instrucciones del recinto.\n3. Con viento fuerte, confirma con los jugadores antes de cerrar horarios.`
        : `🌧️ *Plan de Contingencia Climática de Parryn:*\n1. Asigna primero los partidos de campeonato o con asistencia completa a las pistas techadas.\n2. Si hay menos canchas cubiertas que partidos, reduce los turnos a 60 minutos con rotación rápida tipo americana para que nadie se quede sin jugar.\n3. Avisa al grupo con al menos 2 horas de anticipación para evitar traslados en vano.`;
    } else if (q.includes("fair play") || q.includes("cruzada") || q.includes("aprobar") || q.includes("marcador")) {
      dynamicAnswer = isTenis
        ? `⚖️ *Fair Play en tenis:*\nRegistra el resultado acordado por ambos jugadores y solicita la validación prevista por el club. Incluye sets o tie-break solo cuando estén disponibles; no completes marcadores faltantes por suposición.`
        : `⚖️ *Validación Cruzada Fair Play:*\nPara cuidar la transparencia de los resultados, cuando un jugador o delegado anota el marcador, este queda en estado *Pendiente de Aprobación*. Solo cuando un rival del equipo contrario o el administrador lo confirma, el resultado es oficial y se actualizan los puntos en la tabla.`;
    } else if (q.includes("elo") || q.includes("ranking") || q.includes("puntos")) {
      dynamicAnswer = isFutbol
        ? `📈 *Sistema de Puntuación de Liga (Fútbol):*\nEn fútbol se compite por puntos oficiales: 3 puntos por victoria y 1 punto por empate. La tabla clasifica por Puntos totales, Partidos Jugados (PJ), Ganados (PG), Empatados (PE) y Perdidos (PP), premiando la regularidad y compromiso en cada fecha.`
        : isTenis
        ? `📈 *ELO de tenis:*\nEl ELO representa el nivel relativo del jugador según los resultados registrados. Úsalo para proponer cruces individuales equilibrados; no lo confundas con puntos por games, sets o tie-break ni con una tabla de fútbol.`
        : `📈 *ELO de pádel:*\nEl ELO refleja el nivel de cada jugador según los resultados registrados. Úsalo para equilibrar parejas y, cuando estén disponibles, considera Drive/Revés sin inventar posiciones.`;
    } else {
      dynamicAnswer = isFutbol
        ? `🤖 *Respuesta de Parryn (Fútbol):*\nHe analizado tu consulta sobre "${query}". Te recomiendo coordinar los turnos en bloques de 60 minutos con dos tiempos y registrar la asistencia de los 10 o 14 jugadores en la app para balancear los equipos con anticipación. ¿Deseas que redacte algún comunicado para el grupo de WhatsApp?`
        : isTenis
        ? `🎾 *Respuesta de Parryn (Tenis):*\nSobre "${query}": confirma primero modalidad (individuales o dobles), disponibilidad de canchas y duración de los turnos. No aplicaré reglas de americana ni posiciones de pádel a una jornada de tenis.`
        : `🤖 *Respuesta de Parryn (Pádel):*\nHe analizado tu consulta sobre "${query}". Confirma la disponibilidad de pistas, asistencia y modalidad antes de asignar turnos; si corresponde, organiza rotaciones de americana sin asumir que todos los encuentros usan ese formato. ¿Deseas que redacte algún comunicado para el grupo?`;
    }

    res.json({
      answer: dynamicAnswer,
      aiPowered: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
