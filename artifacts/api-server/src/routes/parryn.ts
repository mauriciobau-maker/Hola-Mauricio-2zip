import { Router, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { requireAuth, resolveEffectiveClubId } from "../middlewares/requireCommunity";
import { db, encuentrosTable, clubsTable, sportsTable, clubSportsTable, sportModalitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: Router = Router();

function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
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
- DEPORTE ACTIVO: FÚTBOL (fútbol 5, 7, 11, pichanga).
- Emojis principales: ⚽ 🥅 🧤.
- Vocabulario futbolístico obligatorio: pichanga, partido, canchas de pasto sintético / natural, arquero, defensas, delanteros, goles, marcador global.
- NUNCA menciones reglas de pádel/tenis como drive, revés, americana ni punto de oro.`;
  } else if (isTenis) {
    sportSpecificRules = `
- DEPORTE ACTIVO: TENIS.
- Emojis principales: 🎾 🏆.
- Usa vocabulario tenístico: singles, dobles, sets, games, tie-break, saque, superficie, juego y puntos.
- NUNCA uses Drive/Revés, torneo americano, punto de oro ni rotación de parejas como reglas de tenis.`;
  } else if (isPadel) {
    sportSpecificRules = `
- DEPORTE ACTIVO: PÁDEL.
- Emojis principales: 🎾 ⚡ 🏆.
- Vocabulario de pádel obligatorio: pista de cristal, parejas, Drive, Revés, americano, punto de oro, sets y games.`;
  } else {
    sportSpecificRules = `
- DEPORTE ACTIVO: ${sportName}.
- Usa solo reglas confirmadas para ese deporte; no inventes conceptos de fútbol, tenis o pádel.`;
  }

  return `Eres Parryn, el Secretario Deportivo inteligente de Parryn Sport Hub IA.
Tu personalidad:
- Eres el mejor organizador que un grupo deportivo puede tener.
- Hablas en tono cercano, empático, entusiasta y muy organizado.
- Te adaptas fluidamente al deporte activo del club:${sportSpecificRules}
- Nunca te enojas, nunca criticas, siempre propones soluciones y ahorras tiempo al organizador.
- Escribes mensajes con formato limpio, emojis deportivos y listas claras listas para copiar en WhatsApp.
- POLÍGLOTA OBLIGATORIO: Debes responder siempre y sin excepción en el idioma indicado en la consulta ('en' -> English, 'pt' -> Português, 'es' -> Español).`;
}

async function resolveSportForContext(req: Request, explicitSport?: string, clubContext?: any): Promise<{ id: number; name: string; slug: string; emoji: string }> {
  const rawSport = explicitSport || (clubContext as any)?.sportSlug || (clubContext as any)?.sportName;
  if (rawSport) {
    const norm = rawSport.toLowerCase();
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

  const userClubId = (clubContext as any)?.clubId || (req.user as any)?.clubId || (await resolveEffectiveClubId(req));
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
        return { id: clubSport.sportId, name: clubSport.name, slug: clubSport.slug, emoji: isFut ? "⚽" : "🎾" };
      }
    } catch {
      // ignore
    }
  }

  return { id: 1, name: "Pádel", slug: "padel", emoji: "🎾" };
}

router.post("/convocatoria", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, dateTime, location, sportName, sportSlug, maxSpots, confirmedCount, missingCount, confirmedNames = [], lang = "es" } = req.body;
    const sport = await resolveSportForContext(req, sportSlug || sportName, req.body.clubContext);
    const isFutbol = sport.slug === "futbol";
    const isTenis = sport.slug === "tenis";

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `Genera un mensaje de convocatoria y urgencia para ${sport.name}.\nDatos: ${JSON.stringify({ title, dateTime, location, sportName: sport.name, maxSpots, confirmedCount, missingCount, confirmedNames, lang }, null, 2)}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { systemInstruction: getSystemInstruction(sport.name, sport.slug), temperature: 0.7 },
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

    const fallbackText = isFutbol
      ? `⚽ *CONVOCATORIA DE FÚTBOL: ${String(title || "Partido").toUpperCase()}*\n📍 *Lugar:* ${location}\n⏰ *Horario:* ${dateTime}\n\n👥 *Confirmados (${confirmedCount}${maxSpots ? `/${maxSpots}` : ""}):*\n${confirmedNames.length > 0 ? confirmedNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n") : "• Aún sin confirmados"}\n\n${missingCount > 0 ? `🚨 *Faltan ${missingCount} jugador(es) para completar los dos equipos.*` : "✅ *¡Equipos completos!*"}\n\n📲 Confirma tu asistencia en la app del club.`
      : isTenis
      ? `🎾 *CONVOCATORIA DE TENIS: ${String(title || "Partido").toUpperCase()}*\n📍 *Cancha:* ${location}\n⏰ *Horario:* ${dateTime}\n\n👥 *Confirmados (${confirmedCount}${maxSpots ? `/${maxSpots}` : ""}):*\n${confirmedNames.length > 0 ? confirmedNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n") : "• Aún sin confirmados"}\n\n${missingCount > 0 ? `🚨 *Faltan ${missingCount} jugador(es).* Confirma si jugarán individuales o dobles.` : "✅ *¡La convocatoria está completa!*"}\n\n📲 Confirma tu asistencia en la app del club.`
      : `🎾 *CONVOCATORIA DE ${sport.name.toUpperCase()}: ${String(title || "Partido").toUpperCase()}*\n📍 *Lugar:* ${location}\n⏰ *Horario:* ${dateTime}\n\n👥 *Confirmados (${confirmedCount}${maxSpots ? `/${maxSpots}` : ""}):*\n${confirmedNames.length > 0 ? confirmedNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n") : "• Aún sin confirmados"}\n\n${missingCount > 0 ? `🚨 *Nos faltan ${missingCount} jugador(es).*` : "✅ *¡Cancha completa!*"}\n\n📲 Confirma tu asistencia en la app del club.`;

    res.json({ text: fallbackText, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `Analiza estos jugadores para ${sport.name}: ${JSON.stringify(players, null, 2)}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { systemInstruction: getSystemInstruction(sport.name, sport.slug), temperature: 0.4 },
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

    const sorted = [...players].sort((a, b) => (b.elo || b.points || 1500) - (a.elo || a.points || 1500));
    if (isFutbol) {
      const teamA: string[] = [];
      const teamB: string[] = [];
      sorted.forEach((player, index) => {
        const name = player.name || `Jugador ${index + 1}`;
        if (index % 2 === 0) teamA.push(name);
        else teamB.push(name);
      });
      res.json({ analysis: `⚽ *Equipos equilibrados:*\n• Equipo A: ${teamA.join(", ")}\n• Equipo B: ${teamB.join(", ")}`, aiPowered: false });
      return;
    }

    if (isTenis) {
      res.json({
        analysis: `🎾 *Cruces de tenis equilibrados por nivel:*\n• ${sorted[0]?.name ?? "Jugador 1"} vs ${sorted[3]?.name ?? "Jugador 4"}\n• ${sorted[1]?.name ?? "Jugador 2"} vs ${sorted[2]?.name ?? "Jugador 3"}\n\nConfirma si es individuales o dobles antes de cerrar la programación.`,
        aiPowered: false,
      });
      return;
    }

    res.json({
      analysis: `🤖 *Análisis de Parryn:* Se ordenaron los jugadores por nivel y se recomienda: ${sorted[0]?.name ?? "Jugador 1"} + ${sorted[3]?.name ?? "Jugador 4"}.`,
      aiPowered: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/cierre", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, date, matches = [], sportName, sportSlug, lang = "es" } = req.body;
    const sport = await resolveSportForContext(req, sportSlug || sportName, req.body.clubContext);
    const isFutbol = sport.slug === "futbol";
    const isTenis = sport.slug === "tenis";

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `Genera la crónica oficial de ${sport.name} usando estos resultados: ${JSON.stringify(matches, null, 2)}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { systemInstruction: getSystemInstruction(sport.name, sport.slug), temperature: 0.7 },
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

    const fallback = isFutbol
      ? `⚽ *CRÓNICA DE FÚTBOL: ${String(title || "Jornada").toUpperCase()}*\n📅 *Fecha:* ${date}\n\n${matches.map((m: any, i: number) => `• Partido ${i + 1}: ${m.team1Names || "Equipo 1"} vs ${m.team2Names || "Equipo 2"} ➔ *${m.score || `${m.team1Score ?? 0} - ${m.team2Score ?? 0}`}*`).join("\n")}\n\n🏆 ¡Buena jornada!`
      : isTenis
      ? `🎾 *CRÓNICA DE TENIS: ${String(title || "Jornada").toUpperCase()}*\n📅 *Fecha:* ${date}\n\n${matches.map((m: any, i: number) => `• Partido ${i + 1}: ${m.team1Names || "Jugador/a 1"} vs ${m.team2Names || "Jugador/a 2"} ➔ *${m.score || `${m.team1Score ?? 0} - ${m.team2Score ?? 0}`}*`).join("\n")}\n\n🏆 ¡Felicitaciones por la jornada!`
      : `🎾 *CRÓNICA ${sport.name.toUpperCase()}: ${String(title || "Jornada").toUpperCase()}*\n📅 *Fecha:* ${date}\n\n${matches.map((m: any, i: number) => `• Partido ${i + 1}: ${m.team1Names || "Equipo 1"} vs ${m.team2Names || "Equipo 2"} ➔ *${m.score || `${m.team1Score ?? 0} - ${m.team2Score ?? 0}`}*`).join("\n")}\n\n🏆 ¡Gran esfuerzo y buen espíritu deportivo!`;

    res.json({ text: fallback, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/recordatorio-cobro", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { debtorName, amount, concept = "Cancha y pelotas", bankDetails, sportName, sportSlug, lang = "es" } = req.body;
    const sport = await resolveSportForContext(req, sportSlug || sportName, req.body.clubContext);

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `Redacta un mensaje cordial para recordar el pago de ${sport.name}: ${JSON.stringify({ debtorName, amount, concept, bankDetails, lang }, null, 2)}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { systemInstruction: getSystemInstruction(sport.name, sport.slug), temperature: 0.6 },
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

    const fallback = `¡Hola ${debtorName}! 👋 Te recordamos la cuota de *${concept}* por *$${amount}*. Puedes confirmar el pago en la app o transferir a: ${bankDetails || "datos del club"}. Muchas gracias y nos vemos en ${sport.slug === "futbol" ? "la cancha" : sport.slug === "tenis" ? "la cancha de tenis" : "la pista"}.`;
    res.json({ text: fallback, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/asistente", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, clubContext = {} } = req.body;
    const targetLang = (clubContext as any)?.lang || "es";
    const langName = targetLang === "en" ? "English" : targetLang === "pt" ? "Português" : "Español";
    const sport = await resolveSportForContext(req, (clubContext as any)?.sportSlug || (clubContext as any)?.sportName, clubContext);

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `Un usuario del club deportivo (${sport.name}) te consulta: "${query}". Debes responder en ${langName}.`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { systemInstruction: getSystemInstruction(sport.name, sport.slug), temperature: 0.7 },
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

    const q = String(query || "").toLowerCase();
    let answer = `🤖 *Respuesta de Parryn (${sport.name}):* He revisado tu consulta sobre "${query}". Confirma la modalidad, la fecha y el número de participantes antes de cerrar turnos.`;

    if (q.includes("lluvia") || q.includes("clima") || q.includes("suspender")) {
      answer = sport.slug === "tenis"
        ? `🌧️ *Seguridad climática para tenis:* revisa el estado de la superficie y la normativa del recinto. Si hay tormenta o resbalón, suspende y avisa al grupo.`
        : `🌧️ *Plan de contingencia:* da prioridad a canchas cubiertas, avisa con anticipación y no juegues si hay tormenta o riesgos de seguridad.`;
    } else if (q.includes("convocatoria") || q.includes("cupo") || q.includes("invit")) {
      answer = sport.slug === "tenis"
        ? `🎾 *Convocatoria de tenis:* confirma asistentes, individuales o dobles y la hora final antes de cerrar la agenda.`
        : sport.slug === "futbol"
        ? `⚽ *Convocatoria de fútbol:* define 5v5, 7v7 o 11v11, revisa arquero y confirma los cupos.`
        : `🎾 *Convocatoria de pádel:* confirma pistas, parejas y horarios para evitar esperas.`;
    } else if (q.includes("recordatorio") || q.includes("cobro") || q.includes("cuota")) {
      answer = `💳 *Recordatorio:* envía un mensaje amable con la cuota, concepto, monto y datos bancarios o enlace de pago.`;
    } else if (q.includes("elo") || q.includes("ranking")) {
      answer = sport.slug === "tenis"
        ? `📈 *Elo de tenis:* usa nivel relativo y resultados reales para equilibrar cruces y no mezcles criterios de fútbol.`
        : `📈 *Elo:* usa resultados reales y nivel relativo para equilibrar partidas y evitar desequilibrio.`;
    }

    res.json({ answer, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
