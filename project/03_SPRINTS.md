# 03 — Sprints

- **Creado:** 2026-08-03
- **Última actualización:** 2026-08-03

## Propósito

Contiene el estado de cada Sprint: objetivos, tareas comprometidas, estado de avance (pendiente / en curso / completado) y retrospectiva. Es el documento operativo del equipo de desarrollo semana a semana.

# Plan de Sprints

Versión: 1.0

Estado: Activo

---

# Sprint 0 — Fundación técnica

## Objetivo

Preparar la arquitectura actual para soportar la evolución del producto hacia una plataforma deportiva multicomunidad y multideporte.

Este sprint prioriza estabilidad, seguridad e integridad de datos antes de incorporar nuevas funcionalidades.

---

# Objetivos principales

## 1. Aislamiento entre comunidades

Prioridad:
CRÍTICA

Problema actual:

Algunas rutas no filtran correctamente la información por comunidad.

Riesgo:

Un usuario podría visualizar información perteneciente a otra comunidad.

Acciones:

- Revisar todas las consultas que utilizan club_id/comunidad_id.
- Asegurar que cada usuario solo pueda acceder a sus comunidades autorizadas.
- Aplicar validaciones en backend, no solamente frontend.
- Revisar encuentros, partidos, jugadores y rankings.

Criterio de éxito:

Un usuario de una comunidad nunca puede acceder ni modificar información de otra comunidad.


---

# 2. Modelo Usuario - Deportista - Comunidad

Prioridad:
CRÍTICA

Problema actual:

El modelo actual mezcla responsabilidades entre usuario y jugador.

Objetivo futuro:

Separar correctamente:

Usuario:
Cuenta de acceso.

Deportista:
Perfil deportivo.

Membresía:
Relación entre usuario/deportista y comunidad.

Acciones:

- Implementar relación usuario ↔ deportista.
- Preparar estructura de membresías.
- Permitir múltiples comunidades por usuario.
- Evitar duplicación de cuentas.

Criterio de éxito:

Un usuario puede pertenecer a varias comunidades utilizando una sola cuenta.


---

# 3. Roles y permisos

Prioridad:
CRÍTICA

Problema actual:

Existen múltiples sistemas de roles mezclados.

Objetivo:

Definir claramente:

Super Administrador.

Administrador de Comunidad.

Organizador de encuentro.

Jugador.

Acciones:

- Unificar lógica de permisos.
- Eliminar validaciones duplicadas.
- Implementar reglas centrales.

Criterio de éxito:

Cada usuario solamente puede realizar acciones permitidas según su rol.


---

# 4. Catálogo deportivo

Prioridad:
ALTA

Problema actual:

La tabla de deportes existe pero no está inicializada correctamente.

Acciones:

- Crear catálogo inicial de deportes.
- Definir deportes activos.
- Preparar relación comunidad ↔ deporte.
- Preparar categorías deportivas.

Deportes iniciales:

- Pádel.
- Tenis.
- Fútbol.

Criterio de éxito:

El sistema puede crear encuentros asociados correctamente a un deporte.


---

# 5. Corrección del modelo de partidos

Prioridad:
ALTA

Problema actual:

Existen inconsistencias entre:

matches

y

match_players.

Acciones:

- Revisar estructura de equipos.
- Eliminar referencias antiguas.
- Normalizar participantes del partido.
- Preparar generación automática futura.

Criterio de éxito:

Un partido creado desde un encuentro aparece correctamente en historial, estadísticas y ranking.


---

# 6. Preparación del motor ELO

Prioridad:
MEDIA

Acciones:

- Revisar cálculo actual.
- Preparar ELO por comunidad.
- Preparar separación por deporte.
- Mantener historial deportivo.

Criterio de éxito:

Los resultados confirmados actualizan correctamente el rendimiento deportivo.


---

# Resultado esperado Sprint 0

Al finalizar:

La plataforma debe tener una base segura y escalable para comenzar la construcción del PMV.

No buscamos nuevas funciones visibles.

Buscamos una arquitectura confiable.

# Sprint 1 — Comunidad, Usuarios y Membresías

## Objetivo

Implementar la estructura base de identidad del producto.

Permitir que una persona pueda participar en diferentes comunidades deportivas utilizando una única cuenta.

---

# 1. Modelo de Comunidad

Prioridad:
CRÍTICA

Implementar:

- Comunidad como entidad principal.
- Información básica.
- Logo.
- Colores personalizados.
- Estado.
- Plan contratado.
- Deportes habilitados.

Datos principales:

- Nombre.
- Imagen/logo.
- Administrador principal.
- Estado.
- Configuración visual.

Criterio de éxito:

Una comunidad puede ser creada y administrada correctamente.


---

# 2. Modelo Usuario

Prioridad:
CRÍTICA

El usuario representa la cuenta de acceso.

Responsabilidades:

- Autenticación.
- Datos personales.
- Preferencias de contacto.
- Acceso a comunidades.

Un usuario no pertenece directamente a una sola comunidad.

---

# 3. Modelo Deportista

Prioridad:
CRÍTICA

El deportista representa el perfil deportivo.

Información:

Datos generales:

- Nombre.
- Foto.
- Teléfono.
- WhatsApp autorizado.
- Preferencias de contacto.

Información deportiva:

- Deportes practicados.
- Nivel.
- Características específicas por deporte.

Ejemplo pádel:

- Mano dominante.
- Derecha.
- Revés.
- Ambas posiciones.

---

# 4. Sistema de Membresías

Prioridad:
CRÍTICA

Implementar relación:

Usuario/Deportista ↔ Comunidad


Una persona puede:

- Pertenecer a varias comunidades.
- Tener diferente rol en cada comunidad.
- Tener diferentes rankings en cada comunidad.

Ejemplo:

Cristian:

Los Parry Padel:
Jugador.

Ciudad del Valle:
Jugador.

Otra comunidad:
Administrador.


---

# 5. Roles

Implementar:

## Super Administrador

Control global del sistema.

## Administrador de Comunidad

Administra una comunidad específica.

## Organizador

Rol temporal asociado a un encuentro.

## Jugador

Participante deportivo.


---

# 6. Invitaciones

Implementar:

- Código de invitación.
- Enlace de invitación.
- Registro de uso.
- Asociación automática a comunidad.

Flujo:

Administrador crea invitación.

↓

Jugador acepta.

↓

Sistema crea o vincula deportista.

↓

Se genera membresía.


---

# 7. Onboarding mejorado

Nuevo flujo:

Usuario ingresa.

↓

Selecciona comunidad o acepta invitación.

↓

Crea/vincula perfil deportivo.

↓

Queda listo para participar.


---

# Resultado esperado Sprint 1

Al finalizar:

La plataforma tendrá una identidad correcta.

Un usuario podrá existir una sola vez y participar en múltiples comunidades deportivas.

La arquitectura estará preparada para crecer.

# Sprint 2 — Encuentros Inteligentes

## Objetivo

Crear un sistema completo para organizar actividades deportivas.

El encuentro será el centro operativo de la comunidad.

---

# 1. Creación de encuentros

Prioridad:
CRÍTICA

Un encuentro podrá ser creado por:

- Administrador de comunidad.
- Jugador autorizado como organizador.

Datos principales:

- Nombre.
- Deporte.
- Fecha.
- Hora.
- Lugar.
- Duración.
- Cantidad máxima de participantes.
- Categoría/nivel.
- Organizador.

---

# 2. Duración del encuentro

Prioridad:
ALTA

El organizador podrá definir:

- 1 partido.
- 90 minutos.
- 2 horas.
- 3 horas.
- Sin límite.

Motivo:

La duración modifica completamente la generación automática de partidos.

Ejemplo:

12 jugadores durante 2 horas.

La IA no debe generar rondas imposibles.

Debe optimizar según tiempo disponible.

---

# 3. Estados del encuentro

Prioridad:
CRÍTICA

Estados:

Borrador.

Abierto.

Completo.

En juego.

Resultado pendiente.

Confirmado.

Cerrado.

Cancelado.


Cada estado tendrá acciones permitidas.

---

# 4. Inscripción y asistencia

Prioridad:
CRÍTICA

Estados del jugador:

- Confirmado.
- Pendiente.
- Rechazado.
- Lista de espera.


El organizador podrá visualizar:

- Jugadores confirmados.
- Cupos disponibles.
- Pendientes.
- Lista de espera.


---

# 5. Lista de espera inteligente

Prioridad:
ALTA

Funcionamiento:

Si un encuentro está completo:

Los nuevos jugadores ingresan ordenadamente.

Ejemplo:

1 Carlos.

2 Felipe.

3 Andrés.


Si alguien cancela:

El primero recibe automáticamente:

"Se liberó un cupo. ¿Quieres participar?"

Opciones:

Aceptar.

Rechazar.


Si rechaza:

Pasa automáticamente al siguiente.


---

# 6. Panel del organizador

Prioridad:
ALTA

Vista resumida:

- Estado del encuentro.
- Jugadores confirmados.
- Pendientes.
- Lista de espera.
- Problemas detectados por IA.
- Acciones rápidas.


---

# 7. Asistente IA preventivo

Prioridad:
MEDIA

Antes del encuentro la IA puede detectar:

Ejemplos:

- Faltan jugadores.
- Hay niveles demasiado desbalanceados.
- Hay demasiados jugadores de una posición.
- Existen repeticiones excesivas de parejas.
- Falta confirmar participantes.


La IA recomienda soluciones.

El organizador decide.


---

# Resultado esperado Sprint 2

Al finalizar:

Una comunidad puede organizar encuentros completos sin depender de grupos externos de WhatsApp.

El organizador tiene control y ayuda inteligente.

# Sprint 3 — Motor Deportivo: Partidos, Parejas e IA

## Objetivo

Crear el motor que transforma participantes de un encuentro en partidos equilibrados según deporte, tiempo disponible y características de los deportistas.

---

# 1. Generación automática de partidos

Prioridad:
CRÍTICA

El sistema debe poder generar partidos automáticamente.

Variables consideradas:

- Deporte.
- Cantidad de participantes.
- Cantidad de canchas/campos.
- Duración del encuentro.
- Nivel deportivo.
- Historial previo.
- Posiciones deportivas.


El organizador podrá:

Aceptar la propuesta.

Modificar.

Regenerar.

Crear manualmente.


Motivo:

La IA ayuda, pero el organizador mantiene control.


---

# 2. Motor adaptable por deporte

Prioridad:
CRÍTICA

El motor deportivo debe ser independiente del deporte.

Cada deporte tendrá reglas propias.


Ejemplo:

Pádel:

- Parejas 2 contra 2.
- Posición derecha/revés.
- Mano dominante.
- Compatibilidad de parejas.


Fútbol:

- Cantidad de jugadores.
- Posiciones.
- Equilibrio ofensivo/defensivo.


Tenis:

- Individual o dobles.
- Nivel.
- Preferencias.


---

# 3. Formatos deportivos

Prioridad:
ALTA

Soportar diferentes formatos.

Ejemplo pádel:

- Americana.
- Parejas fijas.
- Rotación.
- Partidos manuales.


Futuro:

Cada deporte podrá incorporar sus propios formatos.


---

# 4. Algoritmo de equilibrio deportivo

Prioridad:
ALTA

La generación debe considerar:

- ELO.
- Nivel.
- Cantidad de partidos jugados.
- Evitar repetir rivales.
- Evitar repetir parejas.
- Compatibilidad deportiva.


Objetivo:

Crear encuentros más justos y entretenidos.


---

# 5. Confirmación de resultados

Prioridad:
CRÍTICA

Flujo:

Jugador registra resultado.

↓

Sistema solicita confirmación.

↓

Rival valida.

↓

Resultado confirmado.


Solo resultados confirmados afectan:

- Ranking.
- Estadísticas.
- Historial.


---

# 6. Historial deportivo

Prioridad:
ALTA

Registrar:

- Encuentros jugados.
- Partidos.
- Rivales.
- Parejas.
- Resultados.
- Evolución deportiva.


Ejemplo:

Cristian y Mauricio jugaron juntos:

12 veces.

Ganaron:

8.

Perdieron:

4.


---

# 7. IA de mejora deportiva

Prioridad:
MEDIA

La IA puede analizar:

- Compatibilidad de parejas.
- Desbalance de equipos.
- Jugadores que necesitan subir/bajar nivel.
- Repetición excesiva de rivales.


Siempre como recomendación.

No decisión automática.


---

# Resultado esperado Sprint 3

Al finalizar:

La plataforma puede transformar una lista de jugadores en una experiencia deportiva organizada, equilibrada y medible.


# Sprint 4 — Ranking, ELO, Estadísticas e Inteligencia Deportiva

## Objetivo

Crear un sistema deportivo confiable que mida evolución, genere motivación y permita analizar el rendimiento de cada deportista.

---

# 1. Ranking por comunidad

Prioridad:
CRÍTICA

El ranking será independiente dentro de cada comunidad.

Ejemplo:

Cristian:

Los Parry Padel:
ELO 1600

Ciudad del Valle:
ELO 1450


Motivo:

Cada comunidad tiene diferentes niveles y rivales.


---

# 2. Ranking separado por deporte

Prioridad:
CRÍTICA

Cada deporte tendrá su propio ranking.

Ejemplo:

Cristian:

Pádel:
1600 ELO

Tenis:
1500 ELO

Fútbol:
Categoría correspondiente.


Motivo:

No se pueden comparar deportes diferentes.


---

# 3. Sistema ELO deportivo

Prioridad:
CRÍTICA

El sistema utilizará ELO adaptado a deportes.

Considerará:

- Nivel del rival.
- Resultado.
- Diferencia esperada.
- Equipos cuando corresponda.
- Empates.


El ELO será actualizado solamente con resultados confirmados.


---

# 4. Actualización del ELO

Prioridad:
ALTA

El ELO oficial se actualizará cuando:

- El encuentro termine.
- Todos los partidos estén confirmados.
- El sistema procese los resultados.


Motivo:

Evitar cambios constantes durante un encuentro activo.


---

# 5. Historial deportivo

Prioridad:
ALTA

Cada deportista tendrá historial:

- Partidos jugados.
- Victorias.
- Derrotas.
- Empates.
- Rivales.
- Parejas utilizadas.
- Evolución del ELO.


---

# 6. Estadísticas inteligentes

Prioridad:
MEDIA

Generar estadísticas como:

Jugador:

- Partidos jugados.
- Porcentaje de victoria.
- Mejor pareja.
- Rival más frecuente.
- Evolución mensual.


Comunidad:

- Participación.
- Jugadores activos.
- Tendencias.
- Frecuencia de encuentros.


---

# 7. IA de análisis deportivo

Prioridad:
MEDIA

La IA podrá entregar recomendaciones:

Ejemplos:

"Tu rendimiento mejora cuando juegas con jugadores ofensivos."

"Has jugado 8 partidos contra los mismos rivales."

"Existe un grupo de jugadores con nivel similar para nuevos encuentros."


Siempre como recomendación.


---

# 8. Reconocimientos y motivación

Prioridad:
FUTURA

Preparar sistema de:

- Logros.
- Medallas.
- Rachas.
- Reconocimientos comunitarios.


Objetivo:

Aumentar la retención y participación.


---

# Resultado esperado Sprint 4

Al finalizar:

Cada jugador tendrá una identidad deportiva medible.

La comunidad tendrá información para organizar mejores encuentros.

El sistema comenzará a generar inteligencia deportiva.

# Sprint 5 — Monetización, Planes y Salida al Mercado

## Objetivo

Transformar la plataforma en un producto comercializable, permitiendo validar mercado, generar ingresos y escalar progresivamente.

---

# 1. Modelo comercial inicial

Prioridad:
CRÍTICA

La monetización no debe bloquear las funciones principales.

La estrategia será:

Permitir que una comunidad experimente valor.

Cobrar por crecimiento, capacidad y herramientas avanzadas.


---

# 2. Planes comerciales

Prioridad:
ALTA

Los planes estarán definidos principalmente por:

- Cantidad de miembros.
- Cantidad de deportes.
- Nivel de administración.
- Personalización.
- Herramientas avanzadas.


Ejemplo inicial:


## Plan Básico

Objetivo:

Comunidades pequeñas.


Características:

- Una comunidad.
- Un deporte.
- Límite de jugadores.
- Encuentros.
- Registro de resultados.
- Ranking básico.


---

## Plan Premium

Objetivo:

Comunidades con mayor actividad.


Características:

- Más miembros.
- Hasta varios deportes.
- Estadísticas avanzadas.
- IA deportiva.
- Mayor personalización.
- Herramientas administrativas.


---

# 3. Control inicial del Super Administrador

Prioridad:
ALTA

Durante la primera etapa:

El Super Administrador gestionará:

- Creación de comunidades.
- Activación de planes.
- Límites.
- Deportes habilitados.
- Configuración inicial.


Motivo:

Permitir validar mercado antes de automatizar.


---

# 4. Estrategia de crecimiento

Prioridad:
CRÍTICA

Primer objetivo:

Conseguir comunidades activas.

No solamente usuarios registrados.


Métricas iniciales:

- Comunidades creadas.
- Jugadores activos.
- Encuentros realizados.
- Retención mensual.
- Frecuencia de uso.


---

# 5. Primera etapa comercial

Prioridad:
ALTA

Estrategia:

Seleccionar comunidades piloto.

Ejemplo:

- Grupos de pádel conocidos.
- Clubes pequeños.
- Comunidades deportivas organizadas.


Objetivo:

Validar:

- Facilidad de uso.
- Valor real.
- Disposición de pago.


---

# 6. Futuras líneas de ingresos

Prioridad:
FUTURA

Posibles extensiones:

- Planes profesionales.
- Estadísticas avanzadas.
- Publicidad deportiva.
- Integraciones con clubes.
- Reservas deportivas.
- Servicios premium para organizadores.


---

# 7. Preparación para escalamiento

Prioridad:
MEDIA

Preparar:

- Sistema de pagos.
- Gestión automática de planes.
- Facturación.
- Métricas comerciales.
- Soporte multiidioma.


---

# Resultado esperado Sprint 5

Al finalizar:

La plataforma estará preparada para pasar de proyecto tecnológico a producto comercial.




