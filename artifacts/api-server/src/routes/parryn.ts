import { Router, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "../middlewares/requireCommunity";

const router: Router = Router();

// Inicialización segura del cliente Gemini con fallback elegante
let genAI: GoogleGenAI | null = null;
try {
  genAI = new GoogleGenAI();
} catch (e) {
  console.warn("[Parryn AI] Gemini API key no configurada o cliente local. Modo plantilla activo.");
}

const SYSTEM_INSTRUCTION = `Eres Parryn, el Secretario Deportivo inteligente de Padel Tracker IA.
Tu personalidad:
- Eres el mejor organizador que un grupo deportivo puede tener.
- Hablas en tono cercano, empático, entusiasta y muy organizado.
- Conoces a fondo el pádel, tenis y fútbol (reglas, Elo, posiciones Drive/Revés, dinámicas de grupo).
- Nunca te enojas, nunca criticas, siempre propones soluciones y ahorras tiempo al organizador.
- Escribes mensajes con formato limpio, emojis deportivos y listas claras listas para copiar en WhatsApp.`;

// 1. Convocatoria y Bajas de Última Hora
router.post("/convocatoria", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, dateTime, location, sportName = "Pádel", maxSpots, confirmedCount, missingCount, confirmedNames = [], lang = "es" } = req.body;

    const prompt = `Genera un mensaje de convocatoria y urgencia para el grupo de WhatsApp del club deportivo.
Datos del evento:
- Título: ${title}
- Deporte: ${sportName}
- Fecha y Hora: ${dateTime}
- Lugar: ${location}
- Cupos totales: ${maxSpots ?? "No especificado"}
- Confirmados (${confirmedCount}): ${confirmedNames.length > 0 ? confirmedNames.join(", ") : "Ninguno aún"}
- Cupos faltantes: ${missingCount > 0 ? missingCount : "Canchas completas"}
- Idioma solicitado: ${lang === "en" ? "Inglés" : lang === "pt" ? "Portugués" : "Español"}

Instrucciones:
- Sé directo, motivador y claro.
- Si faltan jugadores (ej: ${missingCount}), haz un llamado especial para completar la cancha sin demoras.
- Incluye el llamado a la acción con link simbólico.`;

    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        const response = await genAI.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
        const text = response.text || "";
        res.json({ text, aiPowered: true });
        return;
      } catch (err: any) {
        console.warn("[Parryn] Fallo en llamada a Gemini, usando generador de respaldo:", err.message);
      }
    }

    // Fallback de alta calidad
    const sportEmoji = sportName.toLowerCase().includes("fútbol") ? "⚽" : "🎾";
    const fallbackText = `${sportEmoji} *CONVOCATORIA OFICIAL: ${title.toUpperCase()}*
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

// 2. Matchmaking y Equilibrio Deportivo (Drive/Revés + Elo)
router.post("/matchmaking", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { players = [], sportName = "Pádel", lang = "es" } = req.body;

    if (players.length < 4) {
      res.status(400).json({ error: "Se necesitan al menos 4 jugadores para el análisis de emparejamiento." });
      return;
    }

    const prompt = `Analiza estos jugadores para emparejamiento de ${sportName}:
${JSON.stringify(players, null, 2)}

Tu objetivo como Parryn:
1. Recomienda las parejas más equilibradas posibles considerando su ELO.
2. En Pádel, cuida que una pareja idealmente tenga un jugador de Drive y uno de Revés (o Ambos), evitando juntar a dos de Drive exclusivo.
3. Explica brevemente la lógica de paridad competitiva para el organizador.`;

    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        const response = await genAI.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.4,
          },
        });
        res.json({ analysis: response.text || "", aiPowered: true });
        return;
      } catch (err: any) {
        console.warn("[Parryn] Fallo en Gemini matchmaking:", err.message);
      }
    }

    // Fallback algorítmico
    const sorted = [...players].sort((a, b) => (b.elo || 1500) - (a.elo || 1500));
    res.json({
      analysis: `🤖 *Análisis de Parryn:* Se ordenaron los jugadores por nivel Elo para equilibrar fuerzas. Pareja recomendada: ${sorted[0]?.name} (${sorted[0]?.elo}) + ${sorted[3]?.name} (${sorted[3]?.elo}) contra ${sorted[1]?.name} (${sorted[1]?.elo}) + ${sorted[2]?.name} (${sorted[2]?.elo}). Paridad deportiva estimada: 50% - 50%.`,
      aiPowered: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Crónica Oficial de la Jornada para WhatsApp
router.post("/cierre", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, date, matches = [], lang = "es" } = req.body;

    const prompt = `Genera la Crónica Oficial de Cierre de Jornada de Pádel/Deportes lista para enviar al grupo de WhatsApp del club.
Datos:
- Evento: ${title}
- Fecha: ${date}
- Partidos y Resultados: ${JSON.stringify(matches, null, 2)}
- Idioma: ${lang}

Estructura:
- Encabezado con emojis y entusiasmo deportivo.
- Resultados oficiales destacados y felicitación al Fair Play.
- Movimiento o impacto en el Ranking Elo de la comunidad.
- Recordatorio sutil de consultar la app para ver estadísticas completas.`;

    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        const response = await genAI.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
        res.json({ text: response.text || "", aiPowered: true });
        return;
      } catch (err: any) {
        console.warn("[Parryn] Fallo en Gemini crónica:", err.message);
      }
    }

    // Fallback
    const fallback = `🎾 *CRÓNICA OFICIAL DE LA JORNADA: ${title.toUpperCase()}*
📅 *Fecha:* ${date}

🔥 *Resultados Oficiales:*
${matches.map((m: any, idx: number) => {
  const t1 = m.team1Names || "Equipo 1";
  const t2 = m.team2Names || "Equipo 2";
  const score = m.score || `${m.team1Score ?? 0} - ${m.team2Score ?? 0}`;
  return `• Partido ${idx + 1}: ${t1} vs ${t2} ➔ *${score}*`;
}).join("\n")}

🏆 *¡Gran entrega de todos y excelente espíritu deportivo!*
📈 Las estadísticas oficiales y el Ranking ELO ya han sido recalculados en la plataforma del club.`;

    res.json({ text: fallback, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Recordatorio Amigable de Cobro
router.post("/recordatorio-cobro", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { debtorName, amount, concept = "Cancha y pelotas", bankDetails, lang = "es" } = req.body;

    const prompt = `Redacta un mensaje cordial, respetuoso y amigable para WhatsApp recordando el pago pendiente de una cuota de juego.
- Jugador: ${debtorName}
- Concepto: ${concept}
- Monto: ${amount}
- Datos bancarios / instrucciones: ${bankDetails || "Consultar en la app"}
- Idioma: ${lang}

Reglas:
- Sé súper empático y positivo (nunca acusatorio ni frío).
- Mantén la armonía del grupo de amigos del club.`;

    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        const response = await genAI.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.6,
          },
        });
        res.json({ text: response.text || "", aiPowered: true });
        return;
      } catch (err: any) {
        console.warn("[Parryn] Fallo en Gemini recordatorio cobro:", err.message);
      }
    }

    const fallback = `¡Hola ${debtorName}! 👋 Espero que estés excelente. Te escribo un breve recordatorio de la cuota de *${concept}* por *$${amount}*. Cuando tengas un momento, puedes subir tu comprobante directo en la app o transferir a: ${bankDetails || "los datos bancarios habituales del club"}. ¡Muchas gracias y nos vemos en la cancha! 🎾`;
    res.json({ text: fallback, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Asistente General de Operaciones (Scheduling, Clima, Canchas)
router.post("/asistente", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, clubContext = {} } = req.body;

    const prompt = `El organizador del club te consulta: "${query}".
Contexto operativo del club: ${JSON.stringify(clubContext)}

Como Parryn, asesóralo con respuestas ejecutivas, prácticas y accionables respecto a:
- Distribución de turnos y canchas (techadas vs abiertas ante riesgo de lluvia).
- Buenas prácticas de rotación y formatos (americana, round robin, torneos).
- Gestión del fair play y dinámica deportiva.`;

    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        const response = await genAI.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
        res.json({ answer: response.text || "", aiPowered: true });
        return;
      } catch (err: any) {
        console.warn("[Parryn] Fallo en Gemini asistente general:", err.message);
      }
    }

    res.json({
      answer: `🤖 *Parryn te sugiere:* Para optimizar el uso de canchas con pronóstico incierto, asigna primero las canchas techadas a los encuentros con mayor cantidad de confirmados o de competencia oficial. En días con alta demanda, los turnos de 90 minutos con rotación cada 30 minutos maximizan la participación de todos los socios.`,
      aiPowered: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
