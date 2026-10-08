# Probar y trabajar desde un Mac

## Levantar y listo con Docker Desktop

Solo necesitas Docker Desktop abierto y una copia del código en tu Mac. No necesitas instalar Node.js, npm ni PostgreSQL en el ordenador.

Puedes descomprimir la copia ZIP facilitada en el chat y abrir Terminal en esa carpeta. El ZIP es una copia para revisión y no contiene el historial Git; conserva cualquier carpeta donde ya hayas hecho cambios. Si ya tienes el repositorio clonado, aplica el parche de esta revisión a esa copia en lugar de sobrescribir tus archivos.

Desde la carpeta que contiene `compose.yaml`:

```sh
docker compose up --build -d --wait
```

La primera vez descarga las imágenes y dependencias; las siguientes reutilizan lo preparado. Compose espera a que la aplicación esté saludable. Si el puerto 3000 está ocupado, detén el proceso que lo utiliza antes de arrancar.

Abre **http://localhost:3000** en tu Mac. Pulsa **Configurar mi club** y crea tu cuenta administradora desde el navegador. Este paso se ofrece solo mientras no existe ningún administrador; después se utiliza el acceso normal. Los administradores adicionales se crean desde el panel.

Se levantan tres servicios:

| Servicio | Función                       | Acceso local                 |
| -------- | ----------------------------- | ---------------------------- |
| app      | Web y API, en modo desarrollo | http://localhost:3000        |
| db       | PostgreSQL persistente        | Gestionado por la aplicación |
| mail     | Buzón de correos de prueba    | http://localhost:8025        |

La aplicación prepara automáticamente el esquema y los datos históricos antes de arrancar. No hace falta crear `.env.local` ni ejecutar una instalación manual. Los correos se capturan en el buzón local y no se envían a personas reales.

## Retocar y volver a arrancar

Abre la carpeta en Visual Studio Code y edita los archivos. Docker monta el código del Mac en la aplicación y el navegador refleja los cambios. No es necesario reconstruir la imagen para editar pantallas o lógica. Si cambias dependencias, vuelve a ejecutar el comando de arranque con `--build`; el contenedor comprueba los manifiestos y actualiza su volumen de dependencias cuando hace falta.

Para parar conservando los datos:

```sh
docker compose stop
```

Para volver a arrancar:

```sh
docker compose up -d --wait
```

También puedes parar o iniciar el grupo desde Docker Desktop después del primer arranque. PostgreSQL guarda los torneos, jugadores y administradores en un volumen. El proyecto Compose tiene el nombre fijo `squashlinares`, para conservar ese volumen aunque cambie el nombre de la carpeta. No uses `docker compose down -v` para parar: eliminaría ese volumen.

Para consultar incidencias:

```sh
docker compose ps
docker compose logs --tail=100 app
```

Si quieres clonar el repositorio con Git, el comando es `git clone https://github.com/srcapicci/SquashLinares.git`. El arranque Docker está disponible en la rama `main` de GitHub desde la versión 0.2.0. También puedes descargar el ZIP con Code → Download ZIP.

## Probar desde el iPhone u otro móvil

Conecta el Mac y el móvil a la misma red wifi. Crea primero la cuenta administradora desde localhost. Busca la IP local del Mac en Ajustes del Sistema → Red → detalles de la conexión.

Si, por ejemplo, es `192.168.1.25`, reinicia el servicio con:

```sh
APP_BIND_IP=0.0.0.0 APP_URL=http://192.168.1.25:3000 docker compose up -d --wait
```

Abre **esa misma dirección** tanto en el móvil como en el Mac. APP_URL determina los enlaces y el origen permitido para escribir. Estos valores también pueden guardarse en un archivo `.env` local, excluido de Git. El contenedor sigue usando su red interna para PostgreSQL y el correo.

Esta prueba con HTTP permite revisar pantallas y registrar datos; la instalación completa de la web como app y el service worker requieren HTTPS o localhost. No equivale a publicar la aplicación para los jugadores.

Para volver al acceso exclusivo desde el Mac, sin un `.env` que cambie estos valores:

```sh
APP_BIND_IP=127.0.0.1 APP_URL=http://localhost:3000 docker compose up -d --wait
```

## Antes de dar el visto bueno

Las verificaciones se ejecutan dentro de Docker:

```sh
docker compose exec app npm test
docker compose exec app npm run typecheck
docker compose exec app npm run build
docker compose exec app npm run test:workflow
```

La prueba del flujo necesita los servicios y el servidor activos; crea y elimina sus propios usuarios y torneos. Ejecútala solo contra desarrollo. Si utilizas la IP local en APP_URL, especifica TEST_BASE_URL con ese mismo origen y ejecútala desde un equipo que pueda acceder a él.

La prueba de navegador móvil y la de primer acceso son comprobaciones adicionales con Playwright: requieren instalar su navegador y librerías. Las instrucciones avanzadas están en README. Para ver la app en tu móvil no necesitas Playwright.

## Versiones y revisión

La versión actual es `0.2.0`, igual que `package.json`. Mientras revisamos cambios:

- Se anotan en `CHANGELOG.md`, sección **Sin publicar**, bajo **Correcciones** o **Mejoras**.
- Se mantienen locales; los commits locales son posibles, pero no se hace push, no se publican etiquetas y no se despliega sin visto bueno explícito.
- `VERSION` no se incrementa por cada retoque.

Al aprobar una versión, elegimos el número, sincronizamos `VERSION`, `package.json` y `package-lock.json`, movemos las notas pendientes a una entrada con versión y fecha, completamos las comprobaciones y entonces subimos los cambios aprobados.

Criterio de numeración:

| Cambio                                              | Ejemplo desde 0.2.0 |
| --------------------------------------------------- | ------------------- |
| Correcciones sin cambiar el funcionamiento esperado | 0.1.1               |
| Nuevas funciones o mejoras de alcance               | 0.2.0               |
| Primera versión estable acordada para uso real      | 1.0.0               |

No ejecutes este ejemplo hasta aprobar la versión correspondiente:

```sh
docker compose exec app npm version 0.3.0 --no-git-tag-version
printf '0.3.0\n' > VERSION
```

Después se prepara la entrada de CHANGELOG, se revisa `git diff`, se hace el commit y se sube la versión aprobada. Una etiqueta como `v0.3.0` se añade cuando acordemos publicar esa versión. Evita el despliegue automático de cada push: la aprobación para subir código no supone por sí sola autorización para desplegarlo.

## Cómo convivir con los cambios hechos en Codex

Tu Mac y Codex tienen copias distintas del repositorio. Los cambios que haces en el Mac no aparecen aquí hasta que los compartas; lo mismo ocurre con nuestros cambios pendientes de aprobación. Para traer una versión ya aprobada y subida, con tu trabajo local guardado, usa `git pull --ff-only`.

Antes de tocar los mismos archivos desde ambos sitios, compartimos qué cambios hay pendientes. No se sobrescribe trabajo local ni se fuerza el historial para resolver una discrepancia.

## Publicación para los jugadores

La recomendación inicial es un alojamiento como Railway con un servicio Node.js y PostgreSQL gestionado. El proveedor y el presupuesto se acordarán antes de crear servicios.

Cuando la versión esté aprobada:

1. Conectar el repositorio al alojamiento y establecer Node.js 24, instalación `npm ci`, compilación `npm run build` y arranque `npm start`.
2. Crear PostgreSQL persistente y definir DATABASE_URL en los secretos del servicio. No utilizar las credenciales de ejemplo de Docker.
3. Configurar APP_URL con el dominio público HTTPS y las variables del proveedor SMTP. Mailpit se usa solo en desarrollo.
4. Aplicar el esquema con `node scripts/db-setup.mjs`. En producción se ejecuta directamente, porque `npm run db:setup` busca el archivo local `.env.local` que no se sube al servidor.
5. Crear la primera cuenta administradora con `node scripts/create-admin.mjs`, usando una terminal interactiva o variables suministradas de forma segura. No guardar contraseñas en comandos versionados.
6. Probar acceso, inscripción, calendario, resultados y correo real antes de compartir enlaces. Acordar las copias de seguridad de PostgreSQL y mantener los despliegues sujetos a aprobación.

Publicar el entorno de Codex guarda su configuración de trabajo; **no publica la aplicación para los jugadores**. El despliegue público será un paso separado.
