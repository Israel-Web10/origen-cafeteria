# Tipo de cambio BOB/USD: APIs y fuente oficial

> **Fecha de consulta:** 2026-10-20.

## 1. Situación oficial en Bolivia (BCB)

- **Tipo de cambio oficial (TCO) del USD publicado por el BCB para el 20-10-2026: Bs 11,70 por USD.** Es un valor único (la tabla no lo separa en compra y venta). La tabla aclara que todas las cotizaciones son referenciales salvo la del dólar.
  - Fuente: https://www.bcb.gob.bo/librerias/indicadores/otras/ultimo.php y https://www.bcb.gob.bo/
- **El tipo de cambio ya no es fijo. No use 6,96.** La portada del BCB menciona:
  - "unificación cambiaria iniciado en noviembre de 2025";
  - (7-abr-2026) "la transición hacia un régimen de tipo de cambio flexible";
  - (26-jun-2026) el BCB "consolida el abandono pleno del régimen cambiario fijo".
  - Valores anteriores observados en fuentes secundarias: ~Bs 9,73 a fines de junio y Bs 9,80 el 3-jul-2026 (publicación del BCB en X: https://x.com/BancoCentralBO/status/2073029806074003765). **El valor cambia a diario.**
- El texto completo de la norma o resolución que define el régimen actual: **No verificado**. Conviene leer el comunicado oficial del BCB antes de fijar reglas de negocio.
- **¿API oficial del BCB para el tipo de cambio?** **No encontré ninguna.** El BCB publica una página web, una serie histórica y "Microdatos". OpenBCB (oct-2025) es una API de **cobros con QR**, no de tipo de cambio. Extraer los datos de la página (scraping) es frágil y sus condiciones de uso no fueron revisadas.

## 2. APIs gratuitas

| API | ¿Incluye BOB? | Valor observado (USD→BOB) | Actualización | Límites | Uso comercial | Atribución | Fuente |
|---|---|---|---|---|---|---|---|
| **ExchangeRate-API Open Access** (`open.er-api.com/v6/latest/USD`) | **Sí** | 11,676063 (actualizado el 20-10-2026 a las 00:02 UTC) | **1 vez al día** | Sin cifra publicada. Si hay exceso responde HTTP 429 y bloquea ~20 min | **Sí** ("personal or commercial"), se permite cache, no se permite redistribuir | **Obligatoria** (enlace a exchangerate-api.com) | https://www.exchangerate-api.com/docs/free ; términos: https://www.exchangerate-api.com/terms |
| **Frankfurter** (datos del BCE) | **No.** BOB no está entre sus 30 monedas | — | Diaria (BCE) | — | — | — | https://api.frankfurter.dev/v1/currencies |
| **fawazahmed0 currency-api** (jsDelivr y Cloudflare Pages) | **Sí** | 11,68095114 (fecha 2026-10-19) | "Daily Updated" | "No Rate limits" | Licencia **CC0-1.0** | No exigida (CC0) | https://github.com/fawazahmed0/exchange-api ; respaldo: `https://latest.currency-api.pages.dev/v1/currencies/usd.json` |
| **exchangerate.host** | No verificado (indica ~168 monedas) | — | No especificada | Free: **100 solicitudes/mes**, con API key. Siguiente plan: desde USD 14,99/mes | No indicado | No indicado | https://exchangerate.host/ |

Advertencias:
- ExchangeRate-API dice en sus términos que **no recomienda usar sus tasas para transacciones reales** y que puede discontinuar el plan gratuito sin aviso.
- fawazahmed0 **no declara su fuente de datos**.
- Los valores de las APIs (≈ 11,68) **no coinciden exactamente con el TCO del BCB** (11,70). Para cobrar al cliente, una diferencia así importa.

## 3. Recomendación

**Use un tipo de cambio manual, administrado por el encargado**, y no una API automática, para todo precio que se cobre:

1. Guarde en la base de datos una tabla `tipo_cambio` con `valor`, `fuente` ("BCB TCO" o "tasa propia"), `vigente_desde`, `usuario` y fecha. El encargado actualiza el valor desde el panel.
2. Los precios del menú se definen **en bolivianos (Bs)**. Si se muestran en USD, que sea solo como referencia, con la leyenda "tipo de cambio referencial".
3. Cada pedido guarda el tipo de cambio usado (no se recalcula después).
4. Opcional: una API (ExchangeRate-API con atribución, o fawazahmed0 con respaldo) puede servir **solo como referencia o alerta** en el panel ("la tasa del mercado difiere más de X % de la tasa configurada"). Nunca debe cambiar los precios por sí sola.

Motivos: régimen flexible reciente, ausencia de una API oficial del BCB, diferencias entre fuentes y descargos de responsabilidad de las APIs gratuitas.
