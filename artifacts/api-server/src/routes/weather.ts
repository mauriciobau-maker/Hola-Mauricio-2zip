import { Router, type Request, type Response } from "express";
import { db, clubsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: Router = Router();

interface WeatherCacheEntry {
  timestamp: number;
  data: any;
}

const weatherCache = new Map<string, WeatherCacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de caché

function interpretWmoCode(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: "Despejado", icon: "☀️" };
  if (code === 1) return { condition: "Mayormente despejado", icon: "🌤️" };
  if (code === 2) return { condition: "Parcialmente nublado", icon: "⛅" };
  if (code === 3) return { condition: "Nublado", icon: "☁️" };
  if (code === 45 || code === 48) return { condition: "Niebla", icon: "🌫️" };
  if (code >= 51 && code <= 55) return { condition: "Llovizna", icon: "🌦️" };
  if (code >= 61 && code <= 65) return { condition: "Lluvia", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { condition: "Nieve", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { condition: "Chubascos", icon: "🌧️" };
  if (code >= 95 && code <= 99) return { condition: "Tormenta eléctrica", icon: "⛈️" };
  return { condition: "Nublado", icon: "⛅" };
}

export function getFallbackWeather(city = "Santiago", country = "Chile") {
  const now = new Date();
  const hourly = Array.from({ length: 8 }, (_, i) => {
    const hour = (now.getHours() + i) % 24;
    return {
      time: new Date(now.getTime() + i * 3600000).toISOString(),
      hour: `${String(hour).padStart(2, "0")}:00`,
      temp: 20 - Math.min(i, 3),
      rainProb: 10,
      condition: "Parcialmente nublado",
      icon: "⛅",
    };
  });

  const dayNames = ["Hoy", "Mañana", "Pasado mañana"];
  const daily = dayNames.map((dayName, i) => ({
    date: new Date(now.getTime() + i * 86400000).toISOString().slice(0, 10),
    dayName,
    maxTemp: 22,
    minTemp: 13,
    rainProb: 15,
    condition: "Parcialmente nublado",
    icon: "⛅",
  }));

  return {
    city,
    country,
    temperature: 20,
    apparentTemperature: 19,
    humidity: 55,
    windSpeed: 10,
    condition: "Parcialmente nublado",
    icon: "⛅",
    precipitationMm: 0,
    maxRainNextHours: 15,
    sportSuitability: {
      status: "optimal",
      badge: "Condiciones Óptimas",
      color: "emerald",
      recommendation: "Condiciones favorables para la práctica deportiva al aire libre y en pistas techadas.",
      coveredCourtsRecommended: false,
    },
    hourly,
    daily,
    updatedAt: new Date().toISOString(),
    isFallback: true,
  };
}

export async function fetchOpenMeteoWeather(cityName: string, countryName?: string) {
  const cacheKey = `${cityName}_${countryName || ""}`.toLowerCase();
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // 1. Geocoding: Buscar coordenadas
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityName
    )}&count=1&language=es&format=json`;

    const geoRes = await fetch(geoUrl, {
      headers: { "User-Agent": "PadelTrackerApp/1.0 (deporte@padeltracker.com)" },
    });
    let lat = -33.4489;
    let lon = -70.6693;
    let resolvedCity = cityName || "Santiago";
    let resolvedCountry = countryName || "Chile";

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const location = geoData.results?.[0];
      if (location) {
        lat = location.latitude ?? lat;
        lon = location.longitude ?? lon;
        resolvedCity = location.name || resolvedCity;
        resolvedCountry = location.country || resolvedCountry;
      }
    }

    // 2. Forecast: Clima actual + próximas horas y días
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`;

    const weatherRes = await fetch(forecastUrl, {
      headers: { "User-Agent": "PadelTrackerApp/1.0 (deporte@padeltracker.com)" },
    });
    if (!weatherRes.ok) {
      console.warn("[Weather] Fallo al consultar Open-Meteo, usando fallback estructurado");
      return getFallbackWeather(resolvedCity, resolvedCountry);
    }
    const rawWeather = await weatherRes.json();

  const current = rawWeather.current;
  const currentWmo = interpretWmoCode(current.weather_code);

  // Próximas 8 horas desde ahora
  const now = new Date();
  const currentIsoHour = now.toISOString().slice(0, 13);
  let startIndex = 0;
  if (rawWeather.hourly?.time) {
    const idx = rawWeather.hourly.time.findIndex((t: string) => t.startsWith(currentIsoHour));
    if (idx >= 0) startIndex = idx;
  }

  const hourly = (rawWeather.hourly?.time || [])
    .slice(startIndex, startIndex + 8)
    .map((timeStr: string, i: number) => {
      const actualIndex = startIndex + i;
      const hourCode = rawWeather.hourly.weather_code?.[actualIndex] ?? 0;
      const wmo = interpretWmoCode(hourCode);
      const hourDate = new Date(timeStr);
      return {
        time: timeStr,
        hour: `${String(hourDate.getHours()).padStart(2, "0")}:00`,
        temp: Math.round(rawWeather.hourly.temperature_2m?.[actualIndex] ?? 20),
        rainProb: rawWeather.hourly.precipitation_probability?.[actualIndex] ?? 0,
        condition: wmo.condition,
        icon: wmo.icon,
      };
    });

  // Pronóstico de 3 días
  const daily = (rawWeather.daily?.time || []).map((dateStr: string, i: number) => {
    const dayWmo = interpretWmoCode(rawWeather.daily.weather_code?.[i] ?? 0);
    const dateObj = new Date(dateStr + "T12:00:00Z");
    const dayName = dateObj.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
    return {
      date: dateStr,
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      maxTemp: Math.round(rawWeather.daily.temperature_2m_max?.[i] ?? 22),
      minTemp: Math.round(rawWeather.daily.temperature_2m_min?.[i] ?? 12),
      rainProb: rawWeather.daily.precipitation_probability_max?.[i] ?? 0,
      condition: dayWmo.condition,
      icon: dayWmo.icon,
    };
  });

  // Cálculo del Semáforo Deportivo Parryn
  const maxRainNextHours = hourly.reduce((max: number, h: any) => Math.max(max, h.rainProb), 0);
  const currentRain = current.precipitation > 0;
  const windSpeed = Math.round(current.wind_speed_10m || 0);

  let status: "optimal" | "warning" | "danger" = "optimal";
  let badge = "Condiciones Óptimas";
  let color = "emerald";
  let recommendation = "Excelente clima para jugar al aire libre o en pistas techadas sin restricciones.";
  let coveredCourtsRecommended = false;

  if (currentRain || maxRainNextHours >= 65 || current.weather_code >= 61) {
    status = "danger";
    badge = "Riesgo de Lluvia / Suspensión";
    color = "rose";
    recommendation = "Alta probabilidad de precipitaciones. Reubicar turnos prioritarios a pistas techadas o preparar plan de suspensión avisando 2h antes al grupo de WhatsApp.";
    coveredCourtsRecommended = true;
  } else if (maxRainNextHours >= 30 || windSpeed >= 25 || current.weather_code >= 51) {
    status = "warning";
    badge = "Alerta Moderada";
    color = "amber";
    recommendation = `Probabilidad moderada de llovizna (${maxRainNextHours}%) o viento de ${windSpeed} km/h. Se sugiere preasignar canchas techadas para partidos oficiales y confirmar asistencia antes del inicio.`;
    coveredCourtsRecommended = true;
  }

  const result = {
    city: resolvedCity,
    country: resolvedCountry,
    temperature: Math.round(current.temperature_2m),
    apparentTemperature: Math.round(current.apparent_temperature),
    humidity: current.relative_humidity_2m,
    windSpeed,
    condition: currentWmo.condition,
    icon: currentWmo.icon,
    precipitationMm: current.precipitation,
    maxRainNextHours,
    sportSuitability: {
      status,
      badge,
      color,
      recommendation,
      coveredCourtsRecommended,
    },
    hourly,
    daily,
    updatedAt: new Date().toISOString(),
  };

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err: any) {
    console.warn("[Weather] Error al consultar clima externo:", err?.message);
    return getFallbackWeather(cityName || "Santiago", countryName || "Chile");
  }
}

// GET /api/weather — Clima en tiempo real del club actual
router.get("/weather", async (req: Request, res: Response): Promise<void> => {
  try {
    const clubId = req.query.clubId
      ? Number(req.query.clubId)
      : (req.user as any)?.clubId || 1;

    let cityName = (req.query.city as string) || "";
    let countryName = (req.query.country as string) || "Chile";

    if (!cityName && clubId) {
      try {
        const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, clubId));
        if (club) {
          cityName = (club as any).city || (club as any).state || "Santiago";
          countryName = (club as any).country || "Chile";
        }
      } catch {}
    }

    if (!cityName) cityName = "Santiago";

    const weatherData = await fetchOpenMeteoWeather(cityName, countryName);
    res.json(weatherData);
  } catch (error: any) {
    console.error("Error en /api/weather:", error?.message);
    const fallbackData = getFallbackWeather(cityName || "Santiago", countryName || "Chile");
    res.json(fallbackData);
  }
});

export default router;
