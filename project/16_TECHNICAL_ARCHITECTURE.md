# TECHNICAL ARCHITECTURE

Versión: 1.0

Estado: Documento rector técnico

Última actualización: Agosto 2026


# 1. OBJETIVO

Diseñar una arquitectura tecnológica que permita construir, operar y escalar la plataforma de forma independiente.

La arquitectura debe permitir:

• Android.
• iOS.
• Web.
• Backend/API.
• PostgreSQL.
• IA.
• Notificaciones.
• Integraciones externas.

Debe minimizar:

• costos;
• dependencia de proveedores;
• complejidad;
• necesidad de infraestructura propia durante las primeras etapas.


# 2. PRINCIPIO FUNDAMENTAL

El código y los datos son nuestros.

Un proveedor externo puede prestar infraestructura.

Pero ningún proveedor debe ser indispensable para que la empresa pueda continuar.

Debemos poder cambiar:

• hosting;
• proveedor de base de datos;
• proveedor de IA;
• proveedor de autenticación;
• proveedor de notificaciones;

sin reconstruir todo el producto.


# 3. ARQUITECTURA GENERAL

La plataforma estará compuesta por:

                    USUARIOS
                       │
          ┌────────────┼────────────┐
          │            │            │
       Android        iOS          Web
          │            │            │
          └────────────┼────────────┘
                       │
                    API/BFF
                       │
              ┌────────┴────────┐
              │                 │
          PostgreSQL         Servicios
              │                 │
      ┌───────┼───────┐     ┌───┴────┐
      │       │       │     │        │
    Datos   Ranking  Pagos  IA    Notificaciones
                              │
                           PARRYN


# 4. CLIENTE MÓVIL

La aplicación móvil deberá utilizar una arquitectura multiplataforma.

Objetivo:

Un único código base para Android e iOS siempre que sea técnicamente razonable.

Tecnología candidata:

React Native + Expo.

Motivos:

• permite Android e iOS;
• ecosistema maduro;
• reutilización de lógica;
• integración con APIs;
• posibilidad de utilizar capacidades nativas;
• menor costo de mantenimiento que dos aplicaciones independientes.

La decisión definitiva deberá validarse mediante un pequeño prototipo antes de comenzar el desarrollo completo.


# 5. WEB

La plataforma web se utilizará principalmente para:

• administración;
• configuración;
• estadísticas;
• gestión de comunidades;
• soporte;
• operaciones administrativas.

Tecnología candidata:

React + TypeScript.

Framework candidato:

Next.js.

La aplicación web y móvil compartirán:

• modelos;
• tipos;
• reglas de negocio;
• API.

No compartirán necesariamente la misma interfaz.


# 6. BACKEND

El backend será el núcleo de la plataforma.

Tecnología:

Node.js

Lenguaje:

TypeScript

Framework:

Express inicialmente.

La prioridad es mantener una arquitectura simple.

No se utilizarán microservicios durante V1.

La arquitectura será:

MODULAR MONOLITH.

Esto significa:

un backend.

múltiples módulos internos.

Separación clara de responsabilidades.


# 7. MÓDULOS DEL BACKEND

La estructura conceptual será:

/auth

/communities

/users

/players

/sports

/encounters

/matches

/rankings

/elo

/statistics

/payments

/notifications

/ai

/admin

Cada módulo deberá tener:

• rutas;
• lógica de negocio;
• validaciones;
• acceso a datos.

Los módulos no deberán depender directamente de tablas pertenecientes a otros módulos cuando exista una alternativa de servicio.


# 8. BASE DE DATOS

Motor:

PostgreSQL.

Será la base de datos principal.

Razones:

• estándar;
• open source;
• ampliamente soportado;
• portable;
• escalable;
• bajo costo;
• múltiples proveedores compatibles.

La base de datos NO estará vinculada permanentemente a un proveedor específico.


# 9. ORM

Se podrá continuar utilizando Drizzle ORM si demuestra ser estable y conveniente.

No se cambiará de ORM solamente por cambiar de plataforma.

La prioridad es:

estabilidad > moda tecnológica.


# 10. IDENTIDAD Y AUTENTICACIÓN

La autenticación deberá abstraerse del proveedor.

El sistema debe trabajar conceptualmente con:

User

Community

Membership

Player

Role

Session

Nunca debe depender de lógica exclusiva de un proveedor externo.


# 11. MODELO MULTI-COMUNIDAD

Este es uno de los componentes más importantes de toda la arquitectura.

Todo dato perteneciente a una comunidad deberá poder determinar inequívocamente:

communityId

Ejemplos:

Player

communityId


Encounter

communityId


Match

communityId


Payment

communityId


Ranking

communityId


Todas las consultas deberán respetar ese aislamiento.

No se utilizará:

user?.communityId

como filtro opcional para decidir si filtrar o no.

El contexto de comunidad debe ser obligatorio cuando corresponda.


# 12. REGLA DE AISLAMIENTO

Un usuario pertenece a una o más comunidades.

Cada operación deberá determinar:

1. quién es el usuario;
2. qué comunidad está utilizando;
3. qué rol posee;
4. si tiene autorización;
5. si el recurso pertenece a esa comunidad.

La seguridad deberá existir en backend.

Nunca dependerá exclusivamente del frontend.


# 13. IDENTIFICADORES

Las entidades principales utilizarán identificadores únicos.

Preferencia:

UUID.

Esto evita depender de IDs secuenciales expuestos públicamente y facilita futuras migraciones.


# 14. VALIDACIÓN

Toda entrada proveniente del usuario deberá validarse.

Tecnología candidata:

Zod.

La API no confiará en:

• frontend;
• headers enviados por usuario;
• clubId enviado en body;
• roles enviados por frontend.

Los datos sensibles deberán derivarse del contexto autenticado.


# 15. API

La API será REST inicialmente.

Objetivo:

simplicidad.

Ejemplos:

GET /communities/:id

GET /players

POST /encounters

GET /encounters/:id

POST /encounters/:id/rsvp

POST /matches

POST /matches/:id/result

POST /matches/:id/confirm

GET /ranking


# 16. VERSIONADO

La API deberá poder versionarse.

Formato:

/api/v1/

No se realizarán cambios incompatibles sin una estrategia de migración.


# 17. FRONTEND Y BACKEND

Nunca se debe colocar lógica crítica exclusivamente en frontend.

Ejemplos:

Incorrecto:

"El frontend decide si el usuario puede modificar un partido."

Correcto:

"El backend verifica identidad, comunidad, rol y propiedad del partido."


# 18. IA — PARRYN

Parryn será un módulo independiente.

La aplicación NO deberá depender de una IA para funcionar.

La IA será una capa adicional.

Arquitectura:

Usuario

↓

API

↓

Context Builder

↓

LLM

↓

Respuesta

El modelo de IA no tendrá acceso directo e ilimitado a PostgreSQL.

Parryn recibirá únicamente el contexto necesario.


# 19. PROVEEDOR DE IA

La plataforma deberá utilizar una capa de abstracción.

Conceptualmente:

AIProvider

Implementaciones:

OpenAI

Otro proveedor

Modelo local/futuro

Así podremos cambiar de proveedor sin modificar toda la aplicación.


# 20. IA Y COSTOS

No utilizaremos IA para tareas que no necesiten IA.

Ejemplo:

"¿A qué hora jugamos?"

NO necesita necesariamente un LLM.

Puede resolverse mediante datos estructurados.

Parryn utilizará IA cuando aporte verdadero valor.

Esto reducirá costos.


# 21. NOTIFICACIONES

La plataforma tendrá un servicio de notificaciones abstracto.

Conceptualmente:

NotificationService

Implementaciones:

Push

Email

WhatsApp

SMS

No se deberá construir toda la lógica directamente contra un único proveedor.


# 22. WHATSAPP

WhatsApp será una integración.

Nunca será la base del sistema.

La plataforma debe funcionar aunque WhatsApp no esté disponible.


# 23. PAGOS

Los pagos deberán mantenerse separados del núcleo deportivo.

El sistema debe registrar:

• gasto;
• participante;
• monto;
• estado.

Las futuras integraciones de pago deberán utilizar proveedores externos mediante una capa de integración.


# 24. ARCHIVOS

Fotos:

• avatar;
• logo;
• imágenes de comunidad.

No deberán almacenarse directamente dentro de PostgreSQL.

Se utilizará almacenamiento de objetos.

Proveedor inicial podrá ser:

S3 compatible.

Esto permite migrar entre proveedores.


# 25. BACKUPS

La base de datos deberá tener:

• backup automático;
• backup periódico externo;
• posibilidad de restauración.

Un backup no es backup hasta que se haya probado su restauración.


# 26. OBSERVABILIDAD

La plataforma deberá registrar:

• errores;
• autenticaciones;
• operaciones importantes;
• fallos de API;
• eventos críticos.

No se deberán registrar:

• contraseñas;
• tokens;
• información sensible innecesaria.


# 27. SEGURIDAD

Mínimos obligatorios:

• HTTPS;
• autenticación;
• autorización;
• aislamiento por comunidad;
• validación de inputs;
• protección contra abuso;
• rate limiting;
• logs;
• backups;
• gestión segura de secretos.

Nunca:

• claves en código;
• claves en Git;
• contraseñas en logs.


# 28. SECRETOS

Las variables sensibles estarán exclusivamente en variables de entorno o secret manager.

Ejemplos:

DATABASE_URL

JWT_SECRET

AI_API_KEY

EMAIL_API_KEY

WHATSAPP_API_KEY


# 29. REPOSITORIO

El código fuente deberá estar almacenado en un repositorio Git controlado por nosotros.

Objetivo:

El proyecto debe poder clonarse y ejecutarse sin depender de Replit.


# 30. INFRAESTRUCTURA INICIAL

Durante V1 se priorizará infraestructura administrada.

No compraremos servidores físicos.

No mantendremos infraestructura innecesaria.

La prioridad será:

bajo costo + simplicidad + posibilidad de migración.


# 31. ENTORNOS

Mínimo:

Development

Staging

Production

No se debe probar código experimental directamente en producción.


# 32. CI/CD

El proyecto deberá poder:

• ejecutar tests;
• verificar TypeScript;
• construir;
• desplegar.

Idealmente mediante CI/CD automático.

El objetivo es que un cambio pase por:

Git

↓

Tests

↓

Build

↓

Staging

↓

Production


# 33. TESTING

Mínimos:

• tests de reglas críticas;
• tests de autorización;
• tests de aislamiento;
• tests de ranking/Elo;
• tests de generación de partidos.

La seguridad multi-comunidad tendrá tests obligatorios.


# 34. MIGRACIONES

Todas las modificaciones de base de datos deberán realizarse mediante migraciones versionadas.

Nunca:

"editar producción manualmente".

Cada cambio debe ser reproducible.


# 35. DOMINIO

La empresa deberá ser propietaria del dominio.

El dominio no dependerá de una plataforma de desarrollo.

La infraestructura podrá cambiar.

El dominio permanece.


# 36. INDEPENDENCIA DE REPLIT

Replit puede continuar utilizándose durante la transición.

Pero no será la arquitectura definitiva.

El objetivo es poder eliminar Replit sin perder:

• código;
• base de datos;
• usuarios;
• archivos;
• configuración;
• historial.


# 37. ESTRATEGIA DE SALIDA DE REPLIT

NO se realizará una migración traumática.

Se hará en etapas.

ETAPA 1

Respaldar código.

↓

ETAPA 2

Respaldar base de datos.

↓

ETAPA 3

Documentar variables de entorno.

↓

ETAPA 4

Reproducir desarrollo localmente.

↓

ETAPA 5

Crear entorno staging independiente.

↓

ETAPA 6

Probar aplicación.

↓

ETAPA 7

Migrar producción.

↓

ETAPA 8

Mantener Replit temporalmente como respaldo.

↓

ETAPA 9

Eliminar dependencia.


# 38. REUTILIZACIÓN DEL PROYECTO ACTUAL

Antes de reescribir:

Se evaluará cada componente.

Clasificación:

REUTILIZAR

REFACTORIZAR

MIGRAR

REESCRIBIR

ELIMINAR


# 39. LO QUE NO HAREMOS

No:

• reescribir todo por estética;
• cambiar tecnologías sin necesidad;
• crear microservicios;
• introducir Kubernetes;
• construir infraestructura compleja;
• pagar servicios innecesarios;
• utilizar IA para todo;
• depender de un proveedor único.


# 40. ARQUITECTURA EVOLUTIVA

V1:

Modular Monolith

+

PostgreSQL

+

React Native

+

Web React/Next

+

Servicios externos desacoplados


V2:

Escalar solamente los módulos que realmente lo necesiten.

No se dividirá un monolito en microservicios hasta que exista una razón concreta.


# 41. ESCALABILIDAD

La arquitectura deberá soportar inicialmente:

• cientos de comunidades;
• miles de jugadores;
• decenas de miles de partidos.

Si el producto alcanza niveles superiores:

se escala infraestructura.

No se sobrediseñará V1.


# 42. COSTO COMO RESTRICCIÓN

Toda decisión tecnológica deberá considerar:

Costo mensual.

Costo de migración.

Costo de mantenimiento.

Costo de dependencia.

Costo de escalamiento.

La opción más barata no siempre es la mejor.

La opción correcta es:

menor costo total manteniendo calidad y control.


# 43. PRINCIPIO DE PORTABILIDAD

Preferiremos:

• PostgreSQL;
• TypeScript;
• REST;
• S3 compatible;
• Git;
• tecnologías open source.

Evitar:

• formatos propietarios innecesarios;
• bases de datos no portables;
• lógica crítica dentro de proveedores;
• servicios que hagan imposible migrar.


# 44. ARQUITECTURA DEFINITIVA CONCEPTUAL

                ┌──────────────────────┐
                │      USUARIOS        │
                └──────────┬───────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
          Android         iOS          Web
              │            │            │
              └────────────┼────────────┘
                           │
                       API / V1
                           │
                  ┌────────┴────────┐
                  │                 │
             BUSINESS            AUTH
              LOGIC             / RBAC
                  │                 │
                  └────────┬────────┘
                           │
                      PostgreSQL
                           │
        ┌──────────┬───────┼───────┬──────────┐
        │          │       │       │          │
    Encounters   Matches  Elo   Payments   Stats
        │          │       │       │          │
        └──────────┴───────┼───────┴──────────┘
                           │
                       SERVICES
                           │
              ┌────────────┼────────────┐
              │            │            │
            PARRYN    Notifications   Storage


# 45. PRINCIPIO FINAL

La tecnología existe para servir al producto.

No construiremos una arquitectura impresionante.

Construiremos una arquitectura:

• simple;
• segura;
• portable;
• mantenible;
• económica;
• escalable.

Y, sobre todo:

propiedad nuestra.


# 46. DECISIÓN PENDIENTE

Antes de comenzar una reconstrucción importante se deberá realizar:

AUDITORÍA TÉCNICA DEL PROYECTO ACTUAL.

Debe determinar:

• qué código sirve;
• qué código está roto;
• qué código puede migrarse;
• qué tablas pueden conservarse;
• qué datos existen realmente;
• qué dependencias existen;
• qué deuda técnica existe;
• cuánto cuesta rescatar;
• cuánto cuesta reconstruir.

Solo después se decidirá:

REUTILIZAR

vs.

MIGRAR

vs.

RECONSTRUIR.


# 47. REGLA DE ORO

Nunca volveremos a estar atrapados porque una plataforma externa agotó sus créditos.

La plataforma debe poder seguir desarrollándose:

• desde nuestro computador;
• desde otro proveedor;
• desde otro hosting;
• con otra IA;
• con otra herramienta.

El proveedor nos ayuda.

El proveedor no es dueño de nuestro futuro.