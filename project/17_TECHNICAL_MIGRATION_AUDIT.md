# Auditoría técnica de migración

**Fecha:** 13 de agosto de 2026  
**Alcance:** inspección segura del repositorio, schema Drizzle, base PostgreSQL de desarrollo, autenticación, roles, migraciones y compilación.  
**Restricción aplicada:** no se ejecutaron `INSERT`, `UPDATE`, `DELETE`, DDL ni cambios de autenticación durante esta auditoría. No se modificaron datos de usuarios.

## A. Estado actual

Padel Tracker es un monolito modular con:

- Backend Node.js + TypeScript + Express.
- PostgreSQL y Drizzle ORM.
- Frontend React + Vite + TypeScript.
- Sesiones propias y `authMiddleware`.
- Routers separados para auth, players, matches, ranking, parejas, encuentros, club, admin, cobros, sports y categorías.

La base de datos de desarrollo responde correctamente. El código y la base contienen ya parte de la arquitectura nueva de modalidades y ratings por deporte, pero el repositorio tiene cambios locales no comprometidos y no debe considerarse una línea base estable todavía.

Conteos observados en la base:

| Tabla | Filas |
|---|---:|
| clubs | 1 |
| players | 8 |
| sports | 3 |
| encuentros | 3 |
| asistencia | 24 |
| matches | 0 |
| match_players | 0 |
| elo_history | 0 |

Los partidos y su historial están vacíos. Esto coincide con la migración encontrada, pero debe tratarse como una decisión de datos ya ejecutada, no repetirse automáticamente.

## B. DB real vs Drizzle

### B.1 Tablas observadas en PostgreSQL

La base contiene actualmente:

`asistencia`, `club_sport_categories`, `club_sports`, `clubs`, `cobros`, `elo_history`, `encuentros`, `gasto_participantes`, `gastos`, `match_players`, `matches`, `memberships`, `notification_subscriptions`, `player_categories`, `player_sport_ratings`, `players`, `sessions`, `sport_modalities`, `sports` y `users`.

Las tablas nuevas `sport_modalities` y `player_sport_ratings` existen realmente, al igual que `matches.modality_id`, que es `NOT NULL`.

### B.2 Diferencias o riesgos detectados

1. `users` **no tiene columna `role`**. El schema real contiene `is_admin` e `is_club_admin` como enteros. Cualquier lectura de `user.role` es una compatibilidad opcional en código, no una columna persistida.
2. `users.id` es `varchar`; el usuario solicitado `60741545` existe como texto, no como entero.
3. `players.club_id`, `matches.club_id` y `encuentros.club_id` son anulables. El aislamiento por comunidad no está garantizado por el modelo de datos solamente.
4. `encuentros` tiene `club_id`, pero la columna es anulable y debe verificarse en cada flujo de lectura/escritura.
5. `matches.modality_id` es obligatorio en la base, mientras que existen módulos legacy que todavía construyen partidos sin modalidad. Esto es un riesgo de compatibilidad que debe resolverse en una tarea separada, no automáticamente durante esta auditoría.
6. No se encontró una tabla de migraciones visible en `public` durante la consulta de `information_schema`. La migración local `lib/db/migrations/0001_sport_modalities.sql` no tiene una tabla de tracking equivalente en la base inspeccionada.
7. La migración local contiene:

```sql
DELETE FROM elo_history;
DELETE FROM match_players;
DELETE FROM matches;
```

Además, vuelve `matches.modality_id` obligatorio. Por tanto, no es una migración segura para reejecución general ni debe agregarse a un arranque automático.

### B.3 Backup

Existe `backup_before_migration_2026-08-11.sql` de aproximadamente 122 KB. Su existencia queda registrada, pero no se ejecutó una restauración de prueba. Antes de cualquier modificación futura debe comprobarse que el backup cubre las tablas y datos necesarios y realizarse una restauración en una base aislada.

## C. Autenticación actual

La autenticación actual usa:

- sesiones propias;
- `authMiddleware`;
- `/api/auth/user`;
- `usersTable`;
- `@workspace/replit-auth-web` en frontend.

`authMiddleware` carga `req.user` cuando hay una sesión válida, pero si no existe sesión llama `next()` igualmente. Por tanto, no es un guard global obligatorio. Cada router debe proteger explícitamente sus endpoints.

No se realizó migración a Clerk. Aunque `@clerk/clerk-react` aparece instalado en frontend, la autenticación efectiva inspeccionada sigue siendo la de sesiones propias. No se modificó esta situación.

## D. Roles y permisos

### D.1 Interpretación de roles

`admin.ts` reconoce `isAdmin === 1` como `SUPER_ADMIN`. También admite valores textuales legacy (`admin`, `superadmin`) y `isClubAdmin === 1` como `CLUB_ADMIN`.

Las rutas administrativas principales sí usan `requireSuperAdmin` o `requireClubAdmin`, por ejemplo:

- `/admin/clubs`
- `/admin/users`
- `/admin/sports`
- `/admin/gastos`
- `/admin/clubs/:id`
- `/admin/clubs/:id/sports`
- `/admin/clubs/:id/users`

El control de club para `CLUB_ADMIN` compara el `clubId` de sesión con el parámetro de ruta.

### D.2 Hallazgo crítico

Existe `GET /admin/hacer-admin` sin `requireSuperAdmin` ni `requireClubAdmin`. Si hay una sesión válida, actualiza `isAdmin = 1` para el usuario de la sesión.

Esto constituye un endpoint de escalamiento de privilegios y debe eliminarse o protegerse antes de producción. No se corrigió automáticamente porque el documento de auditoría ordena documentar primero los problemas.

### D.3 Otros riesgos de autorización

- `/clubs/current` puede responder el primer club cuando el usuario no tiene `clubId`; debe revisarse si ese fallback es aceptable.
- La protección no está centralizada: `authMiddleware` es permisivo y los routers tienen reglas distintas.
- El conteo automatizado de rutas del dominio inspeccionado encontró 38 declaraciones HTTP frente a 19 apariciones de middleware de autenticación/rol. Este conteo es una señal de riesgo, no una certificación endpoint por endpoint.
- Los datos financieros requieren revisión separada de aislamiento y autorización.

## E. Usuario Super Admin

Se verificó con una consulta parametrizada sobre la base de desarrollo:

| id | email | is_admin | is_club_admin | club_id | player_id |
|---|---|---:|---:|---|---|
| `60741545` | `mbau73@hotmail.com` | 1 | 1 | `NULL` | `NULL` |
| `155a74f6-0ed2-4ab9-8e44-0b253d203494` | `JP@JP.CL` | 0 | 1 | 1 | `NULL` |

Conclusiones:

1. `60741545` existe.
2. `mbau73@hotmail.com` tiene `is_admin = 1`.
3. `club_id` y `player_id` del usuario real permanecen `NULL`.
4. `JP@JP.CL` no es Super Admin: tiene `is_admin = 0`.
5. El código reconoce `isAdmin = 1` como Super Admin.
6. No se ejecutó ninguna actualización sobre estos usuarios.

## F. Migraciones pendientes

No debe ejecutarse una migración general en este punto.

Antes de cualquier migración futura se requiere:

1. Registrar formalmente qué migraciones ya se aplicaron.
2. Comparar schema Drizzle contra `information_schema` y constraints reales.
3. Revisar la migración `0001_sport_modalities.sql` por su limpieza destructiva de partidos.
4. Validar backup y restauración en una base aislada.
5. Resolver los escritores legacy que no envían `modality_id`.
6. Definir una política de migración idempotente y con revisión explícita.

## G. Riesgos

### Prioridad crítica

- Endpoint `/admin/hacer-admin` permite escalamiento de privilegios.
- `authMiddleware` no obliga autenticación global.
- Aislamiento multi-comunidad no está centralizado ni garantizado por todas las entidades.
- La migración existente contiene `DELETE` sobre datos deportivos.

### Prioridad alta

- Columnas de comunidad anulables en entidades relevantes.
- `matches.modality_id` obligatorio en DB pero no integrado uniformemente en todos los módulos.
- Ausencia visible de tracking de migraciones.
- Cambios locales no comprometidos en numerosos archivos.
- Falta de pruebas automatizadas suficientes para RBAC, aislamiento y Elo.

### Prioridad media

- Build del frontend depende de `PORT` y `BASE_PATH`.
- El bundle frontend supera 500 KB en un chunk principal.
- La lógica de negocio Elo y generación de partidos está acoplada a routers.
- El fallback de `/clubs/current` puede exponer el primer club.

## H. Errores encontrados y validaciones

### Correcto

- `pnpm typecheck` del API: **correcto**.
- `pnpm build` del API: **correcto**.
- `pnpm typecheck` del frontend: **correcto**.
- `pnpm exec tsc -p tsconfig.json --noEmit` de DB: **correcto**.
- Build frontend con `PORT=5173 BASE_PATH=/`: **correcto**, con warnings de sourcemap y tamaño de chunk.
- `git diff --check`: **correcto**.
- Conectividad de PostgreSQL: **correcta**.

### Error operativo documentado

El build frontend sin variables falla con:

```text
PORT environment variable is required
BASE_PATH environment variable is required
```

Con las variables requeridas, el build termina correctamente. Esto debe documentarse en la guía de ejecución local/CI.

### Tests

No se encontró una suite de tests automatizados clara para este dominio durante la inspección superficial. No se considera suficiente la compilación para certificar seguridad, aislamiento o consistencia Elo.

## I. Cambios realizados durante esta auditoría

- Se leyó el archivo de instrucciones adjunto desde `attached_assets`.
- Se realizaron consultas exclusivamente de lectura a la base de desarrollo.
- Se ejecutaron typechecks, builds y validaciones seguras.
- Se actualizó únicamente este informe técnico.
- No se ejecutaron cambios SQL.
- No se modificó la autenticación.
- No se modificaron usuarios, clubes, jugadores ni partidos.
- No se eliminó ninguna tabla ni columna.
- No se ejecutó una migración.

El repositorio ya contenía cambios locales no comprometidos y una migración de modalidades/rating creada antes de esta auditoría. Esos cambios se registran como estado/riesgo; no se consideran validados para producción.

## J. Cambios que NO deben hacerse todavía

- No migrar a Clerk.
- No cambiar el proveedor de autenticación.
- No ejecutar otra vez `0001_sport_modalities.sql`.
- No hacer una migración general de schema.
- No eliminar tablas o columnas legacy.
- No borrar partidos, Elo, usuarios o datos reales.
- No modificar `60741545` salvo una necesidad explícita y una operación segura limitada al mismo `id` y email.
- No convertir automáticamente usuarios de prueba en Super Admin.
- No continuar agregando funcionalidades deportivas hasta cerrar la auditoría de autorización, datos y migraciones.
- No decidir todavía una reconstrucción completa de frontend, mobile, ORM u hosting.

## K. Recomendación de próximos pasos

1. **P0 — Seguridad:** eliminar o proteger `/admin/hacer-admin`; inventariar y proteger todos los endpoints sin autenticación obligatoria.
2. **P0 — Aislamiento:** definir una única política de comunidad y probarla con usuarios de dos clubes, incluyendo partidos, encuentros, jugadores, cobros y administración.
3. **P0 — Datos:** crear un inventario reproducible schema Drizzle vs DB real y añadir tracking de migraciones sin modificar datos.
4. **P1 — Backup:** validar restauración del backup en una base aislada.
5. **P1 — Compatibilidad:** decidir cómo integrar `modality_id` en los módulos legacy antes de aceptar nuevos partidos.
6. **P1 — Roles:** agregar pruebas de regresión para `isAdmin = 1`, `isAdmin = 0`, `isClubAdmin = 1`, usuario sin sesión y acceso cross-community.
7. **P2 — Dominio:** aislar y testear Elo, generación de partidos y ranking después de estabilizar seguridad y datos.
8. **P2 — Portabilidad:** documentar variables obligatorias (`PORT`, `BASE_PATH`, DB y sesiones), build, arranque y restauración fuera de Replit.

## Conclusión

El proyecto es un prototipo funcional aprovechable, pero no una base de producción certificada. El usuario real solicitado quedó identificado como Super Admin sin alterar `clubId` ni `playerId`; el usuario de prueba `JP@JP.CL` no fue convertido en Super Admin. Backend y frontend compilan cuando se ejecutan con su configuración requerida, pero los riesgos críticos de privilegios, aislamiento y migraciones deben resolverse antes de continuar desarrollo.