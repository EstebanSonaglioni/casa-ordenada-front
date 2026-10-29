# Changelog

## [Unreleased]

### Added
- Sidebar persistente en escritorio y drawer responsive en móvil, con navegación activa e iconos.
- Sección de Tareas con pendientes, habituales, formulario de atributos
  opcionales y calendario mensual de ocurrencias.
- Registro de usuarios, asistente inicial de casa y campana de invitaciones en tiempo real.
- Selector de casa activa compartido por las solicitudes autenticadas.
- Pantalla de espera para usuarios sin casa, con revisión de estado, creación y cierre de sesión.
- Se elimina el botón flotante `+` redundante que se superponía al grabador de audio.
- El calendario de economía admite eventos manuales como sueldos y cierres de tarjetas o facturas.
- Se ajustan los estilos de eventos manuales y del campo de notas del calendario.
- El calendario permite navegar entre meses y consulta los eventos del mes visible.
- Los vencimientos recurrentes pueden moverse individualmente dentro del mes.
- Los gastos futuros se organizan con tags en lugar de categoría obligatoria.
- La navegación mensual mantiene los vencimientos alineados con el período consultado.
- Se normaliza el estilo de los botones internos de todos los eventos del calendario.
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
- Menú lateral desplegable para acceder a Economía e Inventario.
- Sección Salud con registro diario de ejercicio, edición, resumen y mapa anual de constancia.
- Botón flotante de carga por voz con propuesta editable y confirmación antes de guardar.

### Changed

- Se retiraron los botones de secciones del encabezado y los recuadros de saldo disponible.

### Fixed

- La interfaz diferencia meta planificada, monto asignado y dinero disponible.
