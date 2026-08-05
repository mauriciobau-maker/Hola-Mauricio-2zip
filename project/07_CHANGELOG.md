# 06 — Changelog

- **Creado:** 2026-08-03
- **Última actualización:** 2026-08-03

## Propósito

Registro cronológico de cambios importantes realizados en el proyecto: nuevas funcionalidades lanzadas, breaking changes, correcciones críticas y migraciones de base de datos. Dirigido tanto al equipo técnico como a stakeholders no técnicos.
# Versión interna 0.0.1

Fecha:
2026-08-04

## P0-001 — COMPLETADO

### Descripción

Se implementó la inicialización automática de la tabla `sports`.

### Resultado

- La aplicación inicializa automáticamente los deportes oficiales cuando la tabla está vacía.
- La operación es completamente idempotente.
- No se modificó el schema de la base de datos.
- No se modificaron migraciones.
- No se alteró ninguna funcionalidad existente.

### Estado

✅ Aprobado por auditoría técnica.

# 2026-08-04

## P0-001 — Inicialización automática de deportes

### Estado

🟢 Completado

### Descripción

Se implementó la inicialización automática de la tabla sports.

### Resultado

- Seed automático.
- Completamente idempotente.
- Sin cambios al schema.
- Sin cambios a migraciones.
- Sin impacto en otros módulos.

### Auditoría

Cambio aprobado tras revisión técnica.

# P0-002 — Corrección match_players.team

Fecha:
2026-08-04

Estado:
🟢 Completado

Descripción:

Se corrigió la inconsistencia del campo match_players.team.

El sistema ahora utiliza exclusivamente:

- team1
- team2

Se eliminó el uso de valores numéricos y casts forzados.

Impacto:

Los partidos generados desde encuentros ahora son compatibles con:

- Ranking
- Elo
- Parejas
- Estadísticas