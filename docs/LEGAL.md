# Privacidad, cookies y aspectos legales

> **Esto no es asesoramiento legal ni contable.** Las políticas incluidas son plantillas de buenas
> prácticas y **no garantizan el cumplimiento normativo**. Antes de operar, un **abogado** y un **contador**
> bolivianos deben revisar los puntos marcados. Investigación con fuentes: [investigacion/legal-bolivia.md](investigacion/legal-bolivia.md).

## Qué implementa el sistema

| Tema | Implementación |
|---|---|
| Minimización de datos | Para pedir solo se exigen nombre y teléfono; correo opcional; dirección solo si hay entrega |
| Políticas publicadas | Privacidad, cookies, términos, condiciones de pedido, cambios/cancelaciones/reembolsos en es/en/fr, editables con borrador, versión y fecha |
| Consentimiento en el checkout | Casilla obligatoria de condiciones con enlaces a las políticas |
| Cookies | Solo almacenamiento necesario hoy (sesión, carrito, preferencias). El banner registra la elección (en el navegador y en la base con un id aleatorio, sin datos personales), permite rechazar, personalizar y cambiar después; vuelve a preguntar si cambia la versión de la política. `hasConsent()` está listo para condicionar scripts de analítica futuros |
| Derechos del titular | Descarga de datos propios y eliminación de cuenta (anonimiza contacto y conserva importes de venta) desde *Mi perfil* |
| Acceso del personal | El gerente ve clientes solo para atender pedidos; recordatorio de uso en el panel; todo cambio crítico queda auditado |
| Comprobantes de pago | Almacenamiento privado, solo personal autorizado |
| Retención | Parámetro configurable (`data_retention_months`, 24 por defecto) **como referencia**; la depuración automática no está implementada: requiere definir el plazo con asesoría |
| Facturación | El sistema emite **comprobantes de pedido**, que indican que **no son factura fiscal** |

## Puntos que requieren revisión profesional

| Tema | Responsable | Nota de la investigación |
|---|---|---|
| Texto final de la política de privacidad (responsable, finalidades, encargados, transferencia internacional si los servidores están fuera de Bolivia) | Abogado | A septiembre de 2026 no se encontró una ley general de datos personales promulgada; aplican la CPE (privacidad, acción de protección de privacidad), Ley 164 y DS 1793 |
| Términos, devoluciones y reclamos de alimentos | Abogado | Ley 453 y DS 2130 (derechos del consumidor) |
| Necesidad o no de banner de cookies | Abogado | No se encontró norma boliviana específica; el enfoque implementado es conservador |
| Obligación y modalidad de **facturación en línea** del NIT | Contador | Grupos 9–12 obligados desde 1-10-2026 según RND 102600000007 (confirmar si aplica) |
| Contratos con bancos/pasarelas y tratamiento tributario de comisiones | Abogado y contador | |
| Plazo de conservación de registros de venta | Contador | Define cuándo se pueden depurar datos |

## Integración de facturación (futuro)

Si el contador confirma la obligación, lo realista es (a) emitir la factura en el Portal Web del SIN de forma
manual con el número de pedido, o (b) integrar un **proveedor certificado** de facturación. Desarrollar una
facturación propia exige certificación del SIN.
