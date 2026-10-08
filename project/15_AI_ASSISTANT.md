# 15 — Parryn IA: Asistente Deportivo & Secretario Inteligente

- **Documento:** Especificación Funcional de Parryn IA
- **Versión:** 1.1 (Roadmap Siguiente Versión)
- **Estado:** Especificado para desarrollo

---

## 1. Visión y Rol de Parryn IA
Parryn es el copiloto inteligente para organizadores de clubes de pádel, tenis y fútbol. Su propósito es eliminar las tareas operativas tediosas de los administradores y ofrecer a los socios una experiencia personalizada y fluida.

---

## 2. Capacidades de Parryn IA

### A. Organización y Balanceo por Ranking Elo
- Emparejamiento inteligente de parejas y rivales para garantizar partidos nivelados y competitivos.
- Sugerencia de parejas según sinergia histórica y disponibilidad de los jugadores.

### B. Secretario para WhatsApp y Redes Sociales
- Redacción instantánea de convocatorias con emojis, horarios, pistas y enlace de confirmación directa.
- Recordatorios de confirmación de asistencia (RSVP) automáticos.
- Resúmenes semanales de ascensos y descensos en el ranking.

### C. Módulo de Finanzas y Prorrateo
- Cálculo automático de costes de pista, pelotas y luz divididos entre los 4 jugadores.
- Notificaciones de cobros pendientes y descuentos aplicados.

---

## 3. NUEVA CARACTERÍSTICA: Integración Meteorológica Proactiva (Open-Meteo)

### Contexto y Necesidad
En deportes de raqueta, un alto porcentaje de las pistas son descubiertas (*outdoor*). La lluvia repentina o el viento excesivo generan cancelaciones de última hora, disputas y pérdidas económicas para el club.

### Especificación Técnica
1. **Proveedor:** API de **Open-Meteo** (abierta, gratuita, sin límite estricto de cuota y sin necesidad de API key de pago).
2. **Entrada de Datos:**
   - Ubicación geográfica del club (latitud/longitud o ciudad configurada en la tabla `clubs`).
   - Fecha y franja horaria programada para el encuentro (`start_time`, `end_time`).
3. **Variables Analizadas:**
   - `precipitation_probability` (% de probabilidad de lluvia).
   - `precipitation` (mm estimados de lluvia).
   - `windspeed_10m` (velocidad y rachas de viento en km/h).
   - `temperature_2m` (temperatura ambiente).

### Comportamiento de Parryn IA
- **Condiciones Favorables (<30% lluvia, viento <25 km/h):**
  - Muestra un distintivo sutil en la tarjeta del partido: `☀️ 21°C • Condiciones óptimas para jugar`.
- **Riesgo Meteorológico (>=40% lluvia o viento >30 km/h):**
  - **Alerta Visual:** Badge ámbar o rojo en la cabecera del encuentro: `🌧️ 75% Probabilidad de lluvia (18:00 - 20:00)`.
  - **Sugerencia Conversacional:**
    > *"⚠️ Hola, [Admin/Jugador]: Para el sábado a las 18:00 se pronostica lluvia (75%). Si tu club dispone de pistas cubiertas, ¿quieres que reasigne este encuentro a una pista Indoor o prefieres proponer moverlo al domingo a las 11:00 que estará despejado?"*
  - **En el mensaje de WhatsApp:** Se adjunta automáticamente la línea de pronóstico para tranquilidad de los jugadores.
