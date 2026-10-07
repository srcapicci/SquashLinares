# Squash Linares · Liga 26–27

Primera base de la aplicación del club: calendario responsive, grupos y filtro por jugador.

## Tecnología

- Next.js 16 y React 19 con TypeScript para interfaz y API en un mismo proyecto.
- PostgreSQL 17 para persistencia, con consultas parametrizadas mediante `pg`.
- Docker Compose para la base de datos local. La aplicación se ejecuta con Node.js: no necesita un contenedor para desarrollar.
- Node.js 24 y npm; `package-lock.json` fija las dependencias.

## Desarrollo

Desde la raíz del repositorio:

```sh
npm ci
cp .env.example .env.local # solo si no existe; credenciales exclusivamente locales
docker compose up -d --wait db
npm run db:setup
npm run dev
```

Espera a que `docker compose ps` muestre PostgreSQL saludable antes de preparar la base de datos. La carga inicial es transaccional y se puede repetir sin duplicar registros. No borra datos existentes ni aplica correcciones posteriores del calendario: esas correcciones requerirán una migración explícita.

`GET /api/health` devuelve 200 si PostgreSQL responde, o 503 si no está disponible.
`GET /api/matches` devuelve los 92 partidos; `?group=1`, `2` o `3` filtra por grupo. Un grupo inválido devuelve 400.

La interfaz utiliza el calendario importado de `data/tournament.json`; la API lee la copia persistida en PostgreSQL. Todavía no hay edición ni envío de resultados. No existe autenticación y no debe publicarse como un sistema de gestión completo. No se han importado teléfonos ni direcciones de correo.

## Comprobaciones

```sh
npm test
npm run typecheck
npm run build
npm start
```

Para comprobar la ejecución, solicita la página principal, `/api/health` y `/api/matches?group=3`. Deben responder correctamente, y el último debe devolver 36 partidos. Los tests comprueban datos, participantes y cruces; no simulan las reglas aún desconocidas.

## Datos confirmados y pendientes

El PDF facilitado por el usuario contiene 25 jugadores, tres grupos, 92 partidos y semanas desde el 19 de octubre de 2026. Los partidos aplazados se recuperan hasta el 30 de diciembre. Los puestos 1.º–3.º, 4.º–6.º y 7.º–9.º pasan a Primera, Segunda y Tercera respectivamente.

En el grupo 3 se conservan, sin alterar, dos cruces repetidos: David Gálvez–José Soriano (jornadas 4 y 9) y Fernando Moreno–Manuel Reyes (6 y 9). Faltan Fernando Moreno–Manuel R. y José Soriano–Manuel Reyes. Manuel R. descansa dos veces y David Gálvez ninguna. La organización debe confirmar la corrección.

Pendientes: puntuación, desempates, identidad/acceso de jugadores, validación y corrección de resultados, permisos de administración y despliegue público. Las semanas del PDF no se interpretan como fechas límite individuales. No se inventan resultados ni clasificación.

## Entorno en la nube

Usa el checkout existente: cada tarea está aislada y no necesita otro worktree. Docker conserva los datos en un volumen durante el desarrollo local; no se presupone que procesos ni volúmenes sobrevivan a una nueva máquina. Reinicia PostgreSQL y la aplicación, y ejecuta la carga idempotente cuando haga falta. Para producción usa una base de datos gestionada con credenciales propias y copias de seguridad; las credenciales de ejemplo solo sirven para desarrollo.
