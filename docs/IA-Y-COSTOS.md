# Claves, costos externos e IA

Este documento responde tres preguntas: cómo se guardan las claves, cómo evitar facturas sorpresa
por usar servicios de terceros, y si conviene agregar IA al panel.

## 1. Qué servicios externos usa hoy ORIGEN

| Servicio | Para qué | ¿Necesita clave? | ¿Puede generar costo? |
|---|---|---|---|
| PostgreSQL (propio) | Base de datos | Contraseña en `backend/.env` | Solo el del hosting elegido |
| OpenStreetMap (iframe) | Mapa de *Visítanos* | No | No (uso ligero según su política) |
| Google Fonts | Tipografías | No | No |
| Almacenamiento S3/R2 (opcional, `STORAGE_DRIVER=s3`) | Imágenes y comprobantes | Sí | Sí, si se activa (R2 tiene capa gratuita) |

**No se usa ninguna API de pago** (ni IA, ni mapas de Google, ni pasarela de pago real). La tarjeta solo
funciona en modo de prueba (`CARD_PROVIDER=test`), y ese modo está bloqueado en producción.

## 2. Cómo se protegen las claves

1. **Solo en el servidor.** Las claves viven en `backend/.env` (o en las variables del hosting) y nunca
   en el frontend: todo lo que está en `frontend/` y en variables `VITE_*` termina en el navegador del
   visitante y cualquiera puede leerlo.
2. **Fuera de Git.** `.env` está en `.gitignore`. Además:
   - `scripts/check-secrets.mjs` busca claves privadas, tokens de GitHub/AWS/Stripe/OpenAI/Anthropic/Google,
     contraseñas con valor y `JWT_SECRET` escritos en archivos versionados.
   - El gancho `.githooks/pre-commit` lo ejecuta antes de cada commit y **bloquea el commit** si encuentra algo.
     Se activa una vez por equipo con `git config core.hooksPath .githooks`.
   - Revisión completa del repositorio: `node scripts/check-secrets.mjs --all`.
3. **Si una clave se filtra:** revócala en el panel del proveedor y crea otra. Borrarla del repositorio
   no basta: queda en el historial de Git y en copias.

## 3. Cómo evitar facturas sorpresa

- **Prefiere servicios con precio fijo o capa gratuita sin tarjeta.** Un VPS de precio fijo no puede
  cobrar más de su tarifa mensual; los servicios "por uso" sí.
- Si un proveedor exige tarjeta, configura **antes de usarlo**:
  - **Alertas de presupuesto** (correo al llegar al 50 % y al 90 %).
  - **Límite duro de gasto** donde exista. En la consola de Anthropic y en la de OpenAI se fija un tope
    mensual por organización; Cloudflare R2 y la mayoría de nubes ofrecen alertas, no siempre un tope duro.
  - Una **clave distinta por proyecto**, con los permisos mínimos y, si se puede, restringida por IP o dominio.
- **Nunca llames a una API de pago directamente desde el navegador.** Hazlo desde el backend, detrás de
  autenticación y con límite de peticiones. Así nadie puede copiar la clave ni disparar miles de llamadas.
- Si algún día se añade un servicio de pago, se recomienda envolverlo en un endpoint propio con:
  - límite por usuario y por día;
  - caché de respuestas;
  - un contador mensual en la base que corte el servicio al llegar al presupuesto.

## 4. ¿Hace falta IA en el panel?

**Recomendación: hoy no.** El panel ya incluye **recomendaciones automáticas** por reglas
(`backend/src/services/analyticsService.js`, función `insights`):

- insumos bajo mínimo y días de cobertura;
- tasa de cancelación alta y descuentos excesivos;
- caída o subida frente al periodo comparable;
- hora pico y día más flojo;
- dependencia de un solo producto;
- productos sin ventas;
- costos sin registrar y días atípicos.

Frente a un modelo de IA, estas reglas:

- **no cuestan nada**: no hay llamadas a terceros;
- **no envían los datos del negocio** a ningún proveedor;
- **son explicables**, porque cada sugerencia dice de qué número sale;
- **no inventan**: piden un mínimo de pedidos antes de sacar conclusiones;
- funcionan sin conexión a Internet y en los tres idiomas.

Con el volumen de una cafetería (decenas o cientos de pedidos al día), un modelo de lenguaje diría
prácticamente lo mismo con otras palabras.

### Cuándo sí tendría sentido

- Cuando haya **varios locales** o meses de historial y se quiera un resumen semanal en lenguaje natural
  ("esta semana el cacao cayó por…").
- Para responder preguntas libres sobre los datos ("¿qué vendí más los lunes lluviosos?").

### Cómo hacerlo sin riesgos (si se decide más adelante)

1. Endpoint propio `POST /api/v1/analytics/assistant`:
   - solo para el personal (`requireStaff`);
   - con su propio límite, por ejemplo 20 consultas al día.
2. El backend envía **solo agregados**, como los que ya devuelve `/analytics/summary`. Nunca debe enviar
   datos personales de clientes (nombres, teléfonos, direcciones).
3. Clave del proveedor (por ejemplo `ANTHROPIC_API_KEY`) solo en `backend/.env`. En la consola del proveedor:
   - tope mensual de gasto (por ejemplo USD 5);
   - alerta al 50 %.
4. Modelo pequeño y económico, respuestas cortas (`max_tokens` bajo) y caché del resumen por periodo,
   para que abrir el panel diez veces no genere diez llamadas.
5. Mostrar la respuesta como **sugerencia**, con los números en los que se basa, junto a las reglas actuales.

Así el costo queda acotado por diseño, en tres niveles:

- el tope del proveedor;
- el límite diario del endpoint;
- la caché.
