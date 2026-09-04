# 00 — PADEL TRACKER IA — BIBLIA DEL PROYECTO

- **Estado:** DOCUMENTO CANÓNICO DE CONTINUIDAD
- **Fecha de consolidación:** 2026-09-04
- **Rama de referencia:** `p0/community-isolation`

## 1. Propósito

Este documento es la fuente canónica de continuidad del proyecto. Resume las reglas funcionales y de negocio aprobadas, arquitectura conceptual, permisos, rating, estado de la revisión P0 y reglas que no deben cambiarse sin una nueva decisión explícita.

La carpeta `project/` es la documentación oficial del proyecto. El chat sirve para trabajar; GitHub conserva el estado recuperable.

### Regla operativa obligatoria

**Decisión funcional o de negocio aprobada → documentación en GitHub → implementación → verificación → cierre documentado.**

No se debe considerar cerrada una decisión funcional si no queda registrada en `project/`.

---

## 2. Producto

Padel Tracker IA es una plataforma para organizar comunidades deportivas, comenzando por pádel y diseñada desde el inicio para múltiples deportes.

Principios: simplicidad, justicia deportiva, comunidad antes que tecnología, crecimiento natural y **la IA propone; la persona decide**.

La visión de producto, problema, misión y filosofía se mantiene en `01_PRODUCT_BLUEPRINT.md`.

---

## 3. Modelo conceptual

### User ≠ Player/Deportista

- **User:** identidad/cuenta de acceso.
- **Player/Deportista:** participación deportiva.
- **Membership:** relación del usuario con una comunidad.
- Un User puede existir sin Player.
- Un Player puede existir sin User.
- Un User puede tener Players en distintas comunidades/deportes.
- Una Membership puede existir sin Player.
- Una invitación pendiente no crea artificialmente User ni Membership.

### Comunidades

- La entidad conceptual es Comunidad Deportiva; la interfaz puede usar “Club” cuando corresponda al producto actual.
- Las comunidades son privadas por defecto.
- El aislamiento entre comunidades es obligatorio en backend.
- Un usuario nunca obtiene acceso a otra comunidad por ausencia de datos, fallback o inferencia.

### Super Admin

- Tiene alcance global.
- Puede entrar temporalmente al contexto de una comunidad para administrarla.
- El contexto temporal **no modifica** Membership ni convierte al Super Admin en miembro.
- Al salir vuelve al contexto global.
- No debe existir fallback tipo “si no hay club, usar el primer club de la BD”.

### Club Admin

- Opera únicamente sobre su comunidad autorizada.
- No puede otorgar privilegios de Club Admin.
- El rol pertenece al User/Membership, no al Player.
- Puede haber múltiples Club Admin.
- Si la Membership deja de estar ACTIVE, pierde inmediatamente permisos administrativos; reactivarla no restaura automáticamente el rol.

### Organizador

- Es un rol temporal asociado a un encuentro.
- Cualquier jugador autorizado puede organizar encuentros según las reglas del producto.
- El organizador mantiene la decisión final sobre las propuestas de IA.

---

## 4. Estados y conservación de datos

### Membership

Estados: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `EXPELLED`.

- Salida voluntaria = INACTIVE.
- EXPELLED no se restaura automáticamente.
- La readmisión es explícita, autorizada y auditable.
- La Membership nunca se elimina físicamente.
- INACTIVE/SUSPENDED conserva historia y rating.
- La expulsión implica una nueva trayectoria competitiva al volver: ELO competitivo inicial 1500, conservando la historia anterior.

### Player

- Estados: ACTIVE, INACTIVE, SUSPENDED, ARCHIVED según el módulo.
- Un Player nunca se elimina físicamente.
- Un Player puede existir sin User.
- Vincular/desvincular User no borra historia ni ELO.
- Máximo un Player por combinación User + Comunidad + Deporte.

### Comunidad

Estados: ACTIVE, INACTIVE, SUSPENDED, ARCHIVED.

Solo Super Admin cambia el estado global de una comunidad. Los cambios son no destructivos.

---

## 5. Invitaciones

La invitación es una entidad/flujo distinto de identidad, Membership y Player.

Canales: email, WhatsApp, código o enlace.

Tipos aprobados:
1. Invitación para ingresar a una comunidad.
2. Invitación para vincular un Player existente.

Estados: `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`.

Reglas:
- PENDING no da acceso privado.
- ACCEPTED no es reutilizable.
- REVOKED es inválida.
- EXPIRED debe reemplazarse para continuar.
- Email/teléfono sirve para encontrar candidatos; nunca determina por sí solo identidad ni vinculación automática.

---

## 6. Perfiles deportivos

Existe un perfil deportivo único por deportista, con participación en múltiples deportes. Las características específicas pertenecen al deporte.

### Pádel
- Nivel.
- Mano dominante.
- Preferencia de posición/lado: derecha, revés o ambas.

### Fútbol
- Nivel.
- Posición: arquero, defensa, mediocampo, delantero.
- Pierna/pie dominante.

### Tenis
- Nivel.
- Tipo de juego y preferencias deportivas, según las reglas específicas del deporte.

No agregar atributos deportivos como “aprobados” sin documentar previamente la decisión.

---

## 7. Encuentros

Ciclo de vida aprobado:
`Borrador → Abierto → Completo → En juego → Resultado pendiente → Confirmado → Cerrado`, con `Cancelado` como estado alternativo.

Datos principales: título/nombre, deporte, fecha, hora, lugar, duración, máximo de participantes, organizador, categoría/nivel y descripción cuando corresponda.

Asistencia: confirmado, pendiente, rechazado, lista de espera.

La lista de espera se ordena automáticamente y puede ofrecer el cupo liberado al siguiente participante.

Los partidos/resultados deben permanecer aislados por comunidad.

---

## 8. Partidos, parejas y resultados

- La generación puede ser automática, manual o asistida por IA según el formato.
- En pádel se soportan modalidades como Americana, parejas fijas y generación manual/rotación según la implementación vigente.
- La IA recomienda; el organizador decide.
- Un resultado pendiente **no** afecta ELO, ranking ni estadísticas oficiales.
- Cualquier participante puede registrar un resultado; la confirmación debe cumplir la regla de validación definida para el partido.
- Solo resultados confirmados son hechos deportivos oficiales.
- La edición/corrección de datos oficiales debe ser explícita, autorizada y auditable.

---

## 9. Rating / ELO

No existe un ELO universal.

El Rating Engine debe considerar el contexto deportivo: **Comunidad + Deporte + Modalidad + tipo de competición + tamaño de equipos**, según corresponda.

Principios aprobados:
- Rating es propiedad de la participación deportiva, no de la identidad universal.
- Ranking es independiente por comunidad.
- Ranking es independiente por deporte.
- ELO oficial se actualiza con resultados confirmados al cierre del encuentro según el flujo aprobado.
- ELO inicial V1: **1500**.
- K-factor V1: **32**.
- No cambiar reglas de ELO durante la revisión P0.
- Jugador que vuelve a una comunidad conserva la trayectoria/rating histórico de esa comunidad.
- Cambiar de comunidad no mueve historia ni rating de una comunidad a otra; en la nueva comunidad existe una trayectoria independiente.
- La inactividad o suspensión no produce decay/reset V1.
- Una expulsión y posterior readmisión inicia nueva trayectoria competitiva en 1500, conservando historia anterior.

### Aislamiento histórico

Toda consulta de historial ELO debe estar restringida al contexto comunitario correcto. El Super Admin puede consultar globalmente, pero cuando visualiza la historia de un Player debe mantenerse la pertenencia histórica correcta del Player y de sus partidos.

---

## 10. Auditoría e integridad histórica

- Los hechos oficiales son la fuente de verdad.
- ELO, ranking y estadísticas son derivados/recalculables.
- La historia oficial nunca se elimina físicamente.
- Una corrección genera trazabilidad: original, corregido, actor, fecha y motivo cuando aplique.
- Los eventos de auditoría son inmutables; una corrección agrega un nuevo evento.
- Deben existir eventos auditables para administración sensible, incluyendo `CLUB_ADMIN_GRANTED`, `CLUB_ADMIN_REVOKED` y `CLUB_ADMIN_REPLACED`.
- Acciones administrativas sensibles no pueden ser auto-concedidas por un Club Admin.

---

## 11. Reglas P30–P80 consolidadas

- **P30:** regresar a una comunidad conserva último ELO oficial; sin decay/reset V1.
- **P31:** cambiar de comunidad no mueve historia/ELO; nueva comunidad = nueva trayectoria; volver restaura trayectoria de la comunidad anterior.
- **P32:** User != Player.
- **P33:** Player oficial = Membership ACTIVE + Player ACTIVE; guest es independiente y no entra al ranking oficial.
- **P34:** User puede no tener Membership; invitación pendiente != Membership.
- **P35:** Membership puede existir sin Player.
- **P36:** User puede tener múltiples Players en comunidades/deportes distintos.
- **P37:** Membership puede cubrir múltiples deportes; cada deporte mantiene trayectoria independiente.
- **P38:** Player puede existir sin User; debe pertenecer a una comunidad válida y puede vincularse después sin perder historia/ELO.
- **P39:** vinculación User↔Player es autorizada, sin duplicados, preservando historia/ELO y sin otorgar permisos administrativos.
- **P40:** máximo 1 Player por User+Comunidad+Deporte.
- **P41:** email solo encuentra candidatos; nunca auto-identifica ni auto-vincula.
- **P42:** Player se vincula a un User a la vez; unlink/relink controlado; historia intacta.
- **P43:** vinculación puede iniciarse por User, Club Admin de su comunidad o Super Admin excepcional; nunca crea Membership/admin automáticamente.
- **P44:** invitación puede ser por WhatsApp/email/código/enlace; es distinta de identidad/Membership/Player.
- **P45:** username es complementario; no se asume unicidad global aún.
- **P46:** invitación pendiente no da acceso; aceptación → autenticación → Membership; Player opcional.
- **P47:** ciclo PENDING/ACCEPTED/REVOKED/EXPIRED.
- **P48:** dos tipos: ingreso a comunidad y vinculación de Player existente.
- **P49:** email/teléfono ayuda a identificar candidatos, no reemplaza identidad User.
- **P50:** solo Super Admin otorga/revoca/reemplaza Club Admin.
- **P51:** Membership sin Player permitida.
- **P52:** Membership ACTIVE/INACTIVE/SUSPENDED/EXPELLED.
- **P53:** EXPELLED no auto-restaurado.
- **P54:** readmisión por Super Admin o Club Admin de su comunidad según política; auditable.
- **P55:** readmisión tras expulsión: nuevo ELO competitivo 1500; historia anterior retenida. Inactividad/suspensión conserva ELO.
- **P56:** sanciones pueden ser por deporte o por Membership completa.
- **P57:** sanciones explícitas y auditables.
- **P58:** la comunidad configura retención de INACTIVE; historia no se elimina.
- **P59:** actividad válida = actividad real de comunidad; login/apertura/avatar/nombre/comunicación técnica no cuentan.
- **P60:** `lastCommunityActivityAt` se actualiza por actividad real: partido jugado, asistencia a encuentro, organización de encuentro, confirmación/renovación de Membership o continuación explícita.
- **P61:** eventos de ciclo de vida de Membership son auditables.
- **P65:** eventos de administración auditables.
- **P66:** múltiples Club Admin permitidos.
- **P67:** Membership no ACTIVE elimina permisos administrativos inmediatamente; reactivación no restaura rol automáticamente.
- **P68:** INACTIVE/SUSPENDED deshabilita administración y conserva historia.
- **P69:** Club Admin que también es Player puede editar datos personales normales, pero no usar privilegios administrativos para alterar datos deportivos sensibles que afecten ranking.
- **P70:** Club Admin no puede auto-administrarse acciones sensibles.
- **P71:** una comunidad puede quedar con cero Club Admin; Super Admin recupera la administración; no se autoelige un miembro.
- **P72:** Comunidad ACTIVE/INACTIVE/SUSPENDED/ARCHIVED; no destructiva; cambio global solo Super Admin.
- **P73:** Player nunca se elimina físicamente.
- **P74:** Membership nunca se elimina físicamente; salida voluntaria = INACTIVE.
- **P75:** Club Admin operativo = Comunidad ACTIVE + Membership ACTIVE + rol vigente; Player oficial = Comunidad ACTIVE + Membership ACTIVE + Player ACTIVE.
- **P76:** historia oficial nunca se elimina físicamente; correcciones explícitas/autorizadas/auditables.
- **P77:** datos históricos oficiales no se modifican silenciosamente; conservar original/corregido/actor/fecha/motivo.
- **P78:** auditoría disponible en backend para operaciones relevantes.
- **P79:** eventos de auditoría inmutables; corrección = nuevo evento.
- **P80:** hechos oficiales son source of truth; ELO/ranking/stats son derivados/recalculables.

**P81:** descartado y no debe reabrirse.

---

## 12. Aislamiento P0 — objetivo obligatorio

Un usuario de Comunidad A nunca puede ver, consultar, modificar ni inferir datos privados/deportivos de Comunidad B.

Aplica como mínimo a:
- Players.
- Memberships.
- Encuentros.
- Asistencia/RSVP.
- Partidos.
- Parejas.
- Resultados.
- Historial ELO.
- Ranking.
- Estadísticas.
- Administración.

La autorización debe estar en backend. El frontend no es una barrera de seguridad.

### Regla de contexto

`getCurrentClubId(req)` y `requireCommunityAccess` deben determinar y validar el contexto efectivo. Super Admin puede trabajar con un contexto temporal; usuarios normales no pueden elegir arbitrariamente el club mediante payload.

### Legacy Super Admin

Se mantiene compatibilidad con las representaciones históricas de Super Admin (`isAdmin = 1`, `true` o `"1"`) cuando corresponda. La existencia de `isClubAdmin` no debe degradar un Super Admin.

---

## 13. P0 cerrado hasta esta consolidación

### 🟢 Cerrado/validado

- Aislamiento de listado/administración de comunidades.
- Super Admin global → entrar a comunidad → operar → salir al contexto global.
- Contexto temporal sin mutación de Membership permanente.
- Club Admin restringido a su comunidad.
- Alta de Player sin permitir al Club Admin escoger arbitrariamente otro club.
- Aislamiento básico de Players.
- Aislamiento de Parejas.
- Revisión de aislamiento de estadísticas sin cambio requerido.
- Aislamiento del historial ELO corregido y verificado.
- Encuentros con contexto comunitario y controles de acceso/RSVP.
- Generación de partidos restringida a encuentro + comunidad.
- Build/typecheck del API afectados por los cambios P0 ejecutados satisfactoriamente en las verificaciones registradas.
- Incidente de puerto/502 de Replit cerrado; no reabrir sin evidencia nueva.

### Commits P0 relevantes

- `24ee4ee2...` — permitir autodetección del puerto activo de Replit.
- `1a1b4bdd05e55b2995f3c54d2c518d1b11681498` — contexto de club y RSVP en encuentros.
- `4b7c5dea305346ace66d5e94772461b0069e8aa6` — propagación de credenciales de sesión en API client.
- `a3e9fd850721b63dcedb07ffc9ebc5f7cd686d93` — corrección de tipos en ruta de parejas.
- `6bff72365c726c6ea6895c055ff0a4a480e40999` — aislamiento del historial ELO por comunidad.

---

## 14. Próxima auditoría P0

La siguiente revisión funcional debe ser **Jugadores → Editar**, campo por campo, con dos perspectivas: Super Admin y Club Admin.

Contrato de auditoría obligatorio:

**Campo → quién puede verlo → quién puede editarlo → qué puede modificar → validación backend → impacto histórico/ELO → resultado P0.**

Orden posterior:
1. Jugadores → Editar.
2. Jugadores → Estado/acciones administrativas.
3. User ↔ Player/linking.
4. Club → Edit config.
5. Club Admin → administración de usuarios.
6. Encuentro → Edit.
7. Attendance/RSVP.
8. Match → Edit result (**CRÍTICO**).
9. Parejas.
10. Ranking/stats.
11. Membership/states.
12. Invitations.

No hacer cambios de código hasta identificar el gap concreto, documentar la regla si es nueva y definir la corrección definitiva.

---

## 15. Reglas que NO deben cambiar durante P0

- No migrar base de datos como solución P0.
- No modificar ni borrar datos reales.
- No cambiar reglas ELO/ranking.
- No tocar ramas/V1 fuera de `p0/community-isolation`.
- No crear parches específicos cuando exista una solución general de autorización/contexto.
- No solucionar seguridad únicamente en frontend.
- No reabrir incidentes ya cerrados sin evidencia nueva.
- No marcar un punto como cerrado sin verificación concreta.

---

## 16. Documentos relacionados

- `01_PRODUCT_BLUEPRINT.md` — visión y producto.
- `03_SPRINTS.md` — planificación/estado operativo.
- `04_BACKLOG.md` — trabajo pendiente.
- `05_DECISIONS.md` — registro histórico de decisiones/ADR.
- `06_PLAN_DE_IMPLEMENTACION_V1.md` — plan V1.
- `07_CHANGELOG.md` — cambios importantes.
- `08_TECHNICAL_BACKLOG.md` — deuda técnica.
- `09_ARCHITECTURE_DECISION_RECORDS.md` — ADR técnicos específicos.
- `10_COMPANY_BIBLE.md` — compañía.
- `11_BRAND_GUIDE.md` — marca.

### Regla de mantenimiento

`00_PADEL_TRACKER_IA_BIBLIA.md` contiene el estado consolidado y recuperable. `05_DECISIONS.md` conserva el historial de decisiones; `07_CHANGELOG.md` registra cambios; `03_SPRINTS.md` registra avance operativo. No duplicar innecesariamente: cada documento debe mantener su función.
