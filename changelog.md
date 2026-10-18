# Changelog

## [Unreleased]

### Added

- Aplicación Next.js inicial con formulario de login conectado a la API.
- Cliente para almacenar tokens y renovar el access token mediante refresh.
- Guía visual cálida con dashboard autenticado, logout y tema oscuro.
- Dashboard conectado al resumen mensual y registro rápido de gastos.
- Panel de gestión para ingresos, sobres, categorías, pagos recurrentes,
  gastos futuros, transferencias y cierre mensual.
- Inputs de dinero con símbolo, moneda seleccionable y gestión de cotizaciones.
- Sección `Economía` y vencimientos con controles de fecha estilizados.
- Vistas de sobres, saldos disponibles e historial filtrable de movimientos.
- Navegación de Economía reorganizada y campos de dinero con prefijo visual.
- Calendario mensual de vencimientos con el día actual resaltado.
- Footer global con la versión de la aplicación.
- Estados de pago y confirmación directa desde el calendario.
- Acciones para editar o eliminar sobres desde la vista de sobres.
- Paleta de colores predefinida disponible al crear y editar sobres.
- Tarjeta punteada para agregar un sobre al final de la grilla de sobres.
- Vista alternativa en lista y ordenamiento por nombre, color o montos de sobres.
- Modal para crear sobres desde la tarjeta de alta, con cierre al guardar.
- Modo lista de sobres con formato tabular compacto y encabezados de columna.

### Fixed

- La lista de categorías se actualiza al crear una y muestra errores de la API.
- La creación de sobres permite dejar vacía la meta planificada.
- Nueva sección de Inventario con existencias, vencimientos y compras conectadas a Economía.
- Página principal autenticada con saldo, pagos próximos y alertas de inventario.
- Tablas de inventario, filtros, subcategorías, carga masiva e historial de compras editable.
- Notificaciones emergentes globales para confirmar acciones.
- Compra masiva por línea, iconos emoji, tablas vacías informativas y acciones de inventario mejoradas.

### Added

- Perfil de export estático para Capacitor y capa de almacenamiento seguro de sesión en Android.
- Notificaciones globales temporales integradas también al login y acciones directas de Economía.
- Responsive móvil mejorado para navegación, tablas, formularios, calendario y modales.
- Header móvil reorganizado con menú lateral para Inicio, Economía e Inventario.
- Pestaña de Mercado Pago para vincular movimientos externos con sobres internos.
- Botón de sincronización manual y vista de reservas de Mercado Pago.

### Fixed

- La interfaz diferencia meta planificada, monto asignado y dinero disponible.
