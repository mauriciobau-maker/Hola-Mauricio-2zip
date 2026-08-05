# 04 — Backlog

- **Creado:** 2026-08-03
- **Última actualización:** 2026-08-03

## Propósito

Ideas, funcionalidades y mejoras futuras que NO forman parte del Sprint actual ni del PMV. Sirve como repositorio de intenciones priorizadas para planificar sprints futuros. Cada ítem puede incluir contexto, motivación y criterios de aceptación preliminares.
# BACKLOG MAESTRO
## Padel Tracker IA

Versión:
1.0

Estado:
Activo


# Cómo leer este documento

Prioridades:

P0 = Crítico para funcionamiento.
P1 = Necesario para PMV.
P2 = Mejora importante.
P3 = Futuro.


Estados:

Pendiente.
En desarrollo.
Pruebas.
Completado.


---

# BLOQUE 1
# Fundación Arquitectónica

## BACK-001
### Aislamiento por comunidad

Prioridad:
P0

Sprint:
Sprint 0

Descripción:

Todas las consultas deben respetar la comunidad del usuario.

Incluye:

- Encuentros.
- Partidos.
- Jugadores.
- Ranking.

Criterio de éxito:

Un usuario nunca puede ver información de otra comunidad.


Estado:
Pendiente


---

## BACK-002
### Implementar modelo de membresías

Prioridad:
P0

Sprint:
Sprint 1

Descripción:

Crear relación:

Usuario ↔ Comunidad

mediante membresías.

Permitir:

- Varias comunidades por usuario.
- Diferentes roles.
- Diferentes permisos.

Estado:
Pendiente


---

# BLOQUE 2
# Usuarios y Deportistas

## BACK-003
### Separación Usuario / Deportista

Prioridad:
P0

Sprint:
Sprint 1

Descripción:

Separar:

Usuario:
Cuenta de acceso.

Deportista:
Perfil deportivo.

Estado:
Pendiente


---

# BLOQUE 3
# Comunidades

## BACK-004
### Gestión de comunidades

Prioridad:
P1

Sprint:
Sprint 1

Funciones:

- Crear comunidad.
- Logo.
- Colores.
- Deportes habilitados.
- Plan.
- Estado.

Estado:
Pendiente


---

# BLOQUE 4
# Encuentros

## BACK-005
### Motor de encuentros

Prioridad:
P1

Sprint:
Sprint 2

Funciones:

- Crear encuentro.
- Cupos.
- Estados.
- Confirmaciones.
- Lista de espera.


Estado:
Pendiente


---

# BLOQUE 5
# Motor Deportivo

## BACK-006
### Generación automática de partidos

Prioridad:
P1

Sprint:
Sprint 3

Funciones:

- Americana.
- Parejas fijas.
- Manual.
- Adaptación por deporte.


Estado:
Pendiente


---

# BLOQUE 6
# Ranking e IA

## BACK-007
### ELO deportivo

Prioridad:
P1

Sprint:
Sprint 4

Funciones:

- ELO por comunidad.
- ELO por deporte.
- Historial.
- Estadísticas.


Estado:
Pendiente


---

# BLOQUE 7
# Monetización

## BACK-008
### Sistema de planes

Prioridad:
P2

Sprint:
Sprint 5

Funciones:

- Plan básico.
- Premium.
- Límites.
- Deportes habilitados.


Estado:
Pendiente

---

# BLOQUE 2
# Usuarios y Deportistas


## BACK-003

### Separación Usuario / Deportista

Prioridad:
P0

Sprint:
Sprint 1


Descripción:

Separar correctamente la identidad de acceso de la identidad deportiva.


Usuario:

Representa la cuenta dentro del sistema.

Responsabilidades:

- Login.
- Seguridad.
- Datos personales.
- Acceso a comunidades.


Deportista:

Representa el perfil deportivo.

Responsabilidades:

- Nombre deportivo.
- Foto.
- Deportes practicados.
- Nivel.
- Estadísticas.
- Historial.


Reglas:

Un usuario puede tener un deportista asociado.

Un usuario puede pertenecer a varias comunidades.

Un deportista puede participar en diferentes comunidades mediante membresías.


Criterio de éxito:

La plataforma permite que una persona tenga una sola cuenta y participe en múltiples comunidades deportivas.


Estado:
Pendiente


---


## BACK-004

### Perfil básico del deportista

Prioridad:
P1

Sprint:
Sprint 1


Descripción:

Crear la ficha deportiva del jugador.


Información general:

- Nombre.
- Foto.
- Email opcional.
- Teléfono.
- WhatsApp autorizado.
- Preferencias de contacto.


Información deportiva:

- Deportes asociados.
- Nivel deportivo.
- Categorías.
- Estadísticas.


Regla importante:

La pantalla principal de jugadores debe mantenerse simple.

La información avanzada aparece al entrar al perfil.


Criterio de éxito:

El listado de jugadores sigue siendo rápido y simple, mientras el perfil contiene toda la información.


Estado:
Pendiente


---


## BACK-005

### Autorización de contacto

Prioridad:
P1

Sprint:
Sprint 1


Descripción:

Gestionar correctamente los medios de comunicación.


Opciones:

- Email.
- Teléfono.
- WhatsApp.


El deportista puede definir:

- Qué medios autoriza.
- Qué tipo de mensajes permite recibir.


Objetivo:

Permitir comunicación deportiva respetando privacidad del usuario.


Criterio de éxito:

La comunidad puede comunicarse con jugadores sin perder control sobre sus preferencias.


Estado:
Pendiente

---

---

# BLOQUE 3
# Comunidades, Planes y Super Administrador


## BACK-006

### Gestión de comunidades

Prioridad:
P0

Sprint:
Sprint 1


Descripción:

Crear la estructura completa de una comunidad deportiva.


Información:

- Nombre.
- Logo.
- Colores personalizados.
- Estado.
- Administrador principal.
- Deportes habilitados.
- Plan contratado.


Reglas:

Una comunidad pertenece al ecosistema general.

Cada comunidad administra sus propios:

- Deportistas.
- Encuentros.
- Partidos.
- Rankings.


Criterio de éxito:

Una comunidad puede operar de forma independiente sin interferir con otras comunidades.


Estado:
Pendiente


---


## BACK-007

### Panel Super Administrador

Prioridad:
P1

Sprint:
Sprint 1


Descripción:

Crear herramientas para administrar la plataforma completa.


Funciones:

- Crear comunidades.
- Editar comunidades.
- Activar planes.
- Gestionar límites.
- Habilitar deportes.
- Revisar estado.


Regla:

El Super Administrador controla la primera etapa comercial.


Criterio de éxito:

El sistema puede incorporar nuevos clientes sin modificar código.


Estado:
Pendiente


---


## BACK-008

### Sistema de planes comerciales

Prioridad:
P1

Sprint:
Sprint 5


Descripción:

Preparar monetización basada en capacidad y funcionalidades.


Factores:

- Cantidad de jugadores.
- Deportes disponibles.
- Funciones avanzadas.
- Personalización.


Ejemplo:


Plan Básico:

- Comunidad pequeña.
- Un deporte.
- Funciones esenciales.


Plan Premium:

- Más jugadores.
- Más deportes.
- IA avanzada.
- Estadísticas.


Regla:

Los límites deben ser configurables por Super Administrador.


Criterio de éxito:

Una comunidad puede cambiar de plan sin reconstruir información.


Estado:
Pendiente


---


## BACK-009

### Asistente de creación de comunidad

Prioridad:
P2

Sprint:
Sprint futuro


Descripción:

Crear un asistente guiado para facilitar nuevos registros.


Funciones futuras:

- Recomendación de configuración.
- Selección de deportes.
- Creación inicial.
- Configuración automática.


Regla:

La IA recomienda.

El administrador decide.


Criterio de éxito:

Crear una comunidad nueva requiere pocos pasos.


Estado:
Pendiente

---

---

# BLOQUE 4
# Encuentros Inteligentes


## BACK-010

### Creación de encuentros deportivos

Prioridad:
P0

Sprint:
Sprint 2


Descripción:

Crear el módulo central para organizar actividades deportivas.


Datos principales:

- Nombre del encuentro.
- Deporte.
- Fecha.
- Hora.
- Lugar.
- Duración.
- Cantidad máxima de participantes.
- Categoría/nivel.
- Organizador.


Permisos:

Puede crear:

- Administrador de comunidad.
- Usuario autorizado.


Criterio de éxito:

Una comunidad puede crear un encuentro completo sin utilizar herramientas externas.


Estado:
Pendiente


---


## BACK-011

### Estados del encuentro

Prioridad:
P0

Sprint:
Sprint 2


Descripción:

Implementar ciclo de vida completo del encuentro.


Estados:

- Borrador.
- Abierto.
- Completo.
- En juego.
- Resultado pendiente.
- Confirmado.
- Cerrado.
- Cancelado.


Reglas:

Cada estado define qué acciones están disponibles.


Criterio de éxito:

El encuentro tiene un flujo controlado desde creación hasta cierre.


Estado:
Pendiente


---


## BACK-012

### Sistema de confirmación de asistencia

Prioridad:
P0

Sprint:
Sprint 2


Descripción:

Gestionar participación de jugadores.


Estados del participante:

- Confirmado.
- Pendiente.
- Rechazado.
- Lista de espera.


Mostrar:

- Cupos disponibles.
- Jugadores confirmados.
- Pendientes.
- Espera.


Criterio de éxito:

El organizador conoce en todo momento quién participa.


Estado:
Pendiente


---


## BACK-013

### Lista de espera inteligente

Prioridad:
P1

Sprint:
Sprint 2


Descripción:

Automatizar la gestión de cupos.


Funcionamiento:

Cuando un encuentro está completo:

Los nuevos jugadores ingresan ordenadamente.


Si existe una cancelación:

El primer jugador en espera recibe aviso.


Opciones:

- Aceptar cupo.
- Rechazar cupo.


Si rechaza:

El sistema continúa con el siguiente.


Criterio de éxito:

Los cupos se llenan automáticamente sin gestión manual.


Estado:
Pendiente


---


## BACK-014

### Panel del organizador

Prioridad:
P1

Sprint:
Sprint 2


Descripción:

Crear una vista simple para administrar encuentros.


Información:

- Estado.
- Confirmados.
- Pendientes.
- Lista de espera.
- Problemas detectados.
- Acciones rápidas.


Objetivo:

Reducir la carga del organizador.


Criterio de éxito:

El organizador puede controlar todo el encuentro desde una pantalla.


Estado:
Pendiente


---


## BACK-015

### Asistente IA preventivo

Prioridad:
P2

Sprint:
Sprint futuro


Descripción:

La IA analiza el encuentro antes de comenzar.


Puede detectar:

- Falta de jugadores.
- Desequilibrio de niveles.
- Repetición excesiva.
- Problemas de organización.


Regla:

La IA recomienda.

El organizador decide.


Criterio de éxito:

La IA ayuda a prevenir problemas antes del encuentro.


Estado:
Pendiente

---

---

# BLOQUE 5
# Motor Deportivo, Partidos e IA


## BACK-016

### Generación automática de partidos

Prioridad:
P0

Sprint:
Sprint 3


Descripción:

Transformar participantes confirmados en partidos organizados.


Variables:

- Deporte.
- Cantidad de jugadores.
- Tiempo disponible.
- Canchas/campos.
- Nivel deportivo.
- Historial.


Opciones:

- Generación automática.
- Modificación manual.
- Regenerar propuesta.


Regla:

La IA propone.

El organizador decide.


Criterio de éxito:

Un encuentro puede pasar de jugadores confirmados a partidos organizados.


Estado:
Pendiente


---


## BACK-017

### Motor deportivo multideporte

Prioridad:
P0

Sprint:
Sprint 3


Descripción:

Crear un motor adaptable a diferentes deportes.


Cada deporte tendrá sus reglas.


Pádel:

- Parejas 2 vs 2.
- Posiciones.
- Mano dominante.
- Compatibilidad.


Tenis:

- Individual.
- Dobles.
- Nivel.


Fútbol:

- Equipos.
- Posiciones.
- Balance.


Criterio de éxito:

El motor no depende exclusivamente del pádel.


Estado:
Pendiente


---


## BACK-018

### Formatos de juego

Prioridad:
P1

Sprint:
Sprint 3


Descripción:

Permitir diferentes formas de competencia.


Pádel:

- Americana.
- Parejas fijas.
- Rotación.
- Manual.


Futuro:

Cada deporte podrá definir sus propios formatos.


Criterio de éxito:

La comunidad puede elegir cómo quiere jugar.


Estado:
Pendiente


---


## BACK-019

### Algoritmo de equilibrio deportivo

Prioridad:
P1

Sprint:
Sprint 3


Descripción:

Crear partidos equilibrados.


Factores:

- ELO.
- Nivel.
- Historial.
- Victorias.
- Derrotas.
- Repetición de parejas.
- Repetición de rivales.


Objetivo:

Mejorar la experiencia deportiva.


Criterio de éxito:

Los partidos generados tienen menor diferencia de nivel.


Estado:
Pendiente


---


## BACK-020

### Confirmación de resultados

Prioridad:
P0

Sprint:
Sprint 3


Descripción:

Controlar validez de resultados.


Flujo:

Jugador registra resultado.

↓

Rival confirma.

↓

Resultado oficial.


Solo resultados confirmados afectan:

- Ranking.
- ELO.
- Estadísticas.


Criterio de éxito:

No existen resultados falsos afectando el sistema.


Estado:
Pendiente


---


## BACK-021

### Historial deportivo

Prioridad:
P1

Sprint:
Sprint 3


Descripción:

Registrar trayectoria deportiva.


Información:

- Partidos.
- Rivales.
- Parejas.
- Resultados.
- Evolución.


Ejemplo:

Cristian + Mauricio:

12 partidos juntos.

8 victorias.

4 derrotas.


Criterio de éxito:

Cada jugador tiene memoria deportiva.


Estado:
Pendiente


---


## BACK-022

### IA deportiva de recomendación

Prioridad:
P2

Sprint:
Futuro


Descripción:

Analizar información deportiva para generar recomendaciones.


Ejemplos:

- Mejor pareja posible.
- Jugadores compatibles.
- Evitar repeticiones.
- Ajustar niveles.


Regla:

La IA recomienda.

Nunca reemplaza la decisión humana.


Criterio de éxito:

El sistema entrega valor adicional sin quitar control.


Estado:
Pendiente

---

---

# BLOQUE 6
# Ranking, ELO, Estadísticas e Inteligencia Deportiva


## BACK-023

### Ranking por comunidad

Prioridad:
P0

Sprint:
Sprint 4


Descripción:

Crear rankings independientes para cada comunidad.


Reglas:

Cada comunidad tiene su propia competencia.

No mezclar jugadores de diferentes comunidades.


Ejemplo:

Cristian:

Comunidad A:
ELO 1600

Comunidad B:
ELO 1450


Criterio de éxito:

Cada comunidad refleja correctamente su nivel interno.


Estado:
Pendiente


---


## BACK-024

### Ranking por deporte

Prioridad:
P0

Sprint:
Sprint 4


Descripción:

Separar el rendimiento deportivo por disciplina.


Ejemplo:

Cristian:

Pádel:
1600 ELO

Tenis:
1500 ELO


Regla:

Nunca comparar deportes diferentes.


Criterio de éxito:

Cada deporte mantiene su propia evolución.


Estado:
Pendiente


---


## BACK-025

### Sistema ELO deportivo

Prioridad:
P0

Sprint:
Sprint 4


Descripción:

Implementar cálculo de nivel deportivo.


Considerar:

- Resultado.
- Nivel rival.
- Diferencia esperada.
- Equipos.
- Empates.


Regla:

Solo partidos confirmados modifican ELO.


Criterio de éxito:

El ranking refleja evolución real.


Estado:
Pendiente


---


## BACK-026

### Actualización oficial del ELO

Prioridad:
P1

Sprint:
Sprint 4


Descripción:

Actualizar ELO cuando el encuentro esté cerrado.


Proceso:

Todos los partidos confirmados.

↓

Procesamiento deportivo.

↓

Actualización de ranking.


Motivo:

Evitar cambios durante encuentros activos.


Criterio de éxito:

El ranking permanece estable y confiable.


Estado:
Pendiente


---


## BACK-027

### Perfil estadístico del deportista

Prioridad:
P1

Sprint:
Sprint 4


Descripción:

Crear estadísticas individuales.


Mostrar:

- Partidos jugados.
- Victorias.
- Derrotas.
- Empates.
- Porcentaje de triunfo.
- Evolución.
- Mejores parejas.
- Rivales frecuentes.


Criterio de éxito:

Cada jugador puede entender su evolución.


Estado:
Pendiente


---


## BACK-028

### Estadísticas de comunidad

Prioridad:
P2

Sprint:
Sprint 4


Descripción:

Generar información para administradores.


Mostrar:

- Jugadores activos.
- Frecuencia de encuentros.
- Participación.
- Tendencias.


Criterio de éxito:

El administrador entiende la salud de su comunidad.


Estado:
Pendiente


---


## BACK-029

### Inteligencia deportiva IA

Prioridad:
P2

Sprint:
Futuro


Descripción:

Analizar datos deportivos para entregar recomendaciones.


Ejemplos:

- Jugadores compatibles.
- Mejor pareja.
- Tendencias de rendimiento.
- Recomendaciones de entrenamiento.


Regla:

La IA entrega información.

No reemplaza decisiones humanas.


Criterio de éxito:

El jugador recibe valor personalizado.


Estado:
Pendiente

---

---

# BLOQUE 7
# Monetización, Planes y Salida al Mercado


## BACK-030

### Sistema de planes comerciales

Prioridad:
P0

Sprint:
Sprint 5


Descripción:

Crear estructura comercial para monetizar comunidades.


Los planes definirán:

- Cantidad máxima de deportistas.
- Cantidad de deportes.
- Funciones disponibles.
- Nivel de IA.
- Personalización.


Ejemplo:


Plan Básico:

- Comunidad pequeña.
- Un deporte.
- Encuentros.
- Resultados.
- Ranking básico.


Plan Premium:

- Más jugadores.
- Más deportes.
- Estadísticas avanzadas.
- IA deportiva.
- Personalización.


Criterio de éxito:

Una comunidad puede cambiar de plan sin perder información.


Estado:
Pendiente


---


## BACK-031

### Control de límites por plan

Prioridad:
P0

Sprint:
Sprint 5


Descripción:

Implementar reglas automáticas según plan.


Ejemplos:

- Máximo de jugadores.
- Deportes habilitados.
- Funciones premium.


Regla:

Los límites son configurables por Super Administrador.


Criterio de éxito:

El sistema controla automáticamente las capacidades contratadas.


Estado:
Pendiente


---


## BACK-032

### Gestión comercial del Super Administrador

Prioridad:
P1

Sprint:
Sprint 5


Descripción:

Crear herramientas para administrar clientes.


Funciones:

- Ver comunidades.
- Ver plan actual.
- Cambiar plan.
- Activar/desactivar servicios.
- Revisar actividad.


Criterio de éxito:

La primera etapa comercial puede gestionarse manualmente.


Estado:
Pendiente


---


## BACK-033

### Comunidad piloto

Prioridad:
P0

Sprint:
Salida inicial


Descripción:

Preparar estrategia de validación con primeras comunidades.


Objetivo:

Conseguir usuarios reales antes de automatizar ventas.


Proceso:

- Seleccionar comunidades.
- Configurar.
- Capacitar.
- Recibir feedback.


Métricas:

- Encuentros creados.
- Usuarios activos.
- Retención.
- Problemas detectados.


Criterio de éxito:

Validar que existe disposición real de uso y pago.


Estado:
Pendiente


---


## BACK-034

### Sistema de pagos futuro

Prioridad:
P2

Sprint:
Futuro


Descripción:

Preparar integración comercial.


Incluye:

- Suscripciones.
- Facturación.
- Renovaciones.
- Historial de pagos.


Criterio de éxito:

Permitir venta automática del servicio.


Estado:
Pendiente


---


## BACK-035

### Métricas de negocio

Prioridad:
P1

Sprint:
Sprint 5


Descripción:

Crear indicadores para medir crecimiento.


Métricas:

- Comunidades activas.
- Jugadores registrados.
- Encuentros mensuales.
- Retención.
- Conversión a pago.


Criterio de éxito:

Tomar decisiones comerciales basadas en datos.


Estado:
Pendiente


---