# 18 — P0 AUDITORÍA JUGADORES → EDITAR

- **Fecha:** 2026-09-07
- **Rama:** `p0/community-isolation`
- **Estado:** CORRECCIÓN ESTRUCTURAL APLICADA / CONTRATO ALINEADO / DELETE DESTRUCTIVO BLOQUEADO / UI SIN ELIMINACIÓN / VINCULACIÓN DUPLICADA BLOQUEADA
- **Alcance:** Editar Player completo y auditoría transversal de identidad/estado

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

El modelo actual `players` contiene identidad, contacto, idioma, club, ELO y fecha de creación, además de relaciones de categorías.

**No existen actualmente en `players` los atributos deportivos aprobados para los perfiles de Pádel/Fútbol/Tenis**, como nivel, mano dominante, lado de pádel, posición/pie de fútbol y preferencias específicas de tenis. Esto es una brecha de modelo/producto que no debe resolverse improvisando columnas durante P0.

La documentación canónica ya define esos perfiles. Su implementación requiere una decisión técnica posterior y, si corresponde, una migración controlada. **No se hace migración en P0.**

## 5. Deuda encontrada fuera del formulario

Durante la auditoría global también queda registrado:

- el PATCH legacy de `players.ts` sigue existiendo detrás de la nueva ruta y debe retirarse/refactorizarse en una limpieza posterior;
- el endpoint DELETE legacy de Player realizaba eliminación física, lo que contradice P73 (**Player nunca se elimina físicamente**);
- para evitar que esa deuda pueda destruir datos durante P0, `playerEdit.ts` registra primero un `DELETE /players/:id` que devuelve `410 Gone` y no toca la base de datos. El legacy permanece en código, pero queda protegido por la frontera nueva mientras se diseña el reemplazo por estados;
- la UI `Jugadores.tsx` ya no expone el botón de papelera ni ejecuta `useDeletePlayer`, eliminando la semántica destructiva de la interfaz;
- el contrato OpenAPI/generated client inicialmente describía `PlayerUpdate` únicamente con `name` y `nickname`, mientras la frontera real ya validaba además teléfono, WhatsApp, consentimiento, idioma y categorías.

### 5.0 Alineación del contrato de edición

Se alinearon los tipos generados usados por el frontend/API client con la frontera `playerEdit`:

- `lib/api-zod/src/generated/types/playerUpdate.ts`
- `lib/api-zod/src/generated/types/player.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`

`Player` ahora expone los datos que realmente devuelve el endpoint (`phone`, `waId`, `wspConsent`, `language`, `clubId`, `categories`) y `PlayerUpdate` expone los campos aceptados por la operación de edición.

**Importante:** estos archivos son artefactos generados. La fuente canónica OpenAPI todavía requiere una sincronización formal posterior mediante el proceso de codegen del proyecto. No se cambia el esquema de base de datos para resolver esta deuda de contrato.

## 5.1 Auditoría de Jugadores → Estado / acciones administrativas

### DELETE físico: 🟡 BLOQUEADO EN LA FRONTERA P0 / modelo pendiente

El código legacy de `players.ts` mantiene `DELETE /players/:id` con eliminación física, pero la nueva frontera `playerEdit.ts`, registrada antes, intercepta esa operación y devuelve `410 Gone` sin ejecutar `db.delete(playersTable)`. Así, durante P0 ya no existe una vía funcional de eliminación física a través de ese endpoint.

La tabla `memberships` referencia `playersTable.id` con `onDelete: "cascade"`, por lo que una eliminación física podría arrastrar Membership asociada. Esto es incompatible con P73/P74 y con la preservación de historia.

### Estado de Player: 🔴 no existe en el modelo actual

El modelo `players` no contiene un campo de estado del Player. Por separado, `memberships` actualmente solo tiene `id`, `playerId`, `clubId` y `role`; tampoco implementa los estados P52 (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `EXPELLED`).

Esto significa que **no es seguro reemplazar ahora DELETE por un supuesto `status` inventado**. La solución correcta requiere cerrar primero el diseño de estado Player/Membership y su persistencia, y luego implementar la transición de forma no destructiva. No se agrega una columna ni se hace migración durante P0.

### UI de Jugadores: 🟢 acción destructiva retirada

`Jugadores.tsx` ya no expone el botón de papelera, no importa `useDeletePlayer` y no ejecuta ninguna mutación DELETE. La lista conserva las acciones válidas de WhatsApp, edición y navegación al perfil.

Esto deja la UI coherente con P73: mientras no exista el flujo formal de estados, no se ofrece al usuario una acción que sugiera eliminación física. El backend mantiene además el guard `410 Gone` como segunda barrera.

### Decisión de alcance P0

No se debe reparar campo por campo. La solución de Estado/acciones debe diseñarse conjuntamente con Player ↔ Membership, permisos y auditoría. No se inventa una columna ni una migración durante esta fase.

## 5.2 Auditoría de User ↔ Player / Vinculación

La auditoría global confirma otra brecha estructural relevante para Jugadores:

### Vinculación actual: 🟡 parcialmente reforzada / diseño estructural pendiente

`users` mantiene un único `playerId` directo. El endpoint `POST /auth/link-player` valida autenticación y, para usuarios no Super Admin, restringe el Player al `clubId` del usuario; después actualiza directamente `users.playerId`.

Se agregó una protección inmediata: si el Player ya está vinculado a cualquier User, el endpoint responde `409` y no reemplaza silenciosamente el vínculo existente. Esto refuerza la regla P42 de que un Player no debe estar vinculado simultáneamente a dos Users.

La protección no pretende resolver todavía toda la arquitectura P36/P40/P42/P43: el modelo actual sigue soportando un único `users.playerId`, no una estructura de vínculos por User+Club+Sport, y no existe historial de unlink/relink.

La UI `VincularJugador.tsx` continúa ofreciendo **"Soy yo"** como acción de vinculación y no existe flujo de **desvincular/revincular**. No se parchea aisladamente porque requiere el diseño completo de identidad, membership, ownership y auditoría.

### Decisión P0

La regla inmediata queda reforzada contra duplicidad de vínculo sin inventar una arquitectura nueva. La solución completa de User ↔ Player queda como trabajo posterior que deberá incorporar reglas de unicidad, unlink/relink y auditoría, preservando ELO e historia.

## 6. Impacto sobre ELO e historia

No se modificó ninguna regla de ELO.

No se modifica `elo`, `eloHistory`, partidos, ranking ni estadísticas como parte de la edición de perfil o del guard de vinculación.

Los datos deportivos sensibles y las correcciones de hechos oficiales permanecen fuera de esta operación y deben seguir sus flujos autorizados/auditables.

## 7. Commits de esta etapa

- `cfd42aeedab4ac68aca3e90edf7765fb8e8c0b61` — `fix: align generated player update contract with edit route`
- `a2c5df0b252441efe00256fe292b326aabb8e568` — `fix: align generated player schema with edit response`
- `4663da1f10863bfac322f7f3b2cd445e7f5c0d9e` — `fix: align generated Player contract with edit API`
- `ab9ec0b31ff3db8eeee85fff0f3237be558d6fa3` — `fix: block destructive player deletion at community boundary`
- `293ca9ab9c10009f72a16c974587157e1a62bad6` — `fix: remove destructive player delete action from UI`
- `1a761424f59fd05807da5f71fc2f131ffd1f0303` — `fix: prevent duplicate User to Player linking`

## 8. Verificación

La verificación funcional pendiente debe ejecutarse sobre el runtime de la aplicación. El último workflow P0 typecheck conocido terminó en `Setup Node.js` antes de instalar dependencias, por lo que no debe considerarse evidencia de fallo de TypeScript.

La aceptación funcional mínima continúa siendo:

1. Club Admin en Club 3 → editar Player de Club 3 → cambiar apodo → guardar → comprobar persistencia.
2. Club Admin en Club 3 → intentar editar Player de otro club → debe devolver 404/denegación sin exponer datos.
3. Player normal → intentar editar otro Player → 403.
4. Player normal → editar sus datos personales permitidos → persistencia.
5. Club Admin → categorías válidas de Club 3 → persistencia.
6. Payload con `clubId` → no debe mover al Player de comunidad mediante este endpoint.
7. DELETE Player → debe responder 410 y no eliminar el registro.
8. Intentar vincular un Player ya vinculado → debe responder 409 y conservar el vínculo original.
9. Confirmar que ELO/historial/ranking no cambian.
10. Jugadores → comprobar que ya no existe acción de eliminación física en la UI.

## 9. Regla de continuidad

Esta auditoría queda vinculada a la Biblia del proyecto y debe recuperarse antes de continuar con **Jugadores → Estado/acciones administrativas** y **User ↔ Player / vinculación**.
