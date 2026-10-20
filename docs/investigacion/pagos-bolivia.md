# Pagos con tarjeta y QR en Bolivia (pequeño comercio)

> **Fecha de consulta:** 2026-10-20. Ninguna condición comercial (comisiones, requisitos) es definitiva hasta que el banco o la pasarela la confirme por escrito. Muchos proveedores bolivianos **no publican tarifas** y las cotizan bajo contrato.

## Advertencia clave: un QR estático no confirma pagos

**Una imagen fija de QR** (por ejemplo, el QR de la cuenta de la cafetería impreso o puesto en la web) **no puede confirmar automáticamente** que el cliente pagó, ni cuánto pagó, ni para qué pedido. Para conciliar pagos automáticamente hace falta un **QR dinámico por pedido**, generado por API (con monto e identificador), y una **notificación del pago** (webhook o consulta de estado) desde el banco o la pasarela. Sin eso, la confirmación es **manual**: el personal revisa la app del banco o el cliente envía un comprobante, que puede falsificarse.

## 1. Contexto regulatorio (QR interoperable)

- Bolivia usa un estándar único de QR interoperable entre entidades financieras, definido por el BCB. El BCB menciona la "definición de un estándar único para la generación de códigos QR en todo el sistema financiero" y la gratuidad del procesamiento de transferencias electrónicas. Fuente: BCB, Comunicado CP44/2025 (8-oct-2025): https://www.bcb.gob.bo/webdocs/files_noticias/CP-44%20LANZAMIENTO%20OPENBCB%20_OK.pdf
- Según ASFI, en enero de 2025 los pagos con QR sumaron Bs 19.939 millones, el 27 % del valor de las órdenes electrónicas de transferencia de fondos. Fuente: https://asfi.gob.bo/sites/default/files/2025-07/El%20uso%20del%20QR%20ha%20dinamizado%20el%20sistema%20de%20pagos%20en%20Bolivia.pdf
- El reglamento del BCB sobre servicios de pago define a las **pasarelas de pago**, que operan como *agregador* o *facilitador* y deben estar vinculadas o respaldadas por una entidad financiera (texto de la norma **No verificado**; referencia secundaria: https://dplnews.com/bolivia-norma-acerca-a-paypal-pero-aun-no-asegura-su-arribo/).

## 2. Opciones

| Opción | API pública | Mensualidad | Comisión | Requisitos de contrato | Sandbox | Confirmación automática | Fuente |
|---|---|---|---|---|---|---|---|
| **QR estático de la cuenta del comercio** (app de cualquier banco) | No | Según el banco (normalmente sin costo; **No verificado**) | Transferencias QR: el BCB anuncia gratuidad en el procesamiento (comisiones de cada banco **No verificado**) | Cuenta bancaria | — | **No** (manual) | CP44/2025 del BCB |
| **OpenBCB (Banco Central de Bolivia)** | Sí, APIs para: generar QR "sin costo alguno", consultar estado del QR en tiempo real, procesar órdenes de pago y notificar pagos | **Gratis** según el BCB | Gratis según el BCB | Pensado para instituciones públicas o privadas, bajo la Ley 1670 y el *Reglamento de Cuentas Transitorias de Liquidación*. Exige una cuenta en el BCB. La conexión de fintechs estaba "prevista". **Elegibilidad de una cafetería pequeña: No verificado** | No verificado | Sí (notificación de pagos) | CP44/2025 del BCB (enlace arriba) |
| **BCP Bolivia – APIs abiertas** | Ofrece "APIs Públicas", "APIs Pagos QR Simple" y "APIs Privadas" (Banca Empresas). La documentación se envía tras un formulario de registro | No publicada | No publicada (el sitio tiene un "Tarifario" general) | Registro con nombre, empresa, correo y celular. Requisitos de contrato **No verificado** | No mencionado | Probable con la API de QR (**No verificado**) | https://www.bcp.com.bo/Desarrollo |
| **BNB, Banco Unión, Mercantil Santa Cruz, Ganadero** | **No encontré portales públicos para desarrolladores.** Ganadero ofrece cobro con QR empresarial dentro de su banca por internet GanaNet (sin API pública encontrada) | No verificado | No verificado | Contactar a banca empresas | No | No verificado | https://www.bg.com.bo/canales-digitales/gananet/ |
| **Libélula** (pasarela boliviana) | Su sitio menciona "Integración REST-API" y un menú "Documentación API". Canales: QR Simple, Visa/Mastercard, Google Pay, Tigo Money, BNB, PIX, Lula | **No publicada** | **No publicada** | No publicados (contacto comercial) | No mencionado | Sí, como pasarela (detalle **No verificado**) | https://libelula.bo/ (el certificado TLS de `www.libelula.bo` falló al consultarlo) |
| **PagosNet** | Integración disponible **a través de EBANX** como medio "Cash & Codes" (cupón para pagar en efectivo o banco; el cliente es redirigido al cupón). API directa de PagosNet: **No verificado** | No verificado | EBANX no publica tarifas (contacto comercial) | Contrato con EBANX | No verificado | Asíncrona (cupón) | https://docs.ebanx.com/docs/pay-in/processing/payment-methods/country-specific/bolivia/bolivia-country-overview |
| **CUCU** (agregador privado de QR, sitio del proveedor) | API REST con webhook firmado (`qr.paid`) y consulta de estado. QR interbancario (11 bancos) | Integración única: **Bs 3.200**. Planes: Bs 225 + 2,5 %, Bs 405 + 1,8 %, Bs 765 + 1,3 % por cobro. **Su propia FAQ muestra otras mensualidades (Bs 250/450/850): cifras inconsistentes, confirmar** | Ver columna anterior | Alta en app.cucu.bo | No mencionado | Sí (webhook) | https://cucu.bo/qr |
| **Khipu** | Mencionada como pasarela usada en Bolivia en un documento secundario. **Operación y API para comercios bolivianos: No verificado** | No verificado | No verificado | No verificado | No verificado | No verificado | https://contadores-aic.org/wp-content/uploads/2026/08/01-Evolucion-digitalizacion-y-regulacion-del-sistema-financiero-boliviano.pdf |
| **Stripe** | — | — | — | **Bolivia NO figura entre los países admitidos** para negocios. En América Latina solo aparecen Brasil y México | — | — | https://stripe.com/global |
| **PayPal** | — | — | — | La página de PayPal Bolivia dice que se puede "enviar y solicitar pagos". **El retiro de fondos a bancos bolivianos y las cuentas comerciales no aparecen en la página: No verificado.** No es una vía práctica de cobro local en Bs | — | — | https://www.paypal.com/bo/webapps/mpp/home |

## 3. Recomendación para ORIGEN

1. **Fase 1 (inmediata):** QR estático de la cuenta + **confirmación manual** por el encargado en el panel de pedidos (estado "pendiente de verificación"). Pago en efectivo o con tarjeta en el POS físico al recoger.
2. **Fase 2:** pedir propuestas por escrito a **BCP (APIs QR Simple)**, **Libélula** y al **BCB (OpenBCB)** con estas preguntas: QR dinámico por monto, webhook o consulta de estado, sandbox, comisión por transacción, mensualidad, plazo de liquidación y requisitos (NIT, licencia de funcionamiento, cuenta empresarial).
3. **Tarjetas en línea:** solo a través de una pasarela local (Libélula u otra). Stripe no está disponible para comercios bolivianos.
4. **Seguridad:** nunca guardar datos de tarjeta en el backend propio. Usar el formulario o la redirección de la pasarela.

**Revisión necesaria:** contratos con bancos y pasarelas y su tratamiento tributario (facturación de comisiones) → **abogado y contador en Bolivia**.
