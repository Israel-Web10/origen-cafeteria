// Contenido INICIAL de las páginas editables. Se inserta una sola vez
// (npm run setup) y después el gerente lo edita desde el panel.
//
// IMPORTANTE: los textos legales son PLANTILLAS de buenas prácticas y NO
// garantizan el cumplimiento normativo. Deben revisarlos un abogado y un
// contador bolivianos antes de publicarse (ver docs/LEGAL.md).
// Formato: Markdown limitado (## títulos, párrafos, listas "- ", **negrita**).

const REVIEW = {
  es: '> **Plantilla pendiente de revisión legal.** Este texto no constituye asesoramiento jurídico ni garantiza el cumplimiento normativo.',
  en: '> **Template pending legal review.** This text is not legal advice and does not guarantee regulatory compliance.',
  fr: '> **Modèle en attente de révision juridique.** Ce texte ne constitue pas un conseil juridique et ne garantit pas la conformité réglementaire.',
};

module.exports = {
  history: {
    es: { title: 'Nuestra historia', body: `ORIGEN nació de una idea sencilla: el café, el chocolate y el cacao merecen cuidado en cada paso, desde quien los cultiva hasta la taza.

## De origen a taza
Trabajamos con granos seleccionados y los preparamos al momento. Cada bebida se hace a mano, sin prisas.

## Cacao y chocolate
Bolivia tiene una tradición cacaotera extraordinaria. Queremos que cada chocolate caliente cuente esa historia.

*El gerente puede editar este texto desde el panel: Contenido → Nuestra historia.*` },
    en: { title: 'Our story', body: `ORIGEN was born from a simple idea: coffee, chocolate and cacao deserve care at every step, from the grower to the cup.

## From origin to cup
We work with selected beans and prepare every drink to order, by hand.

## Cacao and chocolate
Bolivia has an extraordinary cacao tradition. We want every hot chocolate to tell that story.` },
    fr: { title: 'Notre histoire', body: `ORIGEN est né d'une idée simple : le café, le chocolat et le cacao méritent du soin à chaque étape, du producteur jusqu'à la tasse.

## De l'origine à la tasse
Nous travaillons avec des grains sélectionnés et préparons chaque boisson à la main, à la commande.

## Cacao et chocolat
La Bolivie possède une tradition cacaoyère extraordinaire. Chaque chocolat chaud raconte cette histoire.` },
  },
  facilities: {
    es: { title: 'La cafetería', body: `Un espacio cálido para trabajar, conversar o simplemente bajar el ritmo.

## Espacios
- Barra de café con vista a la preparación
- Mesas para grupos y rincones tranquilos
- Wi-Fi para clientes

*Las fotografías oficiales del local se administran en el panel: Imágenes → Instalaciones.*` },
    en: { title: 'The café', body: `A warm space to work, talk or simply slow down.

## Spaces
- Coffee bar with a view of the preparation
- Tables for groups and quiet corners
- Wi-Fi for guests` },
    fr: { title: 'Le café', body: `Un espace chaleureux pour travailler, discuter ou simplement ralentir.

## Espaces
- Bar à café avec vue sur la préparation
- Tables pour les groupes et coins calmes
- Wi-Fi pour les clients` },
  },
  faq: {
    es: { title: 'Preguntas frecuentes', body: `## ¿Cómo hago un pedido?
Elige tus productos en la carta, revisa el carrito y confirma en el checkout. Recibirás un número de pedido y un enlace de seguimiento.

## ¿Qué métodos de pago aceptan?
Los que estén activos en el checkout (por ejemplo QR bancario o efectivo). Los pagos QR se verifican manualmente; tu pedido se confirma cuando el equipo valida el pago.

## ¿Puedo cancelar mi pedido?
Sí, mientras esté en estado "pendiente". Después, contáctanos directamente.

## ¿En qué moneda se cobra?
En bolivianos (Bs). Si ves precios en otra moneda, son solo referenciales.` },
    en: { title: 'Frequently asked questions', body: `## How do I order?
Choose products from the menu, review your cart and confirm at checkout. You will receive an order number and a tracking link.

## Which payment methods do you accept?
Those enabled at checkout (e.g. bank QR or cash). QR payments are verified manually; your order is confirmed once the team validates the payment.

## Can I cancel my order?
Yes, while it is "pending". After that, please contact us directly.

## Which currency do you charge in?
Bolivianos (Bs). Prices shown in other currencies are for reference only.` },
    fr: { title: 'Questions fréquentes', body: `## Comment passer commande ?
Choisissez vos produits dans la carte, vérifiez le panier et confirmez. Vous recevrez un numéro de commande et un lien de suivi.

## Quels moyens de paiement acceptez-vous ?
Ceux activés lors du paiement (par ex. QR bancaire ou espèces). Les paiements QR sont vérifiés manuellement.

## Puis-je annuler ma commande ?
Oui, tant qu'elle est « en attente ». Ensuite, contactez-nous directement.

## Dans quelle devise payez-vous ?
En bolivianos (Bs). Les prix affichés dans d'autres devises sont indicatifs.` },
  },
  privacy: {
    es: { title: 'Política de privacidad', body: `${REVIEW.es}

## Responsable
ORIGEN (razón social y NIT indicados en el pie de página). Contacto: el correo y teléfono publicados en la página de contacto.

## Qué datos recogemos y para qué
- **Pedidos:** nombre, teléfono y, si eliges entrega a domicilio, dirección. Finalidad: preparar, entregar y comunicarnos sobre tu pedido.
- **Cuenta (opcional):** nombre, correo y contraseña (guardada cifrada con un algoritmo de hash, nunca en texto plano). Finalidad: historial de pedidos.
- **Pagos QR:** referencia y comprobante que decidas adjuntar. Finalidad: verificar el pago. Los comprobantes no son públicos.
- **No guardamos** números de tarjeta, CVV ni PIN.

## Conservación
Los datos de contacto se conservan mientras tengas una cuenta o durante el plazo necesario para atender el pedido y las obligaciones contables aplicables. Los registros de venta pueden conservarse de forma anonimizada.

## Encargados y ubicación de los servidores
La plataforma puede alojarse en proveedores de infraestructura que operan servidores fuera de Bolivia. La lista actualizada de proveedores se publicará aquí antes de la puesta en producción.

## Tus derechos
Puedes descargar tus datos y eliminar tu cuenta desde "Mi perfil", o escribirnos para pedir acceso, rectificación o eliminación. La Constitución Política del Estado reconoce el derecho a la privacidad y la acción de protección de privacidad.

## Cambios
Publicaremos cualquier cambio en esta página indicando la fecha de actualización.` },
    en: { title: 'Privacy policy', body: `${REVIEW.en}

## Controller
ORIGEN (legal name and tax ID shown in the footer). Contact details are on the contact page.

## What we collect and why
- **Orders:** name, phone and, for delivery, address — to prepare, deliver and contact you about your order.
- **Account (optional):** name, email and password (stored as a one-way hash, never in plain text) — for order history.
- **QR payments:** the reference and receipt you choose to attach — to verify payment. Receipts are not public.
- **We never store** card numbers, CVV or PIN.

## Retention
Contact data is kept while you have an account or as long as needed for the order and applicable accounting obligations. Sales records may be kept in anonymised form.

## Processors and server location
The platform may be hosted by infrastructure providers with servers outside Bolivia. The up-to-date list will be published here before going live.

## Your rights
You can download your data and delete your account from "My profile", or contact us to request access, correction or deletion.` },
    fr: { title: 'Politique de confidentialité', body: `${REVIEW.fr}

## Responsable
ORIGEN (raison sociale et NIT indiqués en pied de page). Coordonnées sur la page contact.

## Données collectées et finalités
- **Commandes :** nom, téléphone et, en cas de livraison, adresse — pour préparer, livrer et vous contacter.
- **Compte (facultatif) :** nom, e-mail et mot de passe (stocké sous forme de hachage, jamais en clair) — pour l'historique.
- **Paiements QR :** la référence et le justificatif que vous joignez — pour vérifier le paiement. Les justificatifs ne sont pas publics.
- **Nous ne conservons jamais** de numéro de carte, CVV ou code PIN.

## Conservation
Les coordonnées sont conservées tant que votre compte existe ou le temps nécessaire à la commande et aux obligations comptables.

## Vos droits
Vous pouvez télécharger vos données et supprimer votre compte depuis « Mon profil », ou nous contacter.` },
  },
  cookies: {
    es: { title: 'Política de cookies', body: `${REVIEW.es}

## Qué usamos
Esta web usa únicamente almacenamiento **estrictamente necesario** en tu navegador:
- **Sesión** (si inicias sesión): mantener tu cuenta abierta.
- **Carrito**: recordar los productos que agregaste.
- **Preferencias**: idioma, moneda de referencia y tu elección sobre cookies.

## Analítica y publicidad
Actualmente **no** usamos cookies analíticas ni publicitarias de terceros. Si en el futuro se activan, solo se cargarán después de que las aceptes, y podrás cambiar tu elección en cualquier momento desde "Preferencias de cookies" en el pie de página.` },
    en: { title: 'Cookie policy', body: `${REVIEW.en}

## What we use
This site only uses **strictly necessary** browser storage:
- **Session** (if you sign in), **cart**, and **preferences** (language, reference currency and your cookie choice).

## Analytics and advertising
We currently do **not** use third-party analytics or advertising cookies. If enabled in the future, they will only load after you accept, and you can change your choice at any time from "Cookie preferences" in the footer.` },
    fr: { title: 'Politique de cookies', body: `${REVIEW.fr}

## Ce que nous utilisons
Ce site n'utilise que du stockage **strictement nécessaire** : **session** (si vous vous connectez), **panier** et **préférences** (langue, devise de référence, choix concernant les cookies).

## Mesure d'audience et publicité
Nous n'utilisons **pas** actuellement de cookies d'analyse ou publicitaires tiers. S'ils sont activés à l'avenir, ils ne seront chargés qu'après votre accord, modifiable à tout moment via « Préférences cookies » en pied de page.` },
  },
  terms: {
    es: { title: 'Términos y condiciones', body: `${REVIEW.es}

## Uso de la plataforma
Esta web permite consultar la carta de ORIGEN y realizar pedidos para recoger en el local o, si está habilitado, para entrega a domicilio.

## Precios
Los precios oficiales están en bolivianos (Bs) e incluyen los impuestos aplicables salvo que se indique lo contrario. Los importes en otras monedas son **solo referenciales**, calculados con un tipo de cambio publicado por el negocio con su fecha y fuente; el cobro se realiza en Bs.

## Pedidos
El pedido se considera aceptado cuando su estado pasa a "confirmado". ORIGEN puede rechazar o cancelar un pedido por falta de disponibilidad, error evidente de precio o imposibilidad de verificar el pago, informando al cliente.

## Pagos
Los pagos por QR se verifican manualmente; adjuntar un comprobante no confirma el pago por sí solo.

## Facturación
La emisión de facturas se realizará conforme a la normativa del Servicio de Impuestos Nacionales aplicable al negocio.

## Contacto y reclamos
Para cualquier reclamo, utiliza los datos de contacto publicados.` },
    en: { title: 'Terms and conditions', body: `${REVIEW.en}

## Prices
Official prices are in bolivianos (Bs). Amounts in other currencies are **for reference only**; payment is charged in Bs.

## Orders
An order is accepted when its status becomes "confirmed". ORIGEN may decline or cancel an order due to unavailability, an obvious pricing error or inability to verify payment, informing the customer.

## Payments
QR payments are verified manually; attaching a receipt does not by itself confirm payment.` },
    fr: { title: 'Conditions générales', body: `${REVIEW.fr}

## Prix
Les prix officiels sont en bolivianos (Bs). Les montants dans d'autres devises sont **indicatifs** ; le paiement est effectué en Bs.

## Commandes
Une commande est acceptée lorsque son statut passe à « confirmée ». ORIGEN peut refuser ou annuler une commande (indisponibilité, erreur manifeste de prix, paiement non vérifiable) en informant le client.

## Paiements
Les paiements QR sont vérifiés manuellement ; joindre un justificatif ne confirme pas à lui seul le paiement.` },
  },
  refunds: {
    es: { title: 'Cambios, cancelaciones y reembolsos', body: `${REVIEW.es}

## Cancelaciones
- Puedes cancelar tu pedido desde su página de seguimiento mientras esté **pendiente**.
- Si ya está en preparación, contáctanos; por tratarse de alimentos preparados al momento, puede no ser posible cancelarlo.

## Reembolsos
- Si pagaste y el pedido se cancela por causa de ORIGEN (falta de producto, imposibilidad de entrega), se reembolsa el importe pagado por el mismo medio o el que se acuerde.
- Cada reembolso queda registrado en el sistema con fecha, motivo y responsable.

## Productos con problemas
Si un producto llega en mal estado o no corresponde a lo pedido, avísanos lo antes posible con tu número de pedido.` },
    en: { title: 'Changes, cancellations and refunds', body: `${REVIEW.en}

- You can cancel your order from its tracking page while it is **pending**.
- If it is already being prepared, contact us; freshly made food may not be cancellable.
- If you paid and the order is cancelled for reasons attributable to ORIGEN, the amount paid is refunded. Each refund is recorded with date, reason and responsible person.` },
    fr: { title: 'Modifications, annulations et remboursements', body: `${REVIEW.fr}

- Vous pouvez annuler votre commande depuis sa page de suivi tant qu'elle est **en attente**.
- Si elle est déjà en préparation, contactez-nous.
- Si vous avez payé et que la commande est annulée pour une raison imputable à ORIGEN, le montant est remboursé. Chaque remboursement est enregistré.` },
  },
  'order-conditions': {
    es: { title: 'Condiciones de pedido', body: `${REVIEW.es}

- Los precios y totales los calcula el sistema en el momento de confirmar el pedido.
- Los tiempos de preparación y entrega son estimados.
- Para entrega a domicilio puede aplicarse un costo de envío según la zona y un pedido mínimo.
- Guarda tu número de pedido y el enlace de seguimiento: los necesitarás para consultar el estado o informar tu pago.` },
    en: { title: 'Order conditions', body: `${REVIEW.en}

- Prices and totals are calculated by the system when the order is confirmed.
- Preparation and delivery times are estimates.
- Delivery may include a zone-based fee and a minimum order.
- Keep your order number and tracking link.` },
    fr: { title: 'Conditions de commande', body: `${REVIEW.fr}

- Les prix et totaux sont calculés par le système lors de la confirmation.
- Les délais de préparation et de livraison sont estimatifs.
- La livraison peut inclure des frais selon la zone et un minimum de commande.
- Conservez votre numéro de commande et le lien de suivi.` },
  },
};
