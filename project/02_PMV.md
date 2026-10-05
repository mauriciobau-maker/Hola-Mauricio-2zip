# 02 — PMV (Producto Mínimo Viable)

- **Creado:** 2026-08-03
- **Última actualización:** 2026-08-03

## Propósito

Contiene únicamente las funcionalidades necesarias para lanzar la primera versión comercial del producto. Define el alcance mínimo que entrega valor real a los usuarios y permite validar el modelo de negocio, sin sobrecarga de features.
# Padel Tracker IA
# PMV 1.0 — Producto Mínimo Vendible

Versión: 1.0

Estado: En definición

---

# Objetivo del PMV

Crear una primera versión comercial funcional que permita a una comunidad deportiva organizar sus encuentros, administrar jugadores, registrar resultados y mantener un historial deportivo.

El objetivo del PMV no es tener todas las funcionalidades futuras.

El objetivo es entregar suficiente valor para que una comunidad pueda usar la plataforma y estar dispuesta a pagar por ella.

---

# Usuario objetivo inicial

El usuario principal no es el jugador individual.

El usuario principal es:

## La comunidad deportiva organizada.

Ejemplos:

- Grupo de pádel.
- Grupo de tenis.
- Grupo de fútbol.
- Grupo de otros deportes.

Especialmente comunidades que actualmente dependen de:

- WhatsApp.
- Excel.
- Organización manual.

---

# Modelo inicial del producto

Padel Tracker IA será una plataforma multideporte.

El primer deporte será pádel.

La arquitectura permitirá incorporar otros deportes posteriormente.

Modelo:

Super Administrador

↓

Comunidades

↓

Administrador de Comunidad

↓

Usuarios

↓

Deportistas

↓

Encuentros

↓

Partidos

↓

Resultados

↓

Ranking

↓

Estadísticas

---

# Objetivo comercial del PMV

Conseguir las primeras comunidades activas y validar:

- Que la aplicación ahorra tiempo al organizador.
- Que los jugadores la utilizan regularmente.
- Que las comunidades están dispuestas a pagar.
- Qué funcionalidades generan mayor valor.


# Funcionalidades incluidas PMV 1.0

El PMV debe permitir que una comunidad deportiva pueda operar completamente desde la plataforma.

Las funcionalidades prioritarias son:

---

# 1. Gestión de Comunidades

## Super Administrador

Debe poder:

- Crear comunidades.
- Editar comunidades.
- Activar o desactivar comunidades.
- Definir deportes disponibles.
- Configurar plan contratado.
- Gestionar administradores.
- Acceder a soporte y control general.

---

## Administrador de Comunidad

Debe poder:

- Configurar información de la comunidad.
- Administrar jugadores.
- Gestionar invitaciones.
- Crear y administrar encuentros.
- Revisar estadísticas.
- Gestionar configuraciones permitidas por su plan.

En el PMV existirá un administrador principal por comunidad.

---

# 2. Gestión de Usuarios y Deportistas

El sistema debe diferenciar:

## Usuario

Persona con acceso a la aplicación.

## Deportista

Persona que participa en actividades deportivas dentro de una comunidad.

Un usuario puede pertenecer a múltiples comunidades.

Un usuario no debe volver a registrarse al ingresar a una nueva comunidad.

---

# 3. Invitaciones y acceso a comunidades

La comunidad será privada por defecto.

El ingreso será mediante:

- Código de invitación.
- Enlace compartido.
- WhatsApp.
- Email.

El flujo esperado:

Administrador crea comunidad.

↓

Sistema genera invitación.

↓

Jugador acepta.

↓

Sistema crea o vincula su perfil deportivo.

---

# 4. Encuentros deportivos

Debe permitir:

Crear encuentro.

Datos principales:

- Nombre.
- Fecha.
- Hora.
- Ubicación.
- Deporte.
- Cantidad máxima de participantes.
- Notas.
- Jugadores invitados.

Estados:

- Borrador.
- Abierto.
- Completo.
- En juego.
- Resultado pendiente.
- Confirmado.
- Cerrado.
- Cancelado.

---

# 5. Confirmación de asistencia

Los jugadores podrán indicar:

- Confirmo.
- No puedo.
- Pendiente.

Debe existir:

- Control de cupos.
- Lista de espera.
- Aviso automático cuando aparece un cupo disponible.

---

# 6. Generación de partidos

El sistema debe ayudar al organizador a crear partidos.

Debe permitir:

- Generación automática.
- Edición manual.
- Selección de formato.

Ejemplos:

- Parejas fijas.
- Formatos rotativos.
- Americana.

La IA puede recomendar, pero el organizador decide.

---

# 7. Registro de resultados

Debe permitir:

- Registrar marcador.
- Confirmación del rival.
- Validación antes de actualizar estadísticas.

Un partido confirmado genera:

- Actualización de ranking.
- Actualización de historial.
- Actualización de estadísticas.


# Funcionalidades fuera del PMV 1.0

Estas funcionalidades forman parte de la visión futura del producto, pero no son necesarias para lanzar la primera versión comercial.

Podrán incorporarse posteriormente según validación de usuarios y necesidades del negocio.

---

# 1. Marketplace deportivo

NO incluido en PMV.

Ejemplos futuros:

- Buscar jugadores externos.
- Buscar rivales.
- Buscar canchas.
- Ofertas deportivas.
- Servicios asociados.

---

# 2. Pagos integrados

NO incluido inicialmente.

La plataforma podrá registrar información económica básica si es necesario, pero no procesará pagos online en la primera versión.

Futuro:

- Suscripciones automáticas.
- Pagos de membresías.
- Reservas de canchas.
- Cobros integrados.

---

# 3. IA avanzada

La IA básica sí forma parte del producto.

Pero quedan fuera del PMV:

- Predicción avanzada de resultados.
- Entrenador personal IA.
- Análisis de videos.
- Reconocimiento automático de jugadas.
- Recomendaciones deportivas avanzadas.

---

# 4. Red social deportiva

NO incluido.

Futuro:

- Feed deportivo.
- Publicaciones.
- Comentarios.
- Seguidores.
- Comunidad pública.

---

# 5. Aplicaciones móviles nativas

NO prioridad inicial.

La primera versión debe funcionar correctamente como aplicación web responsive.

Futuro:

- Aplicación Android.
- Aplicación iOS.
- Notificaciones push nativas.

---

# 6. Integraciones avanzadas

NO incluidas inicialmente.

Futuro:

- APIs externas.
- Relojes deportivos.
- Wearables.
- Sistemas de clubes.
- Plataformas deportivas.

---

# 7. Sistema avanzado de scouting

NO incluido.

Futuro:

- Perfil deportivo profesional.
- Historial completo entre comunidades.
- Comparación avanzada de jugadores.

---

# 8. Automatización comercial

NO incluida inicialmente.

Futuro:

- Registro automático de clientes.
- Facturación.
- CRM.
- Marketing automatizado.

---

# Principio general

Toda funcionalidad futura debe demostrar primero que:

1. Aumenta el valor para el usuario.
2. Mejora la retención.
3. Facilita la operación de la comunidad.
4. Ayuda al crecimiento comercial.

Si no cumple estos criterios, permanece en Backlog.

# Modelo Comercial Inicial

## Principio comercial

Padel Tracker IA no debe cobrar por bloquear la experiencia principal.

El objetivo es que una comunidad pueda probar y entender el valor del producto.

La monetización debe estar basada principalmente en:

- Tamaño de la comunidad.
- Cantidad de deportes habilitados.
- Funciones avanzadas.
- Herramientas de administración.
- Necesidades profesionales.

---

# Estructura inicial de planes

## Plan Básico

Pensado para comunidades pequeñas.

Características:

- Una comunidad.
- Un deporte habilitado.
- Límite de deportistas según plan vigente.
- Gestión de jugadores.
- Creación de encuentros.
- Confirmaciones.
- Resultados.
- Ranking básico.
- Estadísticas básicas.

Objetivo:

Permitir que una comunidad pequeña descubra el valor del producto.

---

# Plan Premium

Pensado para comunidades con mayor actividad.

Características:

- Una comunidad.
- Múltiples deportes habilitados.
- Mayor cantidad de deportistas.
- Estadísticas avanzadas.
- Más herramientas de administración.
- Mayor personalización.
- Funciones IA ampliadas.

Objetivo:

Entregar mayor valor a comunidades activas y en crecimiento.

---

# Planes futuros

Posibles líneas futuras:

## Profesional

Para:

- Clubes deportivos.
- Academias.
- Organizaciones.

Posibles características:

- Múltiples administradores.
- Reportes avanzados.
- Branding personalizado.
- Integraciones.

---

## Enterprise

Para:

- Federaciones.
- Grandes organizaciones.
- Empresas.

---

# Control del Super Administrador

En la primera etapa:

El Super Administrador controla:

- Creación de comunidades.
- Activación de planes.
- Deportes disponibles.
- Límites.
- Soporte.

Esto permite validar el negocio antes de automatizar procesos comerciales.

---

# Principio de crecimiento

La aplicación debe facilitar la expansión natural:

Jugador conoce la aplicación.

↓

La recomienda a otra comunidad.

↓

Nueva comunidad solicita acceso.

↓

Super Administrador crea y configura.

↓

La comunidad comienza a usar la plataforma.

El crecimiento por recomendación es parte del diseño del producto.

# Modelo Comercial Inicial

## Principio comercial

Padel Tracker IA no debe cobrar por bloquear la experiencia principal.

El objetivo es que una comunidad pueda probar y entender el valor del producto.

La monetización debe estar basada principalmente en:

- Tamaño de la comunidad.
- Cantidad de deportes habilitados.
- Funciones avanzadas.
- Herramientas de administración.
- Necesidades profesionales.

---

# Estructura inicial de planes

## Plan Básico

Pensado para comunidades pequeñas.

Características:

- Una comunidad.
- Un deporte habilitado.
- Límite de deportistas según plan vigente.
- Gestión de jugadores.
- Creación de encuentros.
- Confirmaciones.
- Resultados.
- Ranking básico.
- Estadísticas básicas.

Objetivo:

Permitir que una comunidad pequeña descubra el valor del producto.

---

# Plan Premium

Pensado para comunidades con mayor actividad.

Características:

- Una comunidad.
- Múltiples deportes habilitados.
- Mayor cantidad de deportistas.
- Estadísticas avanzadas.
- Más herramientas de administración.
- Mayor personalización.
- Funciones IA ampliadas.

Objetivo:

Entregar mayor valor a comunidades activas y en crecimiento.

---

# Planes futuros

Posibles líneas futuras:

## Profesional

Para:

- Clubes deportivos.
- Academias.
- Organizaciones.

Posibles características:

- Múltiples administradores.
- Reportes avanzados.
- Branding personalizado.
- Integraciones.

---

## Enterprise

Para:

- Federaciones.
- Grandes organizaciones.
- Empresas.

---

# Control del Super Administrador

En la primera etapa:

El Super Administrador controla:

- Creación de comunidades.
- Activación de planes.
- Deportes disponibles.
- Límites.
- Soporte.

Esto permite validar el negocio antes de automatizar procesos comerciales.

---

# Principio de crecimiento

La aplicación debe facilitar la expansión natural:

Jugador conoce la aplicación.

↓

La recomienda a otra comunidad.

↓

Nueva comunidad solicita acceso.

↓

Super Administrador crea y configura.

↓

La comunidad comienza a usar la plataforma.

El crecimiento por recomendación es parte del diseño del producto.

# Criterios de éxito del lanzamiento PMV 1.0

El PMV será considerado listo para lanzamiento comercial cuando cumpla los siguientes criterios.

---

# 1. Operación básica de una comunidad

Debe ser posible:

✅ Crear una comunidad.

✅ Configurar su información básica.

✅ Invitar jugadores.

✅ Registrar deportistas.

✅ Gestionar miembros.

✅ Crear encuentros.

✅ Confirmar asistencia.

---

# 2. Flujo completo de un encuentro

Debe funcionar de principio a fin:

Crear encuentro.

↓

Jugadores reciben invitación.

↓

Jugadores confirman asistencia.

↓

Sistema controla cupos.

↓

Se genera lista de espera si corresponde.

↓

Se crean partidos.

↓

Se registran resultados.

↓

Se confirman resultados.

↓

Se actualizan estadísticas e historial.

---

# 3. Seguridad mínima

Antes de producción debe estar garantizado:

✅ Una comunidad no puede ver información de otra.

✅ Los usuarios solo pueden modificar información autorizada.

✅ Los resultados solo pueden ser confirmados por participantes.

✅ Los permisos funcionan correctamente.

---

# 4. Experiencia del usuario

La aplicación debe cumplir:

- Uso simple desde celular.
- Navegación clara.
- Pocos pasos para acciones frecuentes.
- Mensajes comprensibles.
- No depender de capacitación.

---

# 5. Validación con usuarios reales

Antes del lanzamiento comercial:

Debe existir un grupo inicial de prueba.

Objetivos:

- Observar uso real.
- Detectar problemas.
- Recibir comentarios.
- Medir frecuencia de uso.

---

# 6. Métricas iniciales

Debemos medir:

## Comunidad

- Cantidad de comunidades activas.
- Jugadores registrados.
- Encuentros creados.

## Uso

- Encuentros por semana.
- Jugadores activos.
- Resultados registrados.

## Negocio

- Comunidades interesadas.
- Conversión a planes pagados.
- Retención mensual.

---

# Definición de éxito inicial

El objetivo del primer lanzamiento no es tener miles de usuarios.

El objetivo es demostrar:

"Una comunidad deportiva puede organizarse mejor usando Padel Tracker IA que utilizando solamente WhatsApp."

Cuando esto ocurra, el producto tendrá validación real.