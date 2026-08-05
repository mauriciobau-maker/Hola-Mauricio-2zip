# TECHNICAL BACKLOG

Versión: 1.0

Última actualización:
2026-08-04

---

# Objetivo

Este documento registra toda la deuda técnica, correcciones, mejoras de arquitectura y tareas internas que no representan funcionalidades visibles para el usuario, pero que son esenciales para la estabilidad, seguridad y escalabilidad de la plataforma.

El Technical Backlog es independiente del Backlog de Producto.

---

# Estados

⬜ Pendiente

🟡 En desarrollo

🟢 Completado

🔴 Bloqueado

---

# Prioridades

P0
Crítico.
Impide el correcto funcionamiento del sistema.

P1
Alta.
Debe resolverse antes de la V1 Comercial.

P2
Media.
Puede esperar después del lanzamiento.

P3
Baja.
Mejoras futuras.

---

# P0

---

## P0-001

Título:
Inicialización automática de deportes (sports)

Estado:
🟢 Completado

Fecha:
2026-08-04

Objetivo:

Inicializar automáticamente la tabla sports cuando una instalación nueva no contiene registros.

Resultado:

✔ Seed automático implementado.

✔ Idempotente.

✔ Sin modificaciones al schema.

✔ Sin modificaciones a migraciones.

✔ Backend estable.

---

## P0-002

Título:
Unificación del modelo match_players.team

Estado:
🟢 Completado

Fecha:
2026-08-04

Objetivo:

Eliminar la inconsistencia entre los módulos que escriben equipos como enteros y aquellos que los interpretan como texto.

Impacto:

- Encuentros
- Ranking
- Parejas
- Match Players
Resultado:

✔ Se unificó match_players.team al formato canónico team1/team2.

✔ Se eliminaron valores numéricos 1/2.

✔ Se eliminó uso de as any.

✔ No fue necesaria migración de datos porque la tabla no tenía registros.

✔ Cambio limitado exclusivamente a encuentros.ts.


## P0-003

Título:
Aislamiento total entre comunidades

Estado:

⬜ Pendiente

Objetivo:

Garantizar que ningún usuario pueda visualizar información perteneciente a otra comunidad.

---

## P0-004

Título:

Validación de permisos sobre partidos

Estado:

⬜ Pendiente

Objetivo:

Garantizar que únicamente usuarios autorizados puedan modificar partidos.

---

## P0-005

Título:

Activación del módulo de notificaciones

Estado:

⬜ Pendiente

Objetivo:

Conectar el módulo existente al sistema principal.

---

## P0-006

Título:

Unificación del Ranking y ELO

Estado:

⬜ Pendiente

Objetivo:

Eliminar inconsistencias entre el cálculo de puntos y el cálculo de ELO.

---

# P1

(Se completará posteriormente)

---

# P2

(Se completará posteriormente)

---

# P3

(Se completará posteriormente)