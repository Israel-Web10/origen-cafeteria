# Hosting, base de datos y almacenamiento: comparativa para ORIGEN

> **Fecha de consulta de todas las fuentes:** 2026-10-20.
> Stack: React + Vite (build estático), Node.js/Express, PostgreSQL 17.
> Los precios están en la moneda que publica cada proveedor (USD o EUR) y **no incluyen impuestos**, salvo que se indique otra cosa. Si un dato no se pudo confirmar en una fuente oficial, se indica **"No verificado"**.
> Los proveedores cambian sus precios con frecuencia (por ejemplo, Hetzner los cambió dos veces en 2026). Revise cada enlace antes de contratar.

Leyenda: **Free tier** = gratis sin fecha de vencimiento (con límites). **Trial** = prueba temporal (crédito o días).

---

## 1. Frontend estático (build de Vite)

| Proveedor | Precio | Límites del plan gratuito | ¿Tarjeta? | Uso comercial en el plan gratuito | Costos por uso | Backups | Dificultad | Riesgo de cargos inesperados |
|---|---|---|---|---|---|---|---|---|
| **Cloudflare Pages** (o Workers Static Assets) | Free: USD 0. Workers Paid: mínimo USD 5/mes | 500 builds/mes, 20.000 archivos por sitio, 25 MiB por archivo, 100 dominios propios por proyecto. La página de límites **no publica un tope de ancho de banda**. En Workers, "Requests to static assets are free and unlimited" | No (plan Free) | No encontré una restricción explícita. Los términos web remiten al *Self-Serve Subscription Agreement*, que no revisé completo (**No verificado**) | Ninguno en Free para estáticos | Cada deploy es inmutable y se puede volver a uno anterior (el código fuente vive en Git) | Baja | Muy bajo en Free: no hay cobro sin plan de pago |
| **Netlify** | Free: USD 0 ("$0 forever"). Personal: USD 9/mes. Pro: USD 20/mes | 300 créditos/mes con **tope duro**, sin recarga. Consumo: 1 GB de ancho de banda = 20 créditos, 10.000 requests = 2, 1 deploy de producción = 15. Ejemplo: 300 créditos alcanzan para unos 15 GB solo de tráfico o unos 15 deploys de producción | No (plan Free) | Sí, según respuestas del personal de Netlify en su foro oficial (no se puede revender el hosting). Los términos de uso no se revisaron completos | Free: no cobra; al agotarse los créditos el comportamiento exacto (¿pausa?) **no está confirmado** en la documentación | Deploys inmutables | Baja | Bajo en Free, pero **el tope de 15 deploys/mes puede pausar el sitio**. Moderado en planes de pago |
| **Vercel** | Hobby: USD 0. Pro: USD 20/mes (incluye USD 20 de crédito de uso) | Hobby: 100 GB de transferencia/mes, 1M de requests CDN, 1M de invocaciones | No (Hobby) | **NO.** FAQ oficial: "Our Hobby plan is for personal, non-commercial use." | Hobby no permite comprar uso adicional | Deploys inmutables | Baja | Bajo en Hobby, pero **no se puede usar Hobby para una cafetería comercial**. Hay que pagar Pro (USD 20/mes) |

Fuentes:
- Cloudflare Pages, límites: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare Workers, precios: https://developers.cloudflare.com/workers/platform/pricing/
- Netlify, precios: https://www.netlify.com/pricing/
- Netlify, créditos: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- Netlify, uso comercial (foro oficial, fuente secundaria): https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545
- Vercel, precios: https://vercel.com/pricing

**Conclusión:** para un sitio comercial, **Cloudflare Pages Free** es la opción más holgada. Vercel Hobby queda descartado por su cláusula de uso no comercial.

---

## 2. Backend Node.js/Express

| Proveedor | Precio | Límites / plan gratuito | ¿Tarjeta? | Uso comercial | Costos por uso | Backups | Dificultad | Riesgo de cargos inesperados |
|---|---|---|---|---|---|---|---|---|
| **Render** | Workspace Hobby: USD 0/mes. Pro: USD 25/mes. Web service Free: USD 0. Instancia 0.5 CPU / 512 MB: **USD 7/mes**. 1 CPU / 2 GB: USD 25/mes | Free: **se apaga tras 15 min sin tráfico** y tarda ~1 min en volver a encender. 750 horas de instancia por mes y workspace. Si se agotan, se suspenden los servicios Free hasta el mes siguiente. El disco local se pierde en cada redeploy o reinicio | Free: no es obligatoria. Sin tarjeta, al pasar el ancho de banda incluido se suspende el servicio en lugar de cobrar | No encontré restricción | Ancho de banda incluido: Hobby 5 GB/mes, Pro 25 GB/mes. Exceso: USD 0,15/GB. Disco persistente: USD 0,25/GB-mes | El servicio no guarda datos; los datos van en la BD | Baja | Bajo. Ojo con el ancho de banda: si se sirven imágenes desde el backend, el exceso se cobra a USD 0,15/GB |
| **Railway** | Trial: USD 5 de crédito único, **máximo 30 días**. Luego el plan Free da USD 1 de crédito/mes. Hobby: USD 5/mes (incluye USD 5 de uso) | Trial: 1 GB de RAM, CPU compartida, 5 servicios por proyecto | **No verificado** | No encontré restricción | vCPU USD 20/mes, RAM USD 10/GB-mes, volumen USD 0,15/GB-mes, egress USD 0,05/GB (cobro por minuto) | Los volúmenes del trial **se borran 30 días después de agotarse el crédito** | Baja | Moderado: el cobro es por uso. USD 1/mes del plan Free no alcanza para un servicio 24/7 |
| **Fly.io** | **Sin plan gratuito** para organizaciones nuevas. Trial: 2 horas de máquina o 7 días, lo que ocurra primero. shared-cpu-1x 256 MB: USD 2,19/mes; 512 MB: USD 3,69/mes; 1 GB: USD 6,70/mes (región iad/ewr) | — | **Sí**, para seguir después del trial | No encontré restricción | Volúmenes USD 0,15/GB-mes. Salida a Internet (Norteamérica/Europa): USD 0,02/GB | 10 GB de snapshots/mes gratis | Media (CLI, Docker) | Moderado: pago por uso |
| **Hetzner Cloud (VPS)** | CX23 (2 vCPU, 4 GB, 40 GB NVMe, 20 TB de tráfico): **€5,49/mes**. CAX11 (Arm): €5,99/mes. Precios vigentes desde el 15-jun-2026, sin IVA. IPv4 aparte (precio **No verificado** en fuente oficial) | Sin plan gratuito. **La línea Cost-Optimized aparece como "no disponible"** en la página oficial al momento de la consulta. Ubicaciones: Alemania, Finlandia, EE. UU., Singapur | Sí | Sí | Tráfico extra en la UE: precio **No verificado** | Backups opcionales (porcentaje **No verificado**) | **Alta**: hay que administrar el SO, la seguridad, TLS, PM2/Docker y las actualizaciones | Bajo: precio fijo con tope mensual |
| **DigitalOcean Droplet (VPS)** | Basic: **USD 4/mes** (1 vCPU, 512 MiB, 10 GiB SSD, 500 GiB de transferencia). Cobro por segundo desde el 1-ene-2026 | Sin plan gratuito | Sí | Sí | Transferencia extra: **No verificado** | Backups semanales: 20 % del precio del Droplet. Diarios: 30 % (USD 0,80 o 1,20 sobre el Droplet de USD 4) | Alta (igual que Hetzner) | Bajo |
| **Contabo Cloud VPS** | Cloud VPS 4 (4 vCPU, 8 GB, 100 GB SSD): **€4,40/mes** con contrato de 24 meses, IVA incluido según la página. El encabezado muestra €5,50 (probablemente el precio mensual sin compromiso; **confirmar**) | Sin plan gratuito. Tráfico "ilimitado" con política de uso justo | Sí | Sí | Comisión de instalación: **No verificado** | 1 snapshot incluido | Alta | Bajo, pero conviene revisar el compromiso de permanencia |

Fuentes:
- Render, precios: https://render.com/pricing (versión en texto: https://render.com/pricing.md)
- Render, plan Free: https://render.com/docs/free
- Railway, planes: https://docs.railway.com/reference/pricing/plans
- Railway, trial: https://docs.railway.com/pricing/free-trial
- Fly.io, precios: https://docs.fly.io/about/pricing
- Hetzner, ajuste de precios 2026: https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- Hetzner, Cost-Optimized: https://www.hetzner.com/cloud/cost-optimized/
- DigitalOcean, Droplets: https://www.digitalocean.com/pricing/droplets
- Contabo, VPS: https://contabo.com/en/vps/

**Nota:** el plan Free de Render **no sirve para producción** de un sistema de pedidos. El primer pedido después de 15 minutos sin tráfico tarda ~1 minuto en responder.

---

## 3. PostgreSQL administrado

| Proveedor | Precio | Límites del plan gratuito | ¿Tarjeta? | Uso comercial | Costos por uso | Backups | Dificultad | Riesgo de cargos inesperados |
|---|---|---|---|---|---|---|---|---|
| **Neon** | Free: USD 0 (permanente). Launch: pago por uso, **sin mínimo mensual**: USD 0,106 por CU-hora y USD 0,35/GB-mes de almacenamiento | **1 GB por proyecto** (20 GB por cuenta), 100 CU-horas/mes por proyecto, se suspende tras 5 min sin uso (arranque en frío), 5 GB de egress por proyecto | **No** ("no credit card") | La página no lo menciona. La describe como apta para "prototypes, side projects, and small teams" (**No verificado** en los términos de servicio) | Launch: egress USD 0,10/GB por encima de 500 GB. Restauración instantánea: USD 0,20/GB-mes | Free: historial de 6 h (1 GB) y 1 snapshot manual, **sin restauración instantánea**. Launch: restauración instantánea de pago | Baja | Bajo en Free (al agotar el cómputo se suspende, no cobra). En Launch el gasto depende de las horas de cómputo |
| **Supabase** | Free: USD 0. Pro: desde USD 25/mes (incluye USD 10 de crédito de cómputo) | 500 MB de BD por proyecto, 1 GB de archivos, 5 GB de egress, 2 proyectos activos. **Los proyectos Free se pausan tras 1 semana de inactividad** | No verificado (se asume que no para Free) | La página no lo menciona (**No verificado**) | Pro: excesos según uso | **Free: sin backups automáticos.** Pro: backups diarios, 7 días de retención | Baja | Bajo en Free. La pausa por inactividad es un riesgo de disponibilidad |
| **Render Postgres** | Free: USD 0. 0.1 CPU / 256 MB: **USD 6/mes**. 0.5 CPU / 1 GB: USD 19/mes. Almacenamiento: USD 0,30/GB-mes (1 GB incluido) | Free: 1 GB. **Vence a los 30 días.** Hay 14 días de gracia para pasar a pago; después **se borra la base y todos los datos**. Sin backups | Free: no | No encontré restricción | Almacenamiento ampliable a USD 0,30/GB | Pago: PITR de 3 días (workspace Hobby) o 7 días (Pro+). Backups lógicos guardados 7 días. **Free: sin recuperación** | Baja | Bajo. **Riesgo alto de perder datos con Free** |
| **Railway Postgres** | Se cobra como contenedor: RAM USD 10/GB-mes, vCPU USD 20/mes, volumen USD 0,15/GB-mes | Solo trial (USD 5 / 30 días) | No verificado | No encontré restricción | Por minuto | Backups: **No verificado** | Baja | Moderado (cobro por uso) |
| **Aiven for PostgreSQL** | Free: USD 0. Developer: USD 5/mes (1 CPU, 1 GB, 8 GB). Hobbyist: desde USD 12/mes | Free: 1 CPU, 1 GB de RAM, **1 GB de almacenamiento**, 1 VM, no se puede elegir nube ni región, sin pooling. "Aiven may shut down services that are unused for an extended period" | No verificado | No verificado | — | Free: **2 días** de retención | Baja | Bajo |
| **DigitalOcean Managed PostgreSQL** | Básico 1 vCPU / 1 GiB: **USD 15,15/mes** | Sin plan gratuito | Sí | Sí | Almacenamiento: USD 0,215/GiB-mes en bloques de 10 GiB (10 a 30 GiB) | La página no dice si incluye backups (**No verificado**) | Baja/Media | Bajo (precio fijo) |
| **Azure Database for PostgreSQL – Flexible Server** | Cuenta gratuita: **USD 200 de crédito por 30 días** y 750 h/mes de B1MS con 32 GB de almacenamiento y 32 GB de backup **durante 12 meses** (solo clientes nuevos). Después, B1MS: USD 0,017/h (≈ USD 12,41/mes en East US, cálculo 0,017 × 730 h). Backup: USD 0,095/GB-mes. Almacenamiento: **No verificado** | Hay que **pasar a pago por uso dentro de 30 días** para conservar los 12 meses gratis. Si no, la cuenta se desactiva | **Sí** (tarjeta no prepaga y teléfono; retención temporal de USD 1) | Sí | Lo que exceda las cantidades gratuitas se cobra a tarifa de pago por uso. **Al mes 13 empieza a cobrarse el servidor completo** | Backups automáticos incluidos (32 GB gratis durante 12 meses) | Media/Alta (portal Azure, redes, firewall) | **Medio/Alto**: es fácil olvidar el fin de los 12 meses o crear recursos fuera de la SKU gratuita |

Fuentes:
- Neon: https://neon.com/pricing
- Supabase: https://supabase.com/pricing
- Render Postgres, Free: https://render.com/docs/free ; precios: https://render.com/pricing.md ; backups: https://render.com/docs/postgresql-backups
- Railway: https://docs.railway.com/reference/pricing/plans
- Aiven: https://aiven.io/pricing
- DigitalOcean: https://www.digitalocean.com/pricing/managed-databases
- Azure, cuenta gratuita: https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account
- Azure, precio B1MS (API oficial de precios): `https://prices.azure.com/api/retail/prices?$filter=armRegionName eq 'eastus' and contains(productName,'PostgreSQL Flexible') and contains(meterName,'B1MS')`

**Compatibilidad con PostgreSQL 17:** el soporte de la versión 17 en cada proveedor **No verificado** en esta consulta. Confírmelo al crear la instancia.

### 3.1 Azure SQL / SQL Server como alternativa

- **Oferta gratuita de Azure SQL Database:** hasta 10 bases por suscripción. Cada una recibe por mes 100.000 vCore-segundos de cómputo serverless, 32 GB de datos y 32 GB de backup, "for the lifetime of your subscription". Al llegar al límite se puede elegir **pausar hasta el mes siguiente** o **seguir con cobro**. Esta segunda opción no se puede revertir. Fuente: https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer (consultado 2026-10-20).
- **¿Ventaja real para ORIGEN?** **No.** El proyecto ya usa PostgreSQL 17. Pasar a SQL Server obliga a reescribir el esquema, las consultas y las migraciones, y a cambiar el driver (`pg` → `mssql`/`tedious`). 100.000 vCore-segundos son unas 27,8 horas de un vCore por mes (cálculo propio). Con pedidos durante todo el día, la base podría pausarse a mitad de mes si se elige la pausa automática. La ventaja (gratis "de por vida" y backups incluidos) no compensa el costo de migrar ni el riesgo de pausa. Solo valdría la pena si el equipo ya trabaja con el ecosistema Microsoft.

---

## 4. Almacenamiento de objetos (imágenes de productos)

| Proveedor | Precio | Nivel gratuito | ¿Tarjeta? | Uso comercial | Costos por uso | Backups | Dificultad | Riesgo de cargos inesperados |
|---|---|---|---|---|---|---|---|---|
| **Cloudflare R2** | USD 0,015/GB-mes | 10 GB-mes, 1M de operaciones Clase A y 10M de Clase B por mes. **Egress gratis** | **No verificado** (R2 suele pedir un medio de pago para activarse; confirmar) | Sí (servicio comercial) | Clase A: USD 4,50/millón. Clase B: USD 0,36/millón. El uso se redondea hacia arriba | Sin versionado automático; hay que configurarlo | Baja/Media (API S3) | Muy bajo para el catálogo de una cafetería |
| **Backblaze B2** | USD 6,95/TB-mes | **10 GB gratis siempre**. Egress gratis hasta 3 veces el almacenamiento promedio; después USD 0,01/GB | No verificado | Sí | Clases A, B y C gratis. Clase D: USD 0,004 por 10.000 (2.500/día gratis) | Versionado configurable | Media | Bajo |
| **Supabase Storage** | Incluido en el plan | Free: 1 GB, sin excesos. Pro: 100 GB incluidos, luego USD 0,0213/GB-mes | No (Free) | No verificado | Las transformaciones de imagen tienen costo (tarifa **No verificado**) | — | Baja | Bajo. Recuerde que los proyectos Free se pausan por inactividad |
| **AWS S3** | Standard: precio por GB **No verificado** (la tabla no cargó). GET: USD 0,0004 por 1.000 | Cuentas nuevas desde el 15-jul-2025: **hasta USD 200 en créditos**. El plan gratuito dura 6 meses (es un **trial**, no un free tier permanente). 100 GB/mes de salida gratis | Sí | Sí | Salida a Internet: USD 0,09/GB (ejemplo de Irlanda) | Versionado configurable | Media/Alta (IAM, políticas) | **Medio**: muchos conceptos facturables |

Fuentes:
- R2: https://developers.cloudflare.com/r2/pricing/
- B2: https://www.backblaze.com/cloud-storage/pricing
- Supabase Storage: https://supabase.com/docs/guides/storage/pricing
- S3: https://aws.amazon.com/s3/pricing/

---

## 5. Paquetes recomendados (costo mensual estimado, solo con cifras verificadas)

> Los rangos no incluyen IVA ni comisiones bancarias por pagos internacionales con tarjeta. El dominio se detalla en `dominio.md`.

### A. Económica (piloto o MVP): ≈ USD 7 a 8/mes
| Componente | Elección | Costo |
|---|---|---|
| Frontend | Cloudflare Pages Free | USD 0 |
| Backend | Render, instancia de USD 7 (siempre encendida) en workspace Hobby | USD 7 |
| Base de datos | Neon Free (1 GB, se suspende a los 5 min sin uso, sin restauración instantánea) | USD 0 |
| Imágenes | Cloudflare R2 (dentro de 10 GB) | USD 0 |
| Dominio .com | ≈ USD 10,46 a 11,08/año (≈ USD 0,9/mes) | ≈ USD 0,9 |

Riesgos: los backups de Neon Free son mínimos. **Hay que programar un `pg_dump` diario propio.** El ancho de banda de Render Hobby es de 5 GB/mes, así que las imágenes deben servirse desde R2 y no desde el backend.
*(Una variante 100 % gratuita, con Render Free y Neon Free, es posible solo para demostraciones: el backend se apaga y tarda ~1 min en despertar.)*

### B. Intermedia (operación real, poco tráfico): ≈ USD 13 a 16/mes
| Componente | Elección | Costo |
|---|---|---|
| Frontend | Cloudflare Pages Free | USD 0 |
| Backend | Render, instancia de USD 7 | USD 7 |
| Base de datos | Render Postgres 256 MB (USD 6) + almacenamiento extra de 0 a 10 GB a USD 0,30/GB | USD 6 a 9 |
| Imágenes | R2 | USD 0 a 1 |
| Dominio | .com (≈ USD 0,9/mes) o .com.bo (Bs 280/año ≈ Bs 23/mes) | ≈ USD 0,9 a 2 |

Ventaja: PITR de 3 días y backups lógicos de 7 días incluidos. Todo queda en un solo panel.
Alternativa con mejor precio y más RAM: VPS Hetzner CX23 (€5,49 + IPv4) o Contabo (€4,40 a 5,50), con Postgres en el mismo VPS. **Requiere administrar el servidor y los backups.**

### C. Profesional: ≈ USD 72 a 80/mes
| Componente | Elección | Costo |
|---|---|---|
| Frontend | Cloudflare Pages Free (o Workers Paid USD 5 si hace falta lógica en el edge) | USD 0 a 5 |
| Workspace | Render Pro (PITR de 7 días, 25 GB de ancho de banda) | USD 25 |
| Backend | Render 1 CPU / 2 GB | USD 25 |
| Base de datos | Render Postgres 0.5 CPU / 1 GB + ~10 GB a USD 0,30 | USD 19 + ≈3 |
| Imágenes | R2 | USD 0 a 2 |

Alternativa: DigitalOcean Managed PostgreSQL (USD 15,15) + Droplet. Azure solo si el equipo domina Azure y vigila el fin de los 12 meses gratuitos.

**Revisar siempre:** alertas de facturación, límites de gasto y la fecha de vencimiento de cualquier trial (Render Postgres Free: 30 días; Railway: 30 días; Azure: 30 días de crédito y 12 meses de servicios gratuitos; AWS: 6 meses).
