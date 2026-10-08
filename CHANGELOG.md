# Historial de cambios

Las novedades pendientes se anotan en **Sin publicar**. Solo se convierten en una versión y se suben a GitHub cuando el propietario da el visto bueno explícito. Subir código a GitHub y desplegar la aplicación son acciones distintas.

## Sin publicar

### Correcciones

- La guía de Mac utiliza la descarga desde GitHub y corrige los ejemplos de próximas versiones.

### Mejoras

- Infraestructura separada en `deploy/`, incluidos Dockerfile y scripts de arranque.
- Compose principal con componentes incluidos de aplicación, PostgreSQL y correo, conectados por la red del mismo proyecto.
- Punto de entrada en la raíz compatible con el arranque anterior; se conservan el nombre del proyecto y los volúmenes de datos.
- Guía de estructura, comunicación interna y comandos de operación del stack.

## 0.2.0 — 2026-10-08

Versión de desarrollo aprobada para entregar por GitHub; no implica un despliegue público.

### Correcciones

- Las pruebas móviles guardan capturas en una ruta del proyecto compatible con Mac, en lugar de una ruta exclusiva del entorno de Codex.

### Mejoras

- Arranque completo con Docker Compose: aplicación, PostgreSQL y buzón de correo de pruebas.
- Preparación automática de la base de datos y dependencias dentro del contenedor.
- Creación de la primera cuenta administradora desde el navegador, habilitada solo en la configuración local y cerrada cuando ya existe un administrador.
- Código local montado en Docker para ver los cambios al editar, sin instalar Node.js en el Mac.
- Archivo `VERSION` para identificar la versión del proyecto.
- Guía para instalar, probar y retocar la aplicación en un Mac.
- Flujo de revisión, aprobación, versionado y publicación documentado.
- Instrucciones permanentes para no subir cambios ni desplegar sin aprobación.

## 0.1.0 — Base de desarrollo existente

Esta entrada describe el código ya subido antes de acordar el nuevo flujo de aprobación. No representa una publicación en producción ni una etiqueta de lanzamiento aprobada.

### Correcciones

- Los nuevos calendarios generan cruces únicos y descansos completos para grupos impares.
- Los resultados simultáneos no sobrescriben partidos finalizados; las correcciones administrativas quedan auditadas.

### Mejoras

- Varios administradores y torneos independientes.
- Inscripción mediante enlaces temporales, revocables y comprobados en el servidor.
- Gestión de participantes, condición de socio, grupos y capacidad máxima.
- Generación de jornadas y fechas orientativas a partir de la configuración del torneo.
- Área del jugador con cruces, descansos y registro de resultados.
- Avisos internos y correos de publicación con reintento de mensajes pendientes.
- Interfaz móvil instalable como aplicación web.
- PostgreSQL y buzón de correo de pruebas con Docker Compose.
- Calendario original conservado como archivo histórico, incluidos sus errores pendientes de confirmación.
- Pruebas automatizadas del calendario, permisos, inscripciones y flujo móvil.

### Pendiente

- Confirmar puntuación y desempates para calcular la clasificación.
- Configurar correo real, crear la primera cuenta administradora y desplegar en un dominio público.
- Recuperación automática de contraseñas, verificación de correo y app nativa con enlaces universales.
