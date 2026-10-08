# Infraestructura del Club de Squash Linares

La infraestructura Docker se mantiene en esta carpeta. El código de la aplicación permanece fuera de ella y se utiliza como contexto de construcción.

```text
deploy/
├── compose.yaml                 # Proyecto principal: squashlinares
├── stacks/
│   ├── app/
│   │   ├── compose.yaml         # Web y API
│   │   └── Dockerfile
│   ├── database/
│   │   └── compose.yaml         # PostgreSQL y su volumen persistente
│   └── mail/
│       └── compose.yaml         # Mailpit para correo de pruebas
└── scripts/
    ├── docker-start.sh          # Dependencias, esquema y arranque de la app
    └── cloud-install.sh         # Arranque en Codex con CA del proxy, si existe
```

## Un único proyecto con componentes incluidos

`deploy/compose.yaml` incluye los tres Compose hijos mediante `include`. Docker Compose 2.20.3 o posterior es necesario. Docker Desktop actualizado lo incorpora.

Docker Desktop muestra **un único proyecto `squashlinares` con tres servicios**. Los hijos son componentes de configuración; Compose no crea proyectos ni agrupaciones visuales anidados. Se arranca siempre el principal, para que dependencias, red y volúmenes pertenezcan al mismo proyecto.

Todos los servicios comparten la red predeterminada `squashlinares_default`, creada por Compose. Se descubren por el nombre de servicio:

| Desde la app | Destino interno | Uso |
| --- | --- | --- |
| PostgreSQL | `db:5432` | Base de datos |
| Mailpit SMTP | `mail:1025` | Captura de correos |
| Mailpit HTTP | `http://mail:8025` | Verificación de correos en desarrollo |

Dentro de un contenedor `localhost` es ese mismo contenedor. Para comunicarse con otro se usa su nombre de servicio. Los puertos publicados en el Mac permiten acceso desde el ordenador; la comunicación interna no depende de ellos.

## Arranque y operación

Desde la raíz del repositorio:

```sh
docker compose -f deploy/compose.yaml up --build -d --wait
docker compose -f deploy/compose.yaml ps
docker compose -f deploy/compose.yaml logs --tail=100 app
docker compose -f deploy/compose.yaml stop
```

También se puede ejecutar desde `deploy/` sin `-f`, o usar `docker compose up --build -d --wait` desde la raíz: su `compose.yaml` es únicamente un punto de entrada al principal. Las rutas de construcción y montaje se resuelven respecto al archivo de cada componente; no requieren mover el código a `deploy/`.

Se conserva el nombre del proyecto y los volúmenes `squashlinares_postgres_data`, `squashlinares_app_dependencies` y `squashlinares_app_next` de la versión anterior. No se borran ni se crean volúmenes alternativos por cambiar de punto de entrada. `down -v` elimina los datos; para detener conserva los volúmenes con `stop`.

La app espera a que PostgreSQL esté saludable y comprueba su API antes de completar `--wait`. Usa `APP_URL` y `APP_BIND_IP` para ajustar el origen y el acceso desde la red local, como explica [la guía para Mac](../docs/desarrollo-en-mac.md). Para una configuración local en `.env`, utiliza un único archivo en la raíz y pásalo explícitamente si arrancas desde `deploy/`:

```sh
docker compose --env-file ../.env up --build -d --wait
```

El script de Codex usa un override externo `/workspace/squash-cloud-compose.yaml` para añadir la CA del proxy a la app, sin versionar certificados ni desactivar TLS. Ese override se aplica al proyecto principal, después de incluir los componentes.

## Alcance del despliegue actual

Este stack está preparado para **desarrollo en Docker Desktop**: código montado, servidor con recarga, credenciales locales y Mailpit. Mailpit captura los correos y no los envía a los jugadores.

Un despliegue público requiere una configuración de producción con compilación y arranque de producción, dominio HTTPS, credenciales privadas, correo real y copias de seguridad. La división en componentes permite preparar esa configuración sin mezclarla con el código de la app. El despliegue público se acordará por separado; este cambio no lo ejecuta.
