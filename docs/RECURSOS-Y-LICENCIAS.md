# Recursos visuales y licencias

## Recursos incluidos en el repositorio

| Archivo | Origen | Uso | Licencia / estado |
|---|---|---|---|
| `frontend/public/media/cafe-interior-720.mp4` / `.webm` / `-poster.webp` | Convertido desde `201947-916877801.mp4` entregado por el propietario (4K, 30 s, 24 MB → 1,1 MB) | Escena de portada | **A confirmar por el propietario.** El nombre del archivo sugiere un video de banco gratuito (posiblemente Pixabay). Se muestra con la etiqueta "imagen ilustrativa" porque **no es el local real** |
| `frontend/public/media/cafe-fireplace-720.mp4` / `-poster.webp` | Convertido desde `279679.mp4` entregado por el propietario (4K, 95 MB → 0,5 MB) | Historia | Igual que el anterior: confirmar licencia; marcado como ilustrativo |
| Logotipo `LogoMark` y decoraciones (grano de café, mazorca de cacao, chocolate, vapor) | Dibujados en SVG para este proyecto (`frontend/src/components/Brand.tsx`) | Marca provisional y escena 3D | Creación original del proyecto |
| Fuentes Fraunces, Inter, JetBrains Mono | Google Fonts | Tipografía | SIL Open Font License 1.1 |
| Mapa de "Visítanos" | OpenStreetMap (iframe de exportación) | Ubicación | Datos © colaboradores de OpenStreetMap (ODbL). Uso ligero conforme a su política de mosaicos; con mucho tráfico conviene un proveedor de mapas propio |

### Fotografías de la carta (`frontend/public/media/menu/*.webp`)

Descargadas de Unsplash el 2026-10-23 y convertidas a WebP 900×675. Licencia Unsplash: uso comercial
permitido, sin atribución obligatoria (se acredita igualmente). **Son ilustrativas: no muestran los
productos reales de ORIGEN**; conviene reemplazarlas por fotos propias desde *Productos*.

| Archivo | Autor (Unsplash) |
|---|---|
| `espresso.webp` | Binit Sharma |
| `cappuccino.webp` | Nathan Dumlao |
| `cafe-origen.webp` | Shannon Douglas |
| `hot-chocolate.webp`, `mocaccino.webp` | Rachael Gorjestani |
| `iced-latte.webp` | Demi DeHerrera |
| `frappe.webp` | Najib Chari |
| `croissant.webp` | Juliana Barquero |
| `brownie.webp` | Toa Heftiba |
| `breakfast.webp` | Ben Kolde |
| `beans.webp` | Indra Projects |
| `latte-art.webp` | Jason W |

**Ampliación 2026-10-24** (misma licencia, mismas condiciones: ilustrativas, reemplazables desde el panel):

| Archivo | Autor (Unsplash) | Uso |
|---|---|---|
| `americano.webp` | Julia Florczak | Americano |
| `latte.webp` | tabitha turner | Latte |
| `macchiato.webp` | Jeremy Yap | Macchiato |
| `cold-brew.webp` | tabitha turner | Cold brew |
| `smoothie.webp` | Denis | Smoothie de frutos rojos |
| `cheesecake.webp` | Kelsey Todd | Cheesecake |
| `cookies.webp` | Mae Mu | Galletas |
| `empanadas.webp` | Ana Beatriz | Empanadas de queso |
| `avocado-toast.webp` | Tabita Princesia | Tostada con palta |
| `espresso-2.webp` | Nathan Dumlao | Galería del Espresso |
| `cafe-origen-2.webp` | Eduardo Gorghetto | Galería del Café Origen |
| `hot-chocolate-2.webp` | Ly Le Minh | Galería del chocolate caliente |
| `cappuccino-2.webp` | tabitha turner | Galería del Cappuccino |
| `historia/cafetal.webp` | PROJETO CAFÉ GATO-MOURISCO | Nuestra historia |
| `historia/cosecha.webp` | The Manh | Nuestra historia |
| `historia/cacao.webp` | Aleksandar Popovski | Nuestra historia |
| `historia/tostado.webp` | Tim Mossholder | Nuestra historia |
| `historia/granos.webp` | Tina Guina | Nuestra historia |
| `banners/promociones.webp` | Ahmet Yüksek | Encabezado de Promociones |

Se descartaron candidatas con marcas visibles (galleta Lotus/Biscoff, frasco con relieve de marca) y una de
un tostador comercial (cuenta de una marca de café).

### Videos de fondo (`frontend/public/media/video/`)

Descargados de **Mixkit** el 2026-10-24. Cada uno verificado en su página con la **Mixkit Stock Video Free
License** (uso comercial permitido, sin atribución obligatoria; no se pueden revender sueltos). Recortados
a 12 s, 1280 px, sin audio (0,3–1 MB cada uno). Se muestran solo en pantallas ≥ 768 px, sin "ahorro de
datos" ni movimiento reducido; en móvil se ve el póster (imagen fija).

| Archivo | Clip de Mixkit | Página |
|---|---|---|
| `carta.mp4` | Serving a sparkling cappuccino in a cup (41859) | Nuestra carta |
| `historia.mp4` | Coffee beans falling on a layer of more beans (4982) | Nuestra historia |
| `promociones.mp4` | A barista preparing coffee with milk and ice (796) | Promociones |
| `cafeteria.mp4` | Latte art (810) | La cafetería |

**GIF:** no se usan. Un GIF animado pesa entre 5 y 10 veces más que el mismo clip en MP4 y se ve peor; los
videos cortos en bucle cumplen la misma función.

### Galería y portada

| Archivo | Origen | Estado |
|---|---|---|
| `frontend/public/media/gallery/*.webp` (5) | Fotogramas extraídos de los dos videos entregados por el propietario | Misma licencia que los videos (**a confirmar**); se cargan marcados como **ilustrativos** |
| Fachada de la portada y mapa ilustrado | Dibujados en SVG para este proyecto (`frontend/src/components/StreetScene.tsx`): edificio, Illimani, calles. No es el local real y la web lo indica | Creación original. Se reemplaza por una foto real desde *Configuración → Marca* |

**Higgsfield:** no estaba disponible en el entorno de desarrollo; no se generaron imágenes con IA.

## Recursos recibidos que NO se incluyeron

| Recurso | Motivo |
|---|---|
| Logotipo de taza con marca de agua **pngtree** | Tiene marca de agua: su uso comercial requiere licencia de pago de pngtree. Si el negocio la compra, puede subirlo desde *Imágenes → Logotipo* |
| Fotografías de fachadas de bancos de imágenes evaluadas para la portada | Mostraban el rótulo y la marca de **otros cafés reales** (y en un caso una estatua con contenido inapropiado). Se descartaron y se dibujó una fachada original |
| Fotografía de interior con el rótulo **"ANTICAFÉ"** | Corresponde a otro negocio; publicarla como si fuera ORIGEN sería engañoso y puede infringir derechos de autor y de marca |

## Cómo registrar nuevas imágenes

Al subir una imagen en el panel se puede indicar **fuente**, **licencia** y si es **ilustrativa**
(entonces la web muestra la etiqueta "Imagen ilustrativa"). Usa fotografías propias del local siempre que sea
posible; si usas bancos de imágenes, guarda la licencia y el enlace de descarga.

## Herramientas usadas en la conversión de video

`ffmpeg` (paquete `ffmpeg-static`, usado solo en el equipo de desarrollo; no forma parte del proyecto):
H.264 CRF 28 y VP9 CRF 40 a 1280 px de ancho, 24 fps, sin audio, con `faststart` para reproducción progresiva.

## Dependencias de software

Todas las dependencias son de código abierto (MIT, Apache-2.0, ISC o BSD), instaladas desde npm. Ninguna
requiere pago ni clave externa. El SDK de S3 (`@aws-sdk/client-s3`, Apache-2.0) solo se carga si se activa
`STORAGE_DRIVER=s3`.
