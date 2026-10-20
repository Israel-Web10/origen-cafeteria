# Marco legal aplicable (Bolivia): datos personales, comercio electrónico, consumidor, facturación y cookies

> **Fecha de consulta:** 2026-10-20.
> **Aviso:** este documento es una investigación técnica preliminar y **no es asesoramiento legal ni contable**. Las políticas que se redacten con base en él **no garantizan el cumplimiento normativo**. Los puntos marcados con ⚖️ **deben revisarlos un abogado boliviano**, y los marcados con 🧾 **un contador o asesor tributario boliviano**.

## 1. Protección de datos personales

| Norma | Qué aporta | Estado | Fuente |
|---|---|---|---|
| **Constitución Política del Estado (CPE), art. 21** | Reconoce el derecho a la privacidad, la intimidad, la honra y la propia imagen | Vigente | Texto oficial de la CPE (Gaceta Oficial). Numeración ⚖️ a confirmar |
| **CPE, arts. 130 y 131: Acción de Protección de Privacidad** (antes *habeas data*) | Vía judicial individual para conocer, objetar o pedir la corrección o eliminación de datos registrados en archivos o bancos de datos públicos o privados | Vigente | Ídem ⚖️ |
| **Ley general de protección de datos personales** | **No existe a septiembre de 2026.** Hay al menos dos anteproyectos (de AGETIC y de la Fundación InternetBolivia.org), ninguno aprobado. No hay autoridad de control con poder sancionador | **No promulgada** (según la fuente más reciente encontrada, del 16-sep-2026). Cambios posteriores a esa fecha: **No verificado** ⚖️ | https://www.opinion.com.bo/tendencias/quien-queda-tus-datos-bolivia-todavia-tiene-ley-que-obligue-responder/20260916111314996213.html |
| **Ley N.° 164** (Ley General de Telecomunicaciones, Tecnologías de Información y Comunicación) y su reglamento TIC, **DS N.° 1793** (13-nov-2013), modificado por el DS 3527 (2018, firma digital) | Validez de documentos y firmas digitales, comercio electrónico y principios sobre datos personales en el ámbito TIC. Es la base que citan las guías internacionales a falta de una ley específica | Vigente. **Artículos concretos aplicables a una tienda en línea: No verificado** ⚖️ | Guía Lex Mundi: https://www.lexmundi.com/guides/data-privacy-guide/jurisdictions/latin-america/bolivia/ ; AGETIC: https://www.agetic.gob.bo/?p=2259 |

**Buenas prácticas recomendadas**, aunque no haya ley específica:
- Pedir solo los datos necesarios para el pedido (nombre, teléfono y, si se entrega a domicilio, dirección).
- Publicar una política de privacidad clara: responsable, finalidad, plazo de conservación, encargados (hosting, base de datos, pasarela de pago y **en qué países están los servidores**) y un canal para pedir acceso, corrección o eliminación.
- Consentimiento explícito y separado para fines de marketing (WhatsApp o correo).
- ⚖️ Confirmar si aplican normas sectoriales (por ejemplo, las de ASFI para datos financieros a través de la pasarela) y cómo responder a una Acción de Protección de Privacidad.

## 2. Comercio electrónico y documentos digitales

- Ley 164 y DS 1793: los mensajes, documentos y firmas digitales tienen validez jurídica en las condiciones que fija la norma. La **firma digital** requiere una entidad certificadora autorizada (relevante para la facturación electrónica en línea). ⚖️ Confirmar qué obligaciones de información al usuario impone el DS 1793 a quien vende en línea.
- Pasarelas de pago: el reglamento del BCB las define como agregadores o facilitadores vinculados a entidades financieras (ver `pagos-bolivia.md`). ⚖️

## 3. Derechos del consumidor

| Norma | Puntos relevantes para ORIGEN | Fuente |
|---|---|---|
| **CPE, art. 75** | Derecho del consumidor a información fidedigna sobre las características de productos y servicios | Citado en el DS 2130 |
| **Ley N.° 453** (Ley General de los Derechos de las Usuarias y los Usuarios y de las Consumidoras y los Consumidores, dic-2013) y su reglamento **DS N.° 2130** (2014) | Se aplica a proveedores de productos o servicios en relaciones de consumo. En la práctica: precios finales claros en Bs, descripción veraz (ingredientes y alérgenos recomendados), condiciones de cancelación o reembolso y atención de reclamos. El Viceministerio de Defensa de los Derechos del Usuario y del Consumidor (Ministerio de Justicia) era la autoridad en 2014; **estructura actual No verificada** | DS 2130: https://www.bcb.gob.bo/webdocs/normativa/2014%20-%20DS%202130%20-%20Reglamenta%20Ley%20N°%20453%20Consumidores.pdf ; Ley 453 (WIPO Lex): https://www.wipo.int/wipolex/es/legislation/details/14916 |

⚖️ Revisar con un abogado: libro de reclamaciones digital, plazos de respuesta a reclamos, política de devoluciones de alimentos y cómo deben exhibirse los precios.

## 4. Facturación electrónica (SIN)

- **Marco:** **RND N.° 102100000011** (Sistema de Facturación), dentro de la Ley 843 y el DS 21530. Modalidades en línea: **Electrónica en Línea** (con firma digital), **Computarizada en Línea** (con credenciales del contribuyente) y **Portal Web en Línea**. El art. 10 dice que el SIN define **por Resolución Normativa de Directorio qué contribuyentes están obligados**, por grupos. Versión compilada al 16-06-2025: https://www.impuestos.gob.bo/wp-content/uploads/2025/10/RND11.pdf
- **Plazo reciente:** la **RND 102600000007** (nota de prensa del SIN, 25-mar-2026) extendió **hasta el 30-sep-2026** el plazo para los grupos 9 a 12. **Desde el 1-oct-2026** esos contribuyentes solo pueden emitir facturas por la modalidad en línea que se les asignó. Fuente: https://www.impuestos.gob.bo/index.php/nota_prensa/el-sin-amplia-hasta-el-30-de-septiembre-el-plazo-para-la-implementacion-de-la-facturacion-en-linea/
- **Qué implica para la plataforma:**
  - 🧾 Confirmar con el contador si el NIT de la cafetería **pertenece a un grupo obligado** (o a qué régimen está sujeto) y qué modalidad tiene asignada.
  - Si debe facturar en línea, la plataforma puede: (a) usar el **Portal Web del SIN** manualmente (sin integración), (b) integrarse con un **sistema de facturación certificado de un proveedor**, o (c) desarrollar un sistema propio, que requiere **certificación del SIN** y pruebas en su ambiente. Las opciones (b) y (a) son las más realistas.
  - 🧾 Definir qué datos del cliente pedir (NIT o CI, razón social) y cómo emitir facturas por pedidos web y por pagos con QR.
  - El sistema de pedidos **no debe presentarse como un sistema de facturación** si no está certificado.

## 5. Cookies y analítica

- **No encontré normativa boliviana específica sobre cookies ni sobre banners de consentimiento** (**No verificado**: no existe una ley de datos personales que lo exija expresamente). ⚖️
- Recomendación práctica:
  - Usar solo cookies o `localStorage` **técnicamente necesarios** (sesión, carrito). Así no hace falta un banner de consentimiento complejo; basta un aviso en la política de privacidad.
  - Si se agregan analítica o píxeles publicitarios de terceros (Google Analytics, Meta), mostrar un banner que permita **rechazar** y no cargar esos scripts hasta que el usuario acepte. Es conservador, coherente con estándares internacionales (RGPD) y preparado para una futura ley boliviana.

## 6. Resumen de lo que requiere revisión profesional

| Tema | Responsable |
|---|---|
| Artículos exactos de la CPE, Ley 164 y DS 1793 aplicables, y texto de la política de privacidad | ⚖️ Abogado |
| Términos y condiciones, devoluciones y reclamos (Ley 453 / DS 2130) | ⚖️ Abogado |
| Contratos con bancos y pasarelas de pago | ⚖️ Abogado |
| Transferencia internacional de datos (servidores fuera de Bolivia) | ⚖️ Abogado |
| Obligación y modalidad de facturación en línea, grupo del NIT, emisión por pedidos web | 🧾 Contador |
| Tratamiento tributario de comisiones de pasarelas y del tipo de cambio | 🧾 Contador |
