# P0 — Decisión de producto: Editor de Perfil y Categorías

Fecha: 2026-09-08
Estado: IMPLEMENTACIÓN EN CURSO

## 1. Decisión funcional

La experiencia de edición será una sola pantalla **Editar perfil**. El usuario no debe tener que entender la separación interna entre `User` y `Player`.

La pantalla se organiza en:

1. **Datos personales**
   - Nombre completo
   - Apodo

2. **Datos de cuenta**
   - Email de la cuenta User
   - No se agrega `email` al Player.
   - El cambio real de email deberá operar sobre User cuando el flujo de cuenta esté habilitado.

3. **Datos deportivos**
   - Pádel: nivel, mano dominante y lado preferido.
   - Fútbol: nivel, posición y pierna dominante.
   - Tenis: preferencias deportivas aprobadas.
   - En P0 se muestra la sección, pero no se inventan campos ni se realiza migración para datos que aún no existen en el modelo.

4. **Categorías**
   - Las categorías pertenecen a la configuración del club y del deporte.
   - Son seleccionables desde el perfil cuando existen.

5. **Contacto y notificaciones**
   - Idioma
   - Teléfono
   - WhatsApp ID/usuario
   - Consentimiento WhatsApp

## 2. Corrección crítica de categorías

Se comprobó que la pantalla de Administración mostraba categorías locales/hardcodeadas en `CategoriesManager`, por lo que esas categorías no representaban necesariamente la configuración persistida del club.

Esto explicaba el caso Club 3: Administración mostraba categorías, mientras Editar Jugador consultaba la configuración real y mostraba "Sin categorías definidas por el club".

### Solución P0

- `CategoriesManager` ahora carga las categorías desde `/api/club/categories`.
- Crear categoría persiste mediante `POST /api/club/categories`.
- El backend resuelve el `clubSportId` a partir del `sportId` y de la comunidad activa; el cliente no puede elegir arbitrariamente otro club.
- La respuesta de categorías incluye `sportId` para que Editar Perfil pueda asociarlas al deporte correcto.
- No se agregan columnas ni migraciones.
- No se modifican ELO, estadísticas ni historial.

## 3. Aislamiento

Las rutas P0 de categorías usan `requireCommunityAccess` y `getCurrentClubId(req)`. La categoría se crea únicamente para el `clubSports` correspondiente a la comunidad activa.

## 4. Alcance pendiente

- Edición real del email de User: pendiente de flujo de cuenta/seguridad.
- Persistencia de atributos deportivos específicos: pendiente de modelo y migración futura.
- Estados de Player/Membership: pendiente de arquitectura P0/P1 según el modelo de Membership.
- Activar/desactivar/eliminar categorías: no se implementa en esta etapa porque el modelo actual no contiene esos estados; no se simulan con estado local.

## 5. Archivos implementados

- `artifacts/api-server/src/routes/clubCategoriesP0.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/padel-tracker/src/components/CategoriesManager.tsx`
- `artifacts/padel-tracker/src/pages/EditarJugadorV2.tsx`
- `artifacts/padel-tracker/src/App.tsx`

## 6. Regla de continuidad

La implementación debe verificarse en Replit después de actualizar la rama y recompilar. Si una prueba falla, se corrige la causa concreta; no se vuelve a iniciar un diagnóstico general.
