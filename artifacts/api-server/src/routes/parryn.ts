import { Router, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { isSuperAdminUser, requireAuth, resolveEffectiveClubId } from "../middlewares/requireCommunity";
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
  catorce: 14, quince: 15, dieciseis: 16, veinte: 20, veinticuatro: 24, treinta: 30
};

function parseNum(raw?: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  const direct = parseInt(trimmed, 10);
  if (!isNaN(direct) && direct > 0) return direct;
  return WORD_NUMS[trimmed] || null;
}

function parseTargetDateTime(query: string): Date {
  const now = new Date();
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const targetDate = new Date(now);
  if (q.includes("pasado manana")) {
    targetDate.setDate(now.getDate() + 2);
  } else if (q.includes("manana")) {
    targetDate.setDate(now.getDate() + 1);
  } else if (q.includes("hoy")) {
    targetDate.setDate(now.getDate());
  } else {
    const days: Record<string, number> = {
      domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6
    };
    for (const [dayName, dayIndex] of Object.entries(days)) {
      if (q.includes(dayName)) {
        const diff = (dayIndex - now.getDay() + 7) % 7 || 7;
        targetDate.setDate(now.getDate() + diff);
        break;
      }
    }
  }

  let hour = 19;
  let minute = 0;
  const timeMatch = query.match(/(?:a\s+las|las)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:hrs?|horas?|hs|am|pm)?/i);
  if (timeMatch) {
    const rawH = parseInt(timeMatch[1], 10);
    const rawM = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (rawH >= 0 && rawH <= 23) {
      hour = rawH;
      minute = !isNaN(rawM) ? rawM : 0;
      if (query.toLowerCase().includes("pm") && hour < 12) hour += 12;
    }
  }

  targetDate.setHours(hour, minute, 0, 0);
  return targetDate;
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
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hasAction = norm.includes("haz") || norm.includes("hqz") || norm.includes("arma") || norm.includes("crea") || norm.includes("organiza") || norm.includes("monta") || norm.includes("programa") || norm.includes("genera");
  const hasEvent = norm.includes("convocatoria") || norm.includes("encuentro") || norm.includes("torneo") || norm.includes("partido") || norm.includes("pichanga") || norm.includes("americano");
  return (hasAction && hasEvent) || norm.includes("convocatoria para") || norm.includes("torneo para") || norm.includes("partido para");
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

function resolveEventClubId(req: Request, clubContext: any): number | null {
  const user = req.user as any;
  const userClubId = Number(user?.clubId);
  const hasUserClub = Number.isSafeInteger(userClubId) && userClubId > 0;
  const isPlatformAdmin = isSuperAdminUser(user) && user?.isClubAdmin !== 1 && user?.isClubAdmin !== true;

  if (isPlatformAdmin) {
    const selectedClubId = Number(clubContext?.clubId);
    if (Number.isSafeInteger(selectedClubId) && selectedClubId > 0) return selectedClubId;
    if (req.query.clubId || req.query.club) return null;
  }

  return hasUserClub ? userClubId : null;
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
    const defaultSport = await resolveSportForContext(req, undefined, clubContext);
    const requestedSport = await resolveSportForContext(
      req,
      (clubContext as any)?.sportSlug || (clubContext as any)?.sportName,
      clubContext,
    );
    const isDefaultSportFutbol = defaultSport.slug === "futbol";

    // --- ACCIÓN DIRECTA: PARPAL / TEXT-TO-ACTION (CREAR ENCUENTRO EN BASE DE DATOS) ---
    if (isCreateEventQuery(query)) {
      if (requestedSport.slug === "tenis" || requestedSport.slug !== defaultSport.slug) {
        const creationUnavailableMessage = targetLang === "en"
          ? `No event was created. Automatic event creation does not yet support ${requestedSport.name} or switching sports; use manual creation to avoid saving the wrong format.`
          : targetLang === "pt"
          ? `Nenhum evento foi criado. A criação automática ainda não oferece suporte a ${requestedSport.name} nem à troca de esporte; use a criação manual para evitar salvar o formato errado.`
          : `No se creó ningún encuentro. La creación automática todavía no admite ${requestedSport.name} ni cambia entre deportes; para evitar guardar un formato equivocado, usa la creación manual por ahora.`;
        res.json({
          answer: creationUnavailableMessage,
          aiPowered: false,
        });
        return;
      }

      const userClubId = (req.user as any)?.clubId || (clubContext as any)?.clubId || 1;
      let clubName = (clubContext as any)?.clubName || (isDefaultSportFutbol ? "Liga Fútbol 5 & 7" : "Club Deportivo");
      try {
        const [clubRow] = await db.select().from(clubsTable).where(eq(clubsTable.id, userClubId));
        if (clubRow?.name) clubName = clubRow.name;
      } catch {}

      // Ubicación o club específico indicado en la petición
      const location = extractLocation(query, clubName);

      // Pistas / Canchas
      const courtMatch = query.match(/(\w+|\d+)\s*(?:canchas?|pistas?)/i);
      const parsedCourts = courtMatch ? parseNum(courtMatch[1]) : null;
      const courtsAvailable = parsedCourts && parsedCourts > 0 ? parsedCourts : (isDefaultSportFutbol ? 1 : 3);

      // Jugadores / Cupos
      const spotsMatch = query.match(/(\w+|\d+)\s*(?:jugadores?|personas?|cupos?|plazas?)/i);
      const parsedSpots = spotsMatch ? parseNum(spotsMatch[1]) : null;
      const defaultSpots = isDefaultSportFutbol ? (courtsAvailable * 10) : (courtsAvailable * 4);
      const maxSpots = parsedSpots && parsedSpots > 0 ? parsedSpots : defaultSpots;

      // Fecha y Hora
      const targetDateTime = parseTargetDateTime(query);
      const formato = isDefaultSportFutbol ? "futbol5" : "americano";
      const title = isDefaultSportFutbol ? `Pichanga de Fútbol - ${location}` : `Torneo Americano - ${location}`;

      // Crear encuentro en Neon PostgreSQL
      const [newEncuentro] = await db
        .insert(encuentrosTable)
        .values({
          title,
          dateTime: targetDateTime,
          location,
          maxSpots,
          courtsAvailable,
          durationMinutes: isDefaultSportFutbol ? 60 : 90,
          formato,
          notes: isDefaultSportFutbol
            ? `Convocatoria oficial de Fútbol para ${maxSpots} jugadores en ${courtsAvailable} cancha(s). Dos equipos equilibrados.`
            : `Convocatoria oficial para ${maxSpots} jugadores en ${courtsAvailable} pistas. Formato Torneo Americano con Punto de Oro.`,
          clubId: userClubId,
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

      const whatsappMessage = isDefaultSportFutbol
        ? `⚽ *CONVOCATORIA: ${title.toUpperCase()}*
📍 *Lugar:* ${location} (${courtsAvailable} ${courtsAvailable === 1 ? "cancha sintética" : "canchas"})
⏰ *Horario:* ${dateStr} a las ${timeStr} hrs
👥 *Cupos:* Máximo ${maxSpots} jugadores (2 equipos de ${Math.floor(maxSpots / 2)})

⚡ *Modalidad:* Pichanga Fútbol sin esperas

👉 *Inscríbete y asegura tu cupo aquí:*
${eventUrl}

_Organizado con Parryn Sport Hub IA_`
        : `🎾 *CONVOCATORIA: ${title.toUpperCase()}*
📍 *Lugar:* ${location} (${courtsAvailable} ${courtsAvailable === 1 ? "cancha" : "canchas"})
⏰ *Horario:* ${dateStr} a las ${timeStr} hrs
👥 *Cupos:* Máximo ${maxSpots} jugadores

⚡ *Formato:* Torneo Americano (${courtsAvailable} pistas x 4 jugadores = rotación continua sin esperas)

👉 *Inscríbete y asegura tu cupo aquí:*
${eventUrl}

_Organizado con Parryn Sport Hub IA_`;

      const answer = isDefaultSportFutbol
        ? `⚽ **¡Listo! Partido de fútbol creado con éxito en el sistema.**

He programado el encuentro para el **${dateStr} a las ${timeStr} hrs** con **${maxSpots} cupos** en **${courtsAvailable} cancha(s)** en **${location}**.

A continuación tienes el mensaje listo para compartir al grupo de WhatsApp:`
        : `🎾 **¡Listo! Convocatoria creada con éxito en el sistema.**

He programado el encuentro para el **${dateStr} a las ${timeStr} hrs** con **${maxSpots} cupos** en **${courtsAvailable} canchas** en **${location}**.

A continuación tienes la ficha del torneo y el mensaje listo para compartir al grupo de WhatsApp:`;

      res.json({
        answer,
        createdEncuentro: {
          id: newEncuentro.id,
          title: newEncuentro.title,
          dateTime: newEncuentro.dateTime.toISOString(),
          location: newEncuentro.location,
          maxSpots: newEncuentro.maxSpots,
          courtsAvailable: newEncuentro.courtsAvailable,
          url: `/encuentros/${newEncuentro.id}`,
        },
        whatsappMessage,
        aiPowered: true,
      });
      return;
    }

    const sport = requestedSport;
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
