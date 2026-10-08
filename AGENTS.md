<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Revisión y publicación acordadas con el propietario

- Se puede trabajar y validar localmente. No hacer push, publicar etiquetas/releases ni desplegar sin el visto bueno explícito del propietario para la acción correspondiente.
- Anotar los cambios pendientes en CHANGELOG.md, sección Sin publicar, bajo Correcciones y Mejoras. No incrementar VERSION por cada cambio de desarrollo.
- Tras aprobar una versión, acordar su número y mantener VERSION, package.json y package-lock.json sincronizados. Preparar las notas con versión y fecha y completar las comprobaciones pertinentes antes de subir.
- Los cambios hechos en el Mac del propietario y en Codex son copias distintas. Preservar el trabajo local y coordinar las modificaciones; no forzar el historial ni sobrescribir archivos para sincronizar.
- La guía de instalación y revisión en Mac está en docs/desarrollo-en-mac.md.
