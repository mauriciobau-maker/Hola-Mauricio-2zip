# 18 — P0 AUDITORÍA JUGADORES → EDITAR

- **Fecha:** 2026-09-07
- **Rama:** `p0/community-isolation`
- **Estado:** EN AUDITORÍA / corrección estructural aplicada
- **Alcance:** Editar Player completo, no solo apodo

## 1. Hallazgo que inició la auditoría

En Club 3, con rol Club Admin, modificar `Apodo` y guardar no producía error, pero el valor no persistía.

La causa no era el campo `nickname` aislado. El endpoint PATCH existente utilizaba `isSuperAdminUser()` para decidir si podía actualizar `name` y `nickname`. Por diseño, Club Admin es un rol distinto de Super Admin; por tanto, el payload era aceptado pero esos campos eran descartados y la respuesta volvía con el valor anterior.

Además, el endpoint aceptaba campos adicionales directamente desde `req.body`, fuera del esquema validado, y permitía que un usuario autenticado modificara datos de otro Player de su comunidad si conocía el ID.

## 2. Regla funcional aplicada

La pantalla **Jugadores → Editar** se trata como una operación de perfil, con autorización en backend:

| Campo | Super Admin | Club Admin de la comunidad | Player propietario |
|---|---|---|---|
| Nombre | editar | editar | no editar |
| Apodo | editar | editar | editar |
| Teléfono | editar | editar | editar |
| WhatsApp ID | editar | editar | editar |
| Consentimiento WhatsApp | editar | editar | editar |
| Idioma | editar | editar | editar |
| Categorías | administrar | administrar | no editar |
| Club / comunidad | **no mediante este endpoint** | **no** | **no** |
| ELO / ranking | **no** | **no** | **no** |
| Historial oficial | **no** | **no** | **no** |
| Roles / Membership / vinculación User↔Player | **no** | **no** | **no** |

La regla P69 se respeta: un Club Admin que también sea Player puede editar datos personales normales, pero no obtiene por esta vía capacidad para alterar ELO/ranking ni datos deportivos sensibles.

## 3. Corrección técnica aplicada

Se creó `artifacts/api-server/src/routes/playerEdit.ts` y se registra **antes** del PATCH legacy de `players.ts`.

La nueva frontera:

1. exige autenticación y contexto comunitario mediante `requireCommunityAccess`;
2. distingue explícitamente Super Admin, Club Admin y Player propietario;
3. restringe a Club Admin al Player de su comunidad;
4. restringe al Player normal a su propio `playerId`;
5. valida `phone`, `waId`, `wspConsent`, `language` y `categoryIds` con Zod antes de persistir;
6. limita idioma a `es | en | pt`;
7. no acepta `clubId` como operación de edición de perfil;
8. valida categorías contra la comunidad del Player;
9. rechaza payloads sin cambios válidos;
10. conserva ELO, ranking e historial fuera de esta operación.

También se agregó `isClubAdminUser()` a `requireCommunity.ts` sin alterar la definición de Super Admin.

La UI dejó de simular un rol fijo y ahora obtiene `isAdmin` / `isClubAdmin` desde `/api/auth/user` mediante `useGetCurrentAuthUser()`.

## 4. Auditoría de modelo y tabla

El modelo actual `players` contiene:

- `name`
- `nickname`
- `elo`
- `phone`
- `waId`
- `wspConsent`
- `language`
- `clubId`
- `createdAt`

También existen relaciones de categorías mediante `playerCategories` y `clubSportCategories`.

**No existen actualmente en `players` los atributos deportivos aprobados para los perfiles de Pádel/Fútbol/Tenis**, como nivel, mano dominante, lado de pádel, posición/pie de fútbol y preferencias específicas de tenis. Esto es una brecha de modelo/producto que no debe resolverse improvisando columnas durante P0.

La documentación canónica ya define esos perfiles deportivos. Su implementación requiere una decisión técnica posterior y, si corresponde, una migración controlada. **No se hace migración en P0.**

## 5. Deuda encontrada fuera del formulario

Durante la auditoría también queda registrado:

- el PATCH legacy de `players.ts` sigue existiendo detrás de la nueva ruta y debe retirarse/refactorizarse en una limpieza posterior;
- el endpoint DELETE legacy de Player realiza eliminación física, lo que contradice P73 (**Player nunca se elimina físicamente**). Esto debe tratarse en la auditoría de Estado/acciones administrativas, no mezclarse con la corrección del formulario Editar;
- el contrato OpenAPI/generated client todavía describe `PlayerUpdate` únicamente con `name` y `nickname`. La nueva frontera backend valida su contrato localmente para evitar seguir aceptando campos sin validar. La sincronización formal del contrato generado queda pendiente de una tarea de codegen controlada.

## 5.1 Auditoría de Jugadores → Estado / acciones administrativas

La revisión de la implementación actual confirma un problema estructural que debe resolverse antes de considerar cerrado este módulo:

### DELETE físico: 🔴 NO CUMPLE P73

`artifacts/api-server/src/routes/players.ts` mantiene `DELETE /players/:id` y ejecuta directamente `db.delete(playersTable)`. Por lo tanto, hoy existe una vía de eliminación física de Player. fileciteturn125file0L2-L2

La propia tabla `memberships` referencia `playersTable.id` con `onDelete: "cascade"`, por lo que una eliminación física puede arrastrar Membership asociada. Esto es incompatible con P73/P74 y con la regla de preservación de historia. fileciteturn128file0L2-L2

### Estado de Player: 🔴 no existe en el modelo actual

El modelo `players` auditado contiene identidad, contacto, idioma, club, ELO y fecha de creación, pero no contiene un campo de estado del Player. Por separado, `memberships` actualmente solo tiene `id`, `playerId`, `clubId` y `role`; tampoco implementa los estados P52 (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `EXPELLED`). fileciteturn128file0L2-L2

Esto significa que **no es seguro reemplazar ahora DELETE por un supuesto `status` inventado**. La solución correcta requiere cerrar primero el diseño de estado Player/Membership y su persistencia, y luego implementar la transición de forma no destructiva. No se agrega una columna ni se hace migración durante P0.

### UI de Jugadores: 🔴 acción de eliminar actualmente expuesta

`Jugadores.tsx` mantiene botón de papelera para cada Player y llama `useDeletePlayer`; el diálogo confirma literalmente que la eliminación "no se puede deshacer". fileciteturn136file0L2-L2

Por tanto, el problema no es solo backend: la UI presenta una operación que contradice el modelo de negocio. La corrección futura debe retirar la semántica de eliminación y reemplazarla por las acciones de estado autorizadas que se definan.

### Decisión de alcance P0

**No modificar código todavía en esta subfase.** Primero se cierra la especificación de estados, acciones, permisos y relación Player ↔ Membership; después se implementa una única solución coherente. Esto evita reparar campo por campo o inventar una columna que no corresponde al modelo definitivo.

## 5.2 Auditoría de User ↔ Player / Vinculación

La auditoría global confirma otra brecha estructural relevante para Jugadores:

### Vinculación actual: 🔴 no cumple íntegramente P39–P43

`users` mantiene un único `playerId` directo. El endpoint `POST /auth/link-player` valida autenticación y, para usuarios no Super Admin, restringe el Player al `clubId` del usuario; después actualiza directamente `users.playerId`. No existe en este flujo una validación explícita de que el Player ya esté vinculado a otro User, ni una estructura de historial de vínculos. fileciteturn153file0L2-L2

La UI `VincularJugador.tsx` ofrece la acción **"Soy yo"** sobre todos los Players que devuelve la lista y, si el usuario ya tiene `playerId`, solo muestra que está vinculado. No existe flujo de **desvincular/revincular** ni una presentación clara de Players ya vinculados que impida la selección. fileciteturn168file0L2-L2

Además, el mismo endpoint no crea Membership ni permisos administrativos automáticamente, lo cual es compatible con P43, pero el modelo actual tampoco demuestra las garantías completas de P40/P42: máximo un Player por User+Club+Sport y un Player vinculado a un solo User con desvinculación/revinculación controlada.

### Modelo actual

`users.playerId` es una relación directa única a nivel de User. El modelo `memberships` existente está definido por `playerId + clubId + role`, pero no contiene estado de Membership ni un vínculo histórico User↔Player. fileciteturn155file0L2-L9 fileciteturn155file7L99-L106

Esto confirma que **no corresponde resolver el problema con un parche aislado del botón "Soy yo"**. La vinculación debe rediseñarse como una operación de identidad controlada, con reglas de unicidad, ownership, unlink/relink y auditoría, sin tocar ELO ni historia.

### Estado de auditoría

- P39 autorización/preservación: 🟡 parcial.
- P40 unicidad User+Club+Sport: 🔴 no demostrable con modelo actual.
- P41 email como candidato, no identidad automática: 🟡 el flujo actual no implementa esa protección de forma completa.
- P42 un Player → un User + unlink/relink controlado: 🔴 no implementado.
- P43 iniciadores autorizados y no creación automática de Membership/admin: 🟡 parcial.

**Decisión P0:** no modificar todavía la vinculación ni introducir una tabla/constraint inventada. Primero cerrar el diseño técnico User↔Player/Membership y su estrategia de persistencia; luego implementarlo como una operación coherente y auditable fuera de una reparación campo por campo.

## 6. Impacto sobre ELO e historia

No se modificó ninguna regla de ELO.

No se modifica `elo`, `eloHistory`, partidos, ranking ni estadísticas como parte de la edición de perfil.

Los datos deportivos sensibles y las correcciones de hechos oficiales permanecen fuera de esta operación y deben seguir sus flujos autorizados/auditables.

## 7. Verificación

La corrección fue incorporada a la rama P0 y el workflow `P0 typecheck` se disparó sobre el commit `582a306a48b45187330f0715794405dfbdbbb84e`.

Ese run terminó `failure`, pero el fallo ocurrió en **Setup Node.js** de GitHub Actions antes de instalar dependencias o ejecutar TypeScript. Por lo tanto, **no es evidencia de un error de código** ni debe declararse el typecheck como ejecutado correctamente sobre esta corrección hasta obtener una ejecución que llegue al paso `pnpm run typecheck`.

## 8. Próxima verificación funcional

Una vez disponible el runtime de la aplicación, el flujo mínimo de aceptación es:

1. Club Admin en Club 3 → editar Player de Club 3 → cambiar apodo → guardar → comprobar persistencia.
2. Club Admin en Club 3 → intentar editar Player de otro club → debe devolver 404/denegación sin exponer datos.
3. Player normal → intentar editar otro Player → 403.
4. Player normal → editar sus datos personales permitidos → persistencia.
5. Club Admin → categorías válidas de Club 3 → persistencia.
6. Payload con `clubId` → no debe mover al Player de comunidad mediante este endpoint.
7. Confirmar que ELO/historial/ranking no cambian.

## 9. Regla de continuidad

Esta auditoría queda vinculada a la Biblia del proyecto y debe recuperarse antes de continuar con **Jugadores → Estado/acciones administrativas** y **User ↔ Player / vinculación**.
