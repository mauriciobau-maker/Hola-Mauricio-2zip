# 05 — Decisions (ADR)

- **Creado:** 2026-08-03
- **Última actualización:** 2026-08-03

## Propósito

Registro histórico de decisiones de arquitectura y negocio (Architecture Decision Records). Cada entrada documenta qué se decidió, por qué se eligió esa opción sobre las alternativas, y cuáles son las consecuencias conocidas. Permite entender el "por qué" del sistema cuando el equipo crece o cambia.
# Decisiones del Producto y Arquitectura

Versión: 1.0

Estado: Activo

---

# DEC-001

## Usuario y Deportista son entidades separadas

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

El sistema diferenciará entre:

Usuario:
Persona que tiene acceso a la aplicación.

Deportista:
Persona que participa en actividades deportivas dentro de una comunidad.

Motivo:

Un usuario puede administrar una comunidad sin necesariamente participar como jugador.

Además, una misma persona puede pertenecer a múltiples comunidades deportivas.

Ejemplo:

Cristian puede ser:

Usuario administrador en una comunidad.

Jugador en otra comunidad.

Jugador y administrador en otra.

---

# DEC-002

## Un usuario puede pertenecer a múltiples comunidades

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

El registro del usuario será único.

El usuario no deberá crear cuentas diferentes para cada comunidad.

Ejemplo:

Cristian pertenece a:

- Los Parry Padel.
- Ciudad del Valle.
- Otra comunidad deportiva.

Desde la misma cuenta puede acceder a todas.

Motivo:

El crecimiento del producto dependerá del boca a boca entre comunidades.

Un deportista debe poder llevar la aplicación consigo a todos sus grupos deportivos.

---

# DEC-003

## Comunidad privada por defecto

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Las comunidades serán privadas.

El ingreso será mediante:

- Código de invitación.
- Enlace.
- WhatsApp.
- Email.

Motivo:

Las comunidades deportivas normalmente son grupos cerrados.

La privacidad aumenta la confianza y evita exposición innecesaria.

---

# DEC-004

## La IA propone, el humano decide

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

La inteligencia artificial será un asistente.

Nunca reemplazará la decisión del organizador.

Ejemplos:

La IA puede sugerir:

- Parejas.
- Partidos.
- Ajustes.
- Mejoras.

Pero el organizador tiene la decisión final.

Motivo:

La organización deportiva tiene un componente humano que debe mantenerse.

# DEC-005

## Concepto de Comunidad, no Club

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

La entidad principal del sistema será una Comunidad Deportiva.

El concepto Club podrá existir en el futuro como una categoría especial, pero no será la estructura base.

Motivo:

Muchas organizaciones deportivas no son clubes formales.

Ejemplos:

- Grupo de amigos de pádel.
- Comunidad de tenis.
- Grupo amateur de fútbol.
- Empresas que organizan actividades deportivas.

La aplicación debe adaptarse a comunidades reales, no obligar a una estructura formal.


---

# DEC-006

## Arquitectura multideporte desde el inicio

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

La plataforma será diseñada como un sistema deportivo general.

El primer deporte será pádel, pero la arquitectura debe permitir incorporar:

- Pádel.
- Tenis.
- Fútbol.
- Otros deportes futuros.

Motivo:

Un deportista puede participar en diferentes deportes y comunidades.

La lógica del producto debe ser deportiva, no únicamente padelística.


---

# DEC-007

## Los deportes disponibles serán controlados por Super Administrador

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Los administradores de comunidades no crean nuevos deportes.

El Super Administrador define qué deportes están disponibles según:

- Plan contratado.
- Estrategia comercial.
- Evolución del producto.

Motivo:

Permite controlar crecimiento, calidad y monetización.


---

# DEC-008

## Posiciones y características deportivas son específicas por deporte

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

El perfil deportivo debe permitir características propias de cada deporte.

Ejemplos:

Pádel:
- Derecha.
- Revés.
- Ambas posiciones.

Fútbol:
- Arquero.
- Defensa.
- Mediocampo.
- Delantero.

Tenis:
- Tipo de juego.
- Preferencias.

Motivo:

Estas características permitirán mejorar la generación automática de encuentros y recomendaciones IA.


---

# DEC-009

## Un jugador puede organizar encuentros puntuales

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Cualquier jugador podrá crear un encuentro.

Al crear un encuentro será automáticamente:

Organizador de ese encuentro.

Este rol no será permanente.

Motivo:

Reduce la dependencia de un administrador único y facilita la creación espontánea de actividades.


---

# DEC-010

## El organizador mantiene control sobre la IA

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

La IA puede recomendar:

- Parejas.
- Formatos.
- Distribución de partidos.
- Ajustes.

Pero el organizador siempre puede modificar o aceptar la propuesta.

Motivo:

La experiencia deportiva requiere flexibilidad humana.

# DEC-011

## Ciclo de vida del encuentro

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Todo encuentro tendrá un ciclo de vida definido.

Estados:

Borrador

↓

Abierto

↓

Completo

↓

En juego

↓

Resultado pendiente

↓

Confirmado

↓

Cerrado

↓

Cancelado


Descripción:

Borrador:
Encuentro creado pero aún no publicado.

Abierto:
Los jugadores pueden inscribirse.

Completo:
Los cupos fueron llenados.

En juego:
El encuentro llegó a su fecha y hora programada.

Resultado pendiente:
Existe un partido terminado sin resultado confirmado.

Confirmado:
Los resultados fueron validados.

Cerrado:
Estadísticas, historial y ranking fueron actualizados.


Motivo:

Permite automatizar procesos y entregar claridad al organizador.


---

# DEC-012

## Gestión automática de lista de espera

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Cuando un encuentro esté completo, nuevos jugadores podrán ingresar a una lista de espera ordenada.

Si un jugador confirmado cancela:

El primer jugador de la lista recibe automáticamente la oportunidad de ocupar el cupo.

Debe recibir una notificación:

"Se liberó un cupo para este encuentro. ¿Quieres participar?"

Opciones:

Confirmar.

Rechazar.


Motivo:

Evita que el organizador tenga que administrar manualmente reemplazos.


---

# DEC-013

## Confirmación de asistencia

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Cada jugador podrá responder:

- Confirmo.
- No puedo.
- Pendiente.

El organizador podrá visualizar:

- Confirmados.
- Rechazados.
- Pendientes.
- Lista de espera.


Motivo:

Reemplaza la gestión manual por WhatsApp.


---

# DEC-014

## Registro y confirmación de resultados

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Cualquier participante del partido puede registrar el resultado.

Ejemplo:

Jugador registra:

Equipo A:
6-4
6-3

El sistema solicita confirmación.

La confirmación debe realizarla al menos un jugador del equipo rival.

Una vez confirmado:

- Se actualiza resultado.
- Se actualiza historial.
- Se actualizan estadísticas.
- Se procesa ranking.


Motivo:

Equilibra facilidad de uso con protección contra errores o manipulación.


---

# DEC-015

## Resultados solo afectan ranking cuando están confirmados

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Un partido pendiente no modifica:

- ELO.
- Estadísticas oficiales.
- Ranking.

Solo los partidos confirmados tienen impacto deportivo.

Motivo:

Mantener justicia y evitar resultados incorrectos.

# DEC-016

## Ranking separado por comunidad

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

El ranking de un jugador será independiente en cada comunidad.

Ejemplo:

Cristian puede tener:

Los Parry Padel:
ELO 1600

Ciudad del Valle:
ELO 1450


Motivo:

El nivel de un jugador puede variar según la comunidad y los rivales habituales.


---

# DEC-017

## Ranking separado por deporte

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Cada deporte tendrá su propio sistema de ranking.

Ejemplo:

Cristian:

Pádel:
ELO 1600

Tenis:
ELO 1500

Fútbol:
Categoría diferente según deporte.


Motivo:

No es comparable el rendimiento entre deportes distintos.


---

# DEC-018

## El ELO oficial se actualiza al cerrar el encuentro

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Los resultados individuales pueden registrarse durante el encuentro.

Pero el ELO oficial se actualiza cuando:

- Todos los partidos están confirmados.
- El encuentro finalizó.
- El sistema procesa los resultados.


Motivo:

Evita rankings cambiando mientras el encuentro todavía está activo.


---

# DEC-019

## La IA deportiva debe adaptarse a cada deporte

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

La inteligencia artificial no estará diseñada solamente para pádel.

Debe considerar características específicas:

Pádel:

- Mano dominante.
- Posición derecha/revés.
- Nivel.
- Compatibilidad de parejas.

Fútbol:

- Posición.
- Condición física.
- Preferencias.

Tenis:

- Estilo de juego.
- Nivel.
- Preferencias.


Motivo:

La plataforma debe ser deportiva, no una aplicación de pádel ampliada.


---

# DEC-020

## La IA recomienda, no reemplaza reglas deportivas

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

La IA podrá sugerir:

- Parejas equilibradas.
- Distribución de jugadores.
- Formatos.
- Ajustes.

Pero siempre existirá posibilidad de modificación manual.


Motivo:

Los deportes tienen factores humanos que no siempre pueden calcularse.

# DEC-021

## Monetización basada en crecimiento, no bloqueo

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Las funciones principales del producto no deben bloquearse artificialmente.

La monetización debe basarse en:

- Cantidad de jugadores.
- Cantidad de deportes.
- Tamaño de comunidad.
- Herramientas avanzadas.
- Personalización.

Motivo:

El usuario debe experimentar el valor antes de pagar.


---

# DEC-022

## Planes definidos por capacidad

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Los planes comerciales estarán relacionados principalmente con:

- Número máximo de deportistas.
- Deportes habilitados.
- Funciones administrativas.
- Nivel de personalización.

Ejemplo inicial:

Plan Básico:

- Comunidad pequeña.
- Un deporte.
- Límite de participantes.

Plan Premium:

- Mayor cantidad de miembros.
- Más deportes.
- Funciones avanzadas.


Motivo:

El crecimiento natural de una comunidad debe impulsar la contratación.


---

# DEC-023

## Super Administrador controla la primera etapa comercial

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

Inicialmente el Super Administrador gestionará:

- Creación de comunidades.
- Activación de planes.
- Límites.
- Deportes habilitados.
- Configuración comercial.

Motivo:

Permite validar el mercado antes de automatizar ventas.


---

# DEC-024

## Creación de comunidades mediante asistente

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

La creación de comunidades evolucionará hacia un asistente guiado.

Inicialmente:

Super Administrador controla el proceso.

Futuro:

El sistema podrá ayudar mediante:

- Configuración automática.
- Recomendaciones.
- Selección de deportes.
- Configuración inicial.


Motivo:

Combinar control comercial con facilidad de crecimiento.


---

# DEC-025

## La expansión debe ser progresiva

Fecha:
Agosto 2026

Estado:
Aprobado

Decisión:

La prioridad será:

1. Tener comunidades activas.
2. Validar uso frecuente.
3. Generar primeros ingresos.
4. Mejorar automatización.
5. Escalar comercialmente.


Motivo:

El producto debe crecer basado en usuarios reales y no solamente en desarrollo.

Sistema de Rating Deportivo
Fecha: Agosto 2026
Estado: Aprobado
Versión: 1.0
1. Decisión
La plataforma no utilizará un único sistema universal de ELO.
El rendimiento deportivo se determinará mediante un Rating Engine, capaz de seleccionar el sistema de valoración apropiado según:
Comunidad.
Deporte.
Modalidad.
Tipo de competición.
Tamaño de los equipos.
El rating será una propiedad de la participación deportiva del jugador, no una propiedad universal del deportista.
2. Principio fundamental
Un deportista puede tener distintos ratings simultáneamente.
Ejemplo:
Mauricio

Comunidad A
└── Pádel / Dobles
    Rating: 1582

Comunidad A
└── Tenis / Singles
    Rating: 1510

Comunidad A
└── Tenis / Dobles
    Rating: 1478
Estos ratings no se mezclan.
3. Rating independiente por comunidad
Cada rating estará asociado obligatoriamente a una comunidad.
Conceptualmente:
Community
   +
Player
   +
Sport
   +
Modality
   =
Player Rating
Un jugador puede tener diferentes niveles en distintas comunidades.
Ejemplo:
Mauricio

Los Parry Padel
└── Pádel / Dobles
    1600

Ciudad del Valle
└── Pádel / Dobles
    1515
Esto mantiene la decisión establecida en DEC-016.
4. Rating independiente por deporte
Cada deporte tendrá su propio sistema de valoración.
Los ratings de diferentes deportes nunca se compararán directamente.
Incorrecto:
Pádel: 1600
Tenis: 1500

"El jugador es mejor en pádel."
Los valores pertenecen a sistemas deportivos diferentes.
5. Rating independiente por modalidad
Cuando un deporte tenga modalidades competitivas suficientemente diferentes, cada modalidad tendrá su propio rating.
Tenis
Tenis
├── Singles
│   └── ELO
│
└── Dobles
    └── ELO
Un jugador podría tener:
Singles: 1620
Dobles: 1485
No se utilizará automáticamente el rating de singles para calcular partidos de dobles.
6. Pádel
La modalidad principal de V1 será:
Pádel
└── Dobles
    └── 2 vs 2
El rating será individual.
La pareja no se convertirá en un jugador permanente.
Ejemplo:
Equipo A
Mauricio 1540
Pedro    1490

vs

Equipo B
Juan     1510
Carlos   1560
El Rating Engine calculará el resultado considerando la fuerza de ambos equipos.
7. Rating individual en deportes por equipos
En deportes con equipos, el sistema deberá distinguir entre:
resultado del equipo
y
rendimiento individual.
Esto es especialmente importante en fútbol.
8. Fútbol
Fútbol queda explícitamente excluido del ELO en V1.
No se utilizará ELO individual tradicional para determinar el nivel de un futbolista.
Motivo:
El resultado colectivo de un partido de fútbol no representa suficientemente el rendimiento individual.
Ejemplo:
Equipo pierde 0-3

Arquero → excelente
Defensa → regular
Mediocampo → bueno
Delantero → malo
Un simple resultado 0-3 no permite atribuir correctamente el rendimiento a cada jugador.
9. Sistema de Football Performance Rating
El fútbol utilizará posteriormente un sistema de Performance Rating.
Inicialmente podrá considerar:
resultado del equipo;
posición;
participación;
minutos jugados;
estadísticas individuales;
rendimiento;
nivel de competición.
Sin embargo:
Performance Rating de fútbol no forma parte del desarrollo prioritario de V1.
En V1 se registrarán principalmente estadísticas y resultados.
El motor podrá incorporarse posteriormente sin modificar la arquitectura general.
10. Sistemas de Rating disponibles
El Rating Engine podrá soportar diferentes estrategias.
Conceptualmente:
RatingEngine
│
├── EloSinglesStrategy
│
├── EloDoublesStrategy
│
├── TeamPerformanceStrategy
│
└── Future strategies
Esto permite incorporar posteriormente otros sistemas sin modificar el núcleo deportivo.
11. Regla de selección
El sistema determinará automáticamente la estrategia mediante:
Sport
+
Modality
+
Competition Type
Ejemplo:
Pádel + Dobles
        ↓
EloDoublesStrategy
Tenis + Singles
        ↓
EloSinglesStrategy
Tenis + Dobles
        ↓
EloDoublesStrategy
Fútbol + Equipo
        ↓
TeamPerformanceStrategy
12. La pareja es temporal
Una pareja no será considerada una entidad deportiva permanente para el rating.
Ejemplo:
Mauricio + Pedro
representa una combinación de jugadores para un partido determinado.
El rating pertenece a:
Mauricio
Pedro
individualmente.
Esto evita crear miles de ratings independientes para cada combinación de pareja.
13. Estadísticas de pareja
Aunque la pareja no tenga un rating permanente, el sistema podrá registrar estadísticas históricas.
Ejemplo:
Mauricio + Pedro

Partidos: 18
Victorias: 13
Derrotas: 5
Win Rate: 72%
Estas estadísticas serán independientes del rating individual.
Esto será especialmente útil para Parryn.
14. Historial de Rating
Todo cambio de rating deberá generar un registro histórico.
Ejemplo:
Partido #182

Mauricio

Rating anterior: 1540
Cambio: +18
Rating posterior: 1558
El historial deberá permitir reconstruir cómo evolucionó el rating.
15. Resultados pendientes
Un partido pendiente o no confirmado:
NO modifica el rating.
Solamente un resultado confirmado podrá producir cambios oficiales.
Esto mantiene DEC-015.
16. Cierre del encuentro
El rating oficial se procesará según DEC-018.
Cuando corresponda:
Partidos
   ↓
Resultados confirmados
   ↓
Encuentro finalizado
   ↓
Rating Engine
   ↓
Actualización de ratings
   ↓
Historial
   ↓
Ranking
17. El rating no será calculado por el frontend
El frontend solamente mostrará:
Rating actual
Historial
Ranking
Estadísticas
Nunca decidirá cuánto gana o pierde un jugador.
El cálculo será exclusivamente responsabilidad del backend/Rating Engine.
18. IA y Rating
Parryn podrá:
analizar ratings;
detectar tendencias;
recomendar parejas;
recomendar rivales;
detectar desequilibrios;
sugerir partidos;
explicar cambios.
Pero:
Parryn no podrá modificar directamente un rating.
El Rating Engine será la única autoridad para modificarlo.
Esto mantiene DEC-004 y DEC-020.
19. Rating vs Ranking
Se establece una diferencia conceptual:
Rating
Mide el nivel/rendimiento deportivo de un jugador.
Ejemplo:
Rating = 1582
Ranking
Ordena jugadores dentro de un contexto.
Ejemplo:
1. Mauricio — 1582
2. Pedro    — 1554
3. Juan     — 1520
El ranking es una vista del rating, no el sistema de cálculo.
20. Modelo conceptual futuro
La estructura será:
PLAYER
   │
   └── PLAYER_RATING
          │
          ├── COMMUNITY
          ├── SPORT
          ├── MODALITY
          ├── RATING_SYSTEM
          ├── CURRENT_RATING
          └── RATING_HISTORY
Esto reemplazará conceptualmente la dependencia actual de:
players.elo
como fuente universal.
21. Compatibilidad con la arquitectura técnica
Esta decisión es compatible con el documento:
TECHNICAL ARCHITECTURE
porque el Rating Engine será un módulo independiente:
/ratings
    /engine
    /strategies
    /history
    /ranking
Y podrá utilizar PostgreSQL sin depender de Replit.
22. V1 aprobada
Para evitar sobreconstrucción, V1 tendrá:
Pádel
Dobles → ELO
Tenis
Singles → ELO
Dobles → ELO independiente
Fútbol
Sin ELO
Estadísticas + resultados
Otros deportes
Se incorporarán mediante nuevas estrategias cuando exista una necesidad real.
23. Regla de evolución
Agregar un nuevo deporte no deberá obligarnos a modificar el sistema completo.
Por ejemplo, si posteriormente incorporamos:
Básquetbol
podremos definir:
Basketball
└── Team
    └── BasketballPerformanceStrategy
sin modificar:
Pádel;
Tenis;
ELO;
usuarios;
comunidades;
autenticación.
24. Decisión final
La plataforma no será un sistema de ELO.
Será una:
Plataforma deportiva con un Rating Engine extensible.

ELO será solamente uno de los sistemas de rating disponibles.
Cómo queda nuestra arquitectura después de DEC-026
                    DEPORTISTA
                         │
                    COMUNIDAD
                         │
                      DEPORTE
                         │
                     MODALIDAD
                         │
                  RATING ENGINE
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       ELO Singles   ELO Doubles   Performance
          │              │              │