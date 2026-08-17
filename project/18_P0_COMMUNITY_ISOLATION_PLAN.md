# P0 — Community Isolation & Player Assignment

## Objective
Cerrar el núcleo multi-club antes de seguir agregando funcionalidades: contexto de club, seguridad, asignación de jugadores e invitaciones.

## Scope
1. Super Admin: acceso global sin `clubId` permanente.
2. Club Admin: acceso exclusivamente a su club.
3. Player: acceso exclusivamente a su club.
4. Player records: evitar jugadores fuera de club salvo flujo explícito de pre-registro.
5. Player assignment: Super Admin debe poder asignar/cambiar club de un jugador.
6. Invite code: código de club debe resolver a un club y crear/actualizar membership correctamente.
7. Security: no debe existir endpoint que permita auto-promoción a admin.

## Acceptance criteria
- [ ] Super Admin puede ver clubes y seleccionar el club activo sin mutar su pertenencia global.
- [ ] Club Admin no puede consultar ni modificar jugadores de otro club cambiando IDs en la URL.
- [ ] Player no puede consultar ni modificar recursos de otro club.
- [ ] Editar Jugador muestra el club actual y, para Super Admin, permite asignar/cambiar club.
- [ ] Un jugador sin club queda visible para Super Admin como "Sin club" y puede ser asignado.
- [ ] La asignación de club valida que el club exista.
- [ ] El cambio de club no elimina categorías/historial de forma accidental.
- [ ] El flujo de invitación por código termina en una membership válida.
- [ ] `GET /admin/hacer-admin` está eliminado o protegido para Super Admin.
- [ ] Se agregan pruebas mínimas para aislamiento y asignación.

## Current known findings
- `players.club_id` puede ser NULL.
- `requireCommunityAccess` permite Super Admin sin club y limita al resto por `clubId`.
- `GET /players` devuelve todos los jugadores cuando el usuario es Super Admin; esto es correcto para administración global, pero la UI debe distinguir "Sin club".
- `POST /players` ya acepta `clubId`/`clubCode` para Super Admin.
- `PATCH /players/:id` todavía no implementa asignación/cambio de `clubId`.
- `EditarJugador.tsx` tampoco ofrece selector de club.

## Parallel work allowed
A second agent (Copilot/Parry) may audit the code, but must NOT modify the same files while this P0 branch is active. It should return findings only, especially around auth/RBAC, club context and invite-code flow.

## Do not do yet
- No destructive DB migration.
- No rewrite of authentication.
- No Dashboard redesign.
- No Elo redesign until club isolation is stable.
