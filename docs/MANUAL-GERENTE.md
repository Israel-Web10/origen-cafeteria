# Manual del gerente

Entra en `https://tu-dominio.com/login` con tu cuenta. El menú lateral del panel tiene todas las secciones.
El **gerente** gestiona la operación diaria; el **administrador** además gestiona usuarios, métodos de pago
nuevos y la auditoría.

## Puesta en marcha (una sola vez)

1. **Configuración → Negocio y contacto**: nombre, razón social, NIT, dirección, ciudad, coordenadas
   (desde Google Maps: clic derecho → copiar coordenadas), teléfono, WhatsApp, correo y redes.
2. **Configuración → Horarios**: rangos por día (hasta 3). Un día sin rangos aparece como cerrado.
3. **Imágenes**: sube el logotipo (tipo *Logotipo*), el favicon, fotos reales del local (*Instalaciones*)
   y, si quieres, una portada propia (*Portada*). Indica fuente y licencia; marca "ilustrativa" si no es el local.
4. **Configuración → Identidad visual**: elige logo, favicon, portada, video, paleta de colores y los textos
   de portada en los tres idiomas. Revisa la vista previa y pulsa **Publicar cambios**.
5. **Configuración → Métodos de pago**: sube el **QR oficial** generado por la app de tu banco y actívalo;
   revisa las instrucciones de efectivo. La tarjeta permanece desactivada hasta contratar una pasarela.
6. **Configuración → Pedidos y entrega**: activa recojo y/o delivery, pedido mínimo y zonas con su costo.
7. **Contenido**: completa *Nuestra historia*, *La cafetería* y *Preguntas frecuentes*. Las páginas
   legales son plantillas: **hazlas revisar** antes de publicarlas.
8. **Categorías → Productos**: crea la carta. Para cada producto: precio, costo (para márgenes), variantes
   (tamaños, tipos de leche), traducciones, imagen y si se controla stock por unidades.
9. **Inventario**: crea los insumos (café en grano en g, leche en ml, vasos en unidades…), registra una
   **entrada** con la cantidad inicial y el costo, y en **Productos → Receta** indica cuánto consume cada venta.

## Día a día

### Pedidos
- **Pedidos** se actualiza solo cada 30 segundos. Entra a un pedido para avanzar su estado:
  pendiente → confirmado → en preparación → listo → (en camino) → entregado.
- Para **cancelar** escribe el motivo; el inventario se repone automáticamente.

### Pagos
- **Pagos** muestra primero los que están **en verificación**.
- **QR**: abre el comprobante y compáralo con el movimiento real en tu banco (monto y referencia).
  Solo entonces pulsa **Verificar**. Si no aparece, **Rechazar** con motivo: el cliente puede reenviarlo.
- **Efectivo**: al cobrar, pulsa *Verificar* e indica el importe recibido; el sistema calcula el cambio.
- **Reembolsos**: devuelve el dinero por tu banco o en efectivo y regístralo con *Registrar reembolso*.
- Un comprobante enviado **no es** un pago confirmado.

### Inventario
- **Entrada**: compras (cantidad, costo total, proveedor, vencimiento opcional).
- **Ajuste**: conteo físico; escribes lo que contaste y el sistema calcula la diferencia.
- **Merma**: pérdidas (vencido, derramado…) con motivo.
- Los movimientos no se editan ni borran. Si te equivocas, registra un ajuste.
- **Alertas**: insumos bajo el mínimo y lotes próximos a vencer.

### Promociones
Descuento en % o monto fijo para un producto o una categoría, con fecha de inicio y fin. Se aplica solo
durante la vigencia y lo calcula el sistema.

### Monedas
Los precios y cobros son siempre en bolivianos. Si quieres mostrar precios **aproximados** en USD/EUR:
activa la moneda, registra el tipo de cambio con su **fuente** (p. ej. el tipo oficial del BCB del día) y
activa "Mostrar precios aproximados". Actualízalo cuando cambie; cada pedido guarda la tasa que se mostró.

## Panel y reportes

- **Panel**: elige periodo (diario a anual o personalizado) y filtros. Si el periodo está en curso, la
  comparación se hace con el mismo tramo del periodo anterior. La **demanda estimada** solo aparece con al
  menos 28 días de ventas y es una estimación, no una certeza. **ABC**: A = productos que suman el 80 % de
  las ventas.
- **Reportes**: elige tipo, periodo, filtros e idioma y descarga **PDF** o **Excel**. Incluyen logotipo,
  periodo, filtros, usuario, moneda, totales y gráfico cuando corresponde.

## Seguridad básica

- No compartas tu cuenta: pide al administrador una cuenta propia para cada persona.
- Si alguien olvida su contraseña, el administrador la restablece en **Usuarios y roles** (la temporal se
  muestra una sola vez; entrégala por un canal seguro y pide que la cambien en *Mi perfil*).
- Cuando alguien deje el negocio, el administrador debe **desactivar** su cuenta (cierra sus sesiones al instante).
