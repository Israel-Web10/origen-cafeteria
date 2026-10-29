# ORIGEN — Plataforma de pedidos para cafetería

Web de pedidos con experiencia inmersiva, panel de gestión, inventario con recetas,
analítica, reportes PDF/Excel, monedas de referencia y pagos verificados (QR / efectivo;
tarjeta preparada en modo de pruebas). Español, inglés y francés.

> **Estado:** listo para un piloto controlado. Antes de operar con clientes reales revisa
> la [lista de producción](docs/INFORME-FINAL.md#lista-de-comprobación-para-producción):
> hay puntos que dependen del negocio (textos legales revisados, QR oficial, dominio, hosting).

## Qué incluye

| Área | Resumen |
|---|---|
| Cliente | Portada con escena 3D (perspectiva CSS + video + parallax), carta con búsqueda/filtros/orden, detalle con variantes, carrito lateral, checkout con totales calculados por el servidor, seguimiento seguro, historial, perfil con descarga/eliminación de datos |
| Pagos | QR oficial del negocio con referencia y comprobante privado → verificación manual auditada; efectivo con importe recibido y cambio; tarjeta: solo simulador de pruebas (bloqueado en producción) |
| Panel | Dashboard (periodos diario→anual, comparación hasta la fecha, media móvil, anomalías, ABC, proyección marcada como estimación), pedidos, pagos, productos/variantes/recetas, categorías, promociones, inventario (insumos, movimientos inmutables, alertas, proveedores), reportes PDF/Excel, clientes, imágenes, contenido editable con borrador y publicación, monedas y tipos de cambio manuales, configuración, usuarios/roles, auditoría |
| Seguridad | Roles CLIENTE / GERENTE / ADMINISTRADOR verificados en backend, JWT revocable, bloqueo por intentos, rate limiting, validación estricta (zod), subida de archivos validada por firma binaria, comprobantes privados, Helmet/CSP, idempotencia, SQL parametrizado |
| Datos | PostgreSQL 17, migraciones versionadas, importes en centavos enteros, zona horaria del negocio, backups/restauración probados |

## Tecnologías

| Capa | Stack |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, React Router 7, Tailwind CSS 3, framer-motion, i18next |
| Backend | Node.js 20+, Express 4, zod, pg, PDFKit, ExcelJS, helmet, express-rate-limit |
| Base de datos | PostgreSQL 17 (compatible 14+) |
| Pruebas | node:test + supertest (backend), comprobación de i18n, lint, build |

## Inicio rápido (desarrollo)

Requisitos: Node 20+, PostgreSQL 14+ instalado y encendido. Desde la carpeta del proyecto:

```bash
npm run setup     # instala todo, crea backend/.env, la base, las tablas y (si quieres) datos de demostración
npm run dev       # arranca API y web juntas → http://localhost:5173
npm run doctor    # si algo falla: revisa y explica qué falta, sin cambiar nada
```

`setup` es un asistente: si el usuario de la base no existe o la contraseña no coincide, ofrece usar el
usuario `postgres` de tu instalación y te pide su contraseña (no se muestra en pantalla). En VS Code también
están como tareas: *Terminal → Ejecutar tarea… → ORIGEN: …*

Cuentas de prueba (solo desarrollo, definidas en `backend/scripts/seed-dev.js`): administrador,
gerente y cliente con correos `@origen.dev`. En producción se crea el primer administrador con
`npm run create-admin` (sin contraseñas predeterminadas).

Guía paso a paso para personas no técnicas: **[docs/INSTALACION.md](docs/INSTALACION.md)**.

## Comandos útiles

| Dónde | Comando | Qué hace |
|---|---|---|
| backend | `npm test` | 41 pruebas (unitarias + integración HTTP contra una base `_test`) |
| backend | `npm run lint` | ESLint |
| backend | `npm run migrate:status` | Estado de migraciones |
| backend | `npm run create-admin -- --email ...` | Primer administrador de producción |
| backend | `scripts/backup.ps1` / `backup.sh` | Respaldo con verificación y rotación |
| frontend | `npm run build` | Verifica traducciones + TypeScript + build |
| frontend | `npm run lint` / `check:i18n` | ESLint / integridad de es-en-fr |

## Documentación

| Documento | Contenido |
|---|---|
| [docs/AUDITORIA.md](docs/AUDITORIA.md) | Fase 1: diagnóstico del proyecto original |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Fase 2: decisiones técnicas y su justificación |
| [docs/GUIA-VSCODE.md](docs/GUIA-VSCODE.md) | Ejecutar web y base de datos desde Visual Studio Code, comando por comando |
| [docs/INSTALACION.md](docs/INSTALACION.md) | Instalación desde cero (Windows / Linux) |
| [docs/BASE-DE-DATOS.md](docs/BASE-DE-DATOS.md) | Esquema, roles, migraciones, backups, restauración, actualización |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Hosting, dominio, HTTPS, variables, rollback, costos |
| [docs/SEGURIDAD.md](docs/SEGURIDAD.md) | Riesgos, medidas aplicadas y riesgos residuales |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Pruebas ejecutadas y resultados reales (incluida carga) |
| [docs/API.md](docs/API.md) | Referencia de endpoints |
| [docs/LEGAL.md](docs/LEGAL.md) | Privacidad, cookies, consumo y facturación: qué revisar con profesionales |
| [docs/RECURSOS-Y-LICENCIAS.md](docs/RECURSOS-Y-LICENCIAS.md) | Imágenes, videos y dependencias: origen y licencias |
| [docs/MANUAL-GERENTE.md](docs/MANUAL-GERENTE.md) | Uso diario del panel |
| [docs/DESPLIEGUE-VERCEL.md](docs/DESPLIEGUE-VERCEL.md) | Vercel paso a paso, si hace falta Azure, y la base de datos al entregar |
| [docs/ESCALABILIDAD.md](docs/ESCALABILIDAD.md) | Caché, multiproceso, límites en Nginx y prueba con 1000 conexiones |
| [docs/IA-Y-COSTOS.md](docs/IA-Y-COSTOS.md) | Claves seguras, cómo evitar facturas por APIs y si conviene IA en el panel |
| [CHANGELOG.md](CHANGELOG.md) | Versiones y cambios (versionado semántico, API `/api/v1`) |
| [docs/INFORME-FINAL.md](docs/INFORME-FINAL.md) | Informe por fases y lista de producción |
| [docs/investigacion/](docs/investigacion/) | Precios y condiciones verificados (hosting, dominio, pagos, tipo de cambio, legal) |
