# Diagramas UML de ORIGEN

Fuentes editables de los diagramas del informe de análisis y diseño. Se elaboraron a partir del código y la
base de datos reales (versión 2.3.1). Si cambia el sistema, actualiza el diagrama correspondiente.

- `.mmd`: [Mermaid](https://mermaid.js.org). Se pueden ver y editar en GitHub (lo muestra como diagrama), en
  VS Code con una extensión de Mermaid o en https://mermaid.live.
- `.svg`: diagramas de casos de uso dibujados a mano en SVG (actores, elipses, «include»/«extend»); se abren
  en cualquier navegador.

| N.º | Diagrama | Archivo |
|---|---|---|
| 01 | Proceso de desarrollo iterativo e incremental | `01-proceso.mmd` |
| 02 | Diagrama de casos de uso: cliente | `02-cu-cliente.svg` |
| 03 | Diagrama de casos de uso: gerente y administrador | `03-cu-personal.svg` |
| 04 | Diagrama de actividades: realizar un pedido | `04-act-pedido.mmd` |
| 05 | Diagrama de actividades: verificación de un pago QR | `05-act-qr.mmd` |
| 06 | Diagrama de secuencia: crear un pedido | `06-secuencia.mmd` |
| 07 | Diagrama de estados: pedido | `07-estados-pedido.mmd` |
| 08 | Diagrama de estados: estado de pago del pedido | `08-estados-pago.mmd` |
| 09 | Diagrama de clases: modelo de dominio | `09-clases.mmd` |
| 10 | Modelo entidad–relación (tablas principales de PostgreSQL) | `10-er.mmd` |
| 11 | Diagrama de componentes (arquitectura en capas) | `11-componentes.mmd` |
| 12 | Diagrama de despliegue (opción gestionada recomendada) | `12-despliegue.mmd` |
| 13 | Diagrama de actividades: control de calidad en cada cambio | `13-ci.mmd` |
| 14 | Administración desde el celular: opciones sobre la misma API | `14-movil.mmd` |
