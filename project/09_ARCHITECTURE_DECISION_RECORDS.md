# 09 — Architecture Decision Records

- **Estado:** Activo
- **Última actualización:** 2026-09-04

## ADR-P0-001 — Aislamiento obligatorio por comunidad

**Estado:** Aprobado

Toda operación que acceda a datos de una comunidad debe validar el contexto y autorización en backend. El frontend no constituye una barrera de seguridad.

El aislamiento aplica a Players, Memberships, encuentros, RSVP/asistencia, partidos, parejas, resultados, historial ELO, rankings, estadísticas y administración.

## ADR-P0-002 — Contexto temporal para Super Admin

**Estado:** Aprobado

Super Admin puede seleccionar temporalmente una comunidad para operar dentro de ella. Este contexto no modifica la Membership permanente ni convierte al Super Admin en miembro. Al salir, vuelve al contexto global.

## ADR-P0-003 — Sin fallback de comunidad arbitrario

**Estado:** Aprobado

Si no existe contexto comunitario válido, el backend debe rechazar la operación que lo requiera. Nunca debe seleccionar automáticamente “el primer club” u otra comunidad por defecto.

## ADR-P0-004 — Autorización centralizada

**Estado:** Aprobado

Las rutas deben apoyarse en mecanismos centrales como `requireCommunityAccess` y `getCurrentClubId(req)` para resolver y validar el contexto. No se deben crear controles inconsistentes por endpoint cuando una regla general sea aplicable.

## ADR-P0-005 — Historial ELO aislado

**Estado:** Aprobado

El historial ELO debe quedar restringido a la comunidad correspondiente al Player y a sus partidos. Super Admin puede consultar globalmente, pero no debe mezclarse el historial deportivo de comunidades distintas.

## ADR-P0-006 — Datos oficiales e historia son no destructivos

**Estado:** Aprobado

Player y Membership no se eliminan físicamente. Los hechos deportivos oficiales tampoco se borran silenciosamente. Las correcciones sensibles deben ser autorizadas y auditables.

## ADR-P0-007 — Reglas de ELO congeladas durante P0

**Estado:** Aprobado

P0 no modifica la lógica deportiva de rating. Se mantienen las reglas vigentes de ELO/ranking y se corrige únicamente el aislamiento de datos y autorización.

## ADR-P0-008 — Regla de continuidad documental

**Estado:** Aprobado

Toda regla funcional o de negocio que sea finalizada debe quedar documentada en `project/` antes de considerarse cerrada. La Biblia del proyecto (`00_PADEL_TRACKER_IA_BIBLIA.md`) es el resumen canónico; `05_DECISIONS.md` conserva el registro histórico de decisiones.