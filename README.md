# Club de Squash Linares

Aplicación web instalable para gestionar varios torneos del club: administración, inscripción temporal, grupos, calendario, resultados y avisos en la app y por correo.

## Probar en tu Mac y aprobar versiones

Consulta [la guía de desarrollo en Mac](docs/desarrollo-en-mac.md) para clonar el repositorio, arrancar la app, revisar correos de prueba y probar desde el móvil.

La versión de desarrollo actual está en [VERSION](VERSION). El [CHANGELOG](CHANGELOG.md) recoge las correcciones y mejoras. Los cambios pendientes se anotan en **Sin publicar**; la versión se incrementa y los cambios se suben únicamente tras el visto bueno explícito del propietario. Subir a GitHub y desplegar la aplicación requieren decisiones separadas.

## Tecnología y alcance

Next.js 16, React 19 y TypeScript para interfaz y API; PostgreSQL 17 para persistencia. Docker Compose ejecuta PostgreSQL y Mailpit (buzón de pruebas); Node.js 24 ejecuta la aplicación. El lockfile fija las dependencias.

Cada torneo tiene fecha orientativa de inicio, intervalo de jornadas, límite de recuperación y juegos para ganar. El formato implementado es todos contra todos a una vuelta. La puntuación de clasificación y los desempates siguen pendientes de confirmación y no se calculan.

## Arranque recomendado: solo Docker Desktop

Desde la carpeta del código, con Docker Desktop abierto:

```sh
docker compose up --build -d --wait
```

Abre `http://localhost:3000` en tu Mac y pulsa **Configurar mi club** para crear el primer administrador desde el navegador. Después se cierra ese alta inicial. No hacen falta Node.js en el Mac, `.env.local` ni comandos manuales de preparación. Los correos de prueba se ven en `http://localhost:8025`.

El código está montado en el contenedor y se actualiza al editar. `docker compose stop` detiene los servicios y conserva los datos; `docker compose up -d --wait` los reinicia. La configuración Compose es de desarrollo, con acceso local por defecto. FIRST_ADMIN_SETUP se habilita únicamente en esa configuración; en un despliegue público debe permanecer deshabilitado y el primer administrador se crea por el procedimiento controlado de la terminal.

El Dockerfile permite aportar opcionalmente una CA de confianza mediante el secret de construcción `trusted_ca` para redes con proxy HTTPS. Esto mantiene la verificación TLS; no es necesario en una red normal del Mac. La configuración específica del proxy del entorno de Codex se guarda fuera del repositorio.

## Arranque alternativo con Node.js local

Desde la raíz del repositorio:

```sh
npm ci
# Solo si no existe: cp .env.example .env.local
docker compose up -d --wait db mail
npm run db:setup
npm run admin:create
npm run dev
```

`admin:create` solicita nombre, correo y contraseña con entrada oculta en una terminal interactiva. No hay cuentas ni contraseñas administrativas predeterminadas. El arranque Docker permite hacerlo directamente desde la pantalla de primer acceso; este comando es una alternativa. También acepta ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD mediante variables inyectadas de forma segura; no las escribas en el repositorio ni en comandos guardados. La contraseña se almacena con scrypt y sal aleatoria. Los demás administradores se crean desde el panel de administración; todos gestionan los torneos del club. No hay recuperación automática de contraseñas todavía.

En el entorno de Codex, `bash scripts/cloud-install.sh` construye y arranca los tres servicios. Si el entorno aporta una CA de proxy, genera un override externo al repositorio para que Docker confíe en ella durante instalación y ejecución. No crea cuentas automáticamente; el primer administrador se configura desde el navegador con el modo local de Compose.

`APP_URL` debe coincidir con el origen desde el que se abre la app. En desarrollo es `http://localhost:3000`. Las solicitudes de escritura requieren ese Origin; una URL diferente exige ajustar APP_URL y reiniciar. Los enlaces y correos se generan con ese origen. La caducidad se guarda como un instante UTC y se comprueba en el servidor; las fechas de jornadas son fechas de calendario. Los formularios datetime-local utilizan la hora del dispositivo y los avisos de inscripción muestran la hora de Madrid.

## Flujo

1. Un administrador crea un torneo y genera el enlace de inscripción con caducidad. Regenerarlo revoca el anterior; también puede cerrarlo manualmente.
2. El enlace abre `/inscripcion/<token>` en el móvil sin exigir sesión previa. El jugador proporciona nombre, correo, contraseña y condición de socio. Una cuenta existente se reutiliza al verificar su contraseña. Cada cuenta puede participar en varios torneos sin perder su historial.
3. La administración revisa los jugadores, confirma su condición de socio, crea grupos con capacidad configurable y asigna participantes. Se puede desactivar una inscripción antes de publicar.
4. Se generan cruces únicos de todos contra todos, sin doble partido por jornada. Los grupos impares tienen un descanso por jugador. La generación comprueba que todos estén asignados y que las fechas quepan en el torneo. Cambiar jugadores, fechas o grupos invalida el calendario provisional; se debe regenerar.
5. Al publicar se fijan los grupos, se cierra la inscripción y se crean avisos individuales en la app y correos con grupo, rivales, fechas y acceso al área personal. Los correos fallidos quedan pendientes y se pueden reintentar sin reenviar los marcados como enviados. Como en otros sistemas de correo, un fallo entre el envío y la confirmación en base de datos puede producir un duplicado al reintentar.
6. El jugador entra directamente en `/jugador`, consulta sus torneos y cruces, ve sus descansos y registra el marcador para finalizar un partido. Solo los participantes o un administrador pueden hacerlo; dos envíos simultáneos no sobrescriben el resultado. Solo un administrador puede corregir un resultado y se conserva auditoría. La condición de socio sigue siendo editable después de publicar.

## Correo y avisos

El desarrollo usa Mailpit en SMTP local (puerto 1025) y buzón local (8025). Captura mensajes; no envía a destinatarios reales. Las pruebas únicamente usan direcciones `example.test` y eliminan sus usuarios y torneos al terminar. Los avisos internos aparecen en `/avisos` y se marcan como leídos. Son avisos al abrir la app, no notificaciones push del sistema operativo.

Para enviar correo real, configura un proveedor SMTP: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_FROM y, si requiere autenticación, SMTP_USER y SMTP_PASSWORD mediante secretos/variables seguros de tu alojamiento. `SMTP_SECURE=true` corresponde a TLS implícito (habitualmente 465); en 587 se negocia STARTTLS. No se desactiva la verificación TLS. Configura también APP_URL con el dominio público y HTTPS. No uses las credenciales de PostgreSQL de ejemplo en producción.

## Móvil

La interfaz es responsive y tiene manifest, iconos y service worker para instalarla desde el navegador. El enlace abre la inscripción en esta misma aplicación web. No es todavía una app nativa de las tiendas ni garantiza que el sistema operativo derive enlaces al icono ya instalado; eso requiere configurar enlaces universales/app links en una futura app nativa. No se almacenan páginas privadas, enlaces de inscripción ni respuestas de API en la caché del service worker. Necesita conexión para inscribirse y enviar resultados.

## Validación

```sh
npm test                  # 19 tests: datos históricos, cruces, descansos, fechas, resultados y contraseñas
npm run typecheck
npm run build
npm run test:workflow     # con el servidor y Docker activos
# Opcional, navegador móvil:
npx playwright install chromium --only-shell
npm run test:mobile
# Primer acceso: solo en una base de desarrollo sin administradores, FIRST_ADMIN_SETUP=true
npm run test:first-run
```

En Codex se usa `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` para la instalación y prueba móvil. La prueba completa crea usuarios y dos torneos temporales, comprueba permisos, CSRF, expiración, revocación, cupos, cruces, resultados simultáneos, auditoría, avisos y correos capturados. Con `--browser` recorre la inscripción y el acceso con viewport móvil y registra un resultado mediante la interfaz. Si TEST_BASE_URL se cambia, APP_URL debe coincidir. Solo ejecutar estas pruebas contra un entorno de desarrollo.

`GET /api/health` verifica PostgreSQL. `/api/club/setup` permite crear el primer administrador solo si FIRST_ADMIN_SETUP=true y aún no hay ninguno; un bloqueo transaccional impide altas administrativas iniciales simultáneas. Las APIs bajo `/api/club` requieren sesión salvo sesión actual, acceso y enlace de inscripción. Cookies HttpOnly y SameSite, sesiones con caducidad y tokens almacenados como hashes; consultas parametrizadas y límites de intentos para acceso/registro. Los jugadores no reciben correos de sus rivales. El esquema nuevo se guarda en `db/001-club.sql`; las tablas originales del calendario se conservan.

## Calendario histórico

El PDF original permanece en `data/tournament.json` y puede consultarse en `/archivo`. No se inventan cuentas para esos jugadores ni se atribuyen resultados. Contiene 25 jugadores y 92 partidos. En el grupo 3 permanecen las dos duplicidades y las dos ausencias pendientes de la organización; esta información no se modifica al generar nuevos torneos.

## Entorno y siguientes pasos

Usa el checkout existente: cada tarea está aislada y no necesita otro worktree. Reinicia los servicios en cada máquina; no se presupone que procesos ni volúmenes Docker sobrevivan. `db:setup` es repetible y no borra datos existentes. Para un despliegue real, usa persistencia y copias de seguridad gestionadas, HTTPS y proveedor de correo. Quedan por concretar las reglas de clasificación y el despliegue público; recuperación automática de contraseñas, verificación de correo y app nativa no forman parte de esta versión.
