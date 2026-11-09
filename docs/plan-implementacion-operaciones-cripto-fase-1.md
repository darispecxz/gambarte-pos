# Plan de implementación · Operaciones cripto (Fase 1)

## Objetivo

Permitir que el cajero registre compras y ventas de criptoactivos en el POS. Tesorería administra la billetera corporativa y confirma los envíos; para compras recibidas por Binance Pay, el cajero consulta el historial, verifica y confirma el pago desde su caja, siguiendo el control que ya usa para cobros bancarios.

El diagrama de flujo está en [flujo-cripto-fase-1.svg](./flujo-cripto-fase-1.svg).

## Alcance de la primera versión

- Operaciones de compra y venta, inicialmente habilitadas para USDT y una red configurada por Tesorería.
- Cotización manual administrada por usuarios autorizados, con precio, comisión y vencimiento.
- Selección de caja en BOB y registro del movimiento de efectivo en `saldo_caja` al momento apropiado del flujo.
- Cola de operaciones pendientes para Tesorería en envíos y recepciones on-chain; confirmación de pagos Binance Pay por el cajero de ventanilla.
- Registro de dirección de origen o destino según el tipo de operación.
- Historial, detalle, filtros por fecha, activo, tipo, agencia, caja y estado.
- Auditoría de creación, cambios de estado, confirmación, rechazo y cancelación.
- Detección y conciliación asistida de pagos Binance Pay entrantes mediante el historial de cuenta en modo solo lectura (fase adicional descrita abajo).

Fuera de alcance: crear órdenes de Binance Pay, comprar/vender en Exchange, transferir o retirar cripto mediante API, lectura automática de blockchain, firma o custodia de llaves privadas y generación automática de cotizaciones de mercado. El esquema deja preparado el catálogo para ampliar activos/redes después.

## Fase adicional · conciliación de Binance Pay en modo lectura

### Qué resuelve y qué no

El endpoint `GET /sapi/v1/pay/transactions` consulta el historial de Binance Pay autenticado con firma HMAC y permiso de lectura. No es un webhook: el POS debe consultarlo periódicamente desde el backend. Los registros `C2C` observados en la cuenta incluyen pagos/transferencias de Binance Pay entre usuarios; `C2C` aquí identifica una clase de Binance Pay y no debe confundirse con el historial del marketplace Binance P2P. Se filtrarán entradas positivas del activo configurado y se verificará el destinatario de la cuenta configurada. Otros tipos de transacción, montos negativos, reembolsos y cashback se conservan para auditoría si se decide importar todo el historial, pero no se consideran una recepción del cliente automáticamente.

La detección se muestra al cajero como **Pago encontrado · verifica los datos**. El cajero revisa el historial, confirma que el movimiento corresponde a su cliente y operación, y registra la recepción desde su caja, igual que en el flujo de cobros bancarios existente. Esta confirmación registra el usuario, la caja y el `transactionId`, actualiza el inventario y habilita el pago BOB. Tesorería administra la conexión y atiende excepciones, duplicados o pagos sin operación compatible; no es un aprobador obligatorio de cada recepción. Si Binance no responde, el flujo QR y la verificación manual existente continúan disponibles.

### Reglas de conciliación

1. La cuenta se consulta solo desde CGR API. La API key y el secret nunca llegan a Angular, respuestas HTTP, logs ni tablas de configuración legibles. Se alojan en variables de entorno/gestor de secretos del servidor; se recomienda una clave separada, únicamente lectura y limitada por IP confiable.
2. Importar idempotentemente por `transactionId` y guardar tipo, hora, moneda, monto decimal exacto, `orderId`, `walletType` y los identificadores mínimos necesarios para comprobar la cuenta receptora. No persistir la respuesta JSON completa ni datos personales innecesarios.
3. Un candidato debe corresponder al activo esperado, ser una entrada positiva, tener el destinatario esperado y estar dentro de una ventana razonable desde la creación de la operación. Usar aritmética decimal, no `float`.
4. Priorizar vínculo explícito al `transactionId`. Si se proponen coincidencias por monto/activo/tiempo, mostrarlas como candidatos: no autoasignar cuando haya duplicados, pagos parciales, montos distintos o más de una operación compatible. En esta primera entrega cada operación requiere una transacción para confirmación automática asistida; casos divididos quedan para conciliación manual.
5. Una misma transacción no puede aplicarse dos veces ni vincularse a dos operaciones. La confirmación explícita la hace el cajero autorizado de la operación y queda auditada; operaciones ambiguas, de alto monto o fuera de política pueden requerir revisión adicional según reglas configurables.
6. Guardar fecha de última consulta, éxito/fallo y cursor temporal. Consultar con una pequeña superposición temporal y deduplicar por `transactionId` para tolerar retrasos y ejecuciones repetidas.

### Cambios de datos y API previstos

- Añadir `Pos_CriptoPayTransaccion` con clave única por `transactionId`, tipo, moneda, monto, tiempo Binance, datos mínimos de cuenta/destinatario, estado de conciliación y marcas de importación. Índices por fecha, moneda, tipo y estado.
- Añadir `Pos_CriptoPayVinculo` (o relación equivalente) para vincular transacciones importadas con operaciones POS, con usuario/fecha de vínculo y confirmación. Permitir más de una transacción por operación en el esquema futuro, pero en la primera UI aceptar solo un pago completo y enviar pagos parciales a revisión manual.
- Añadir `Pos_CriptoPaySync` para cursor, última consulta, resultado y errores sanitizados; nunca guardar secretos.
- Endpoints autenticados para que el cajero consulte movimientos recibidos y pendientes de su ámbito, vincule uno a su operación y confirme la recepción con su caja/usuario. Tesorería/ADMIN puede consultar la vista global, revisar excepciones y sincronización. La consulta manual desde UI lee datos ya sincronizados y no llama a Binance por cajero; la sincronización manual del backend queda restringida a ADMIN y sujeta a bloqueo/espera mínima.
- La confirmación de recepción recibirá el ID de la transacción Binance vinculada y lo guardará como referencia, validando que siga sin uso y corresponda a la cuenta receptora, operación, activo y monto.

### Sincronización y límites

- Ejecutar un comando de Laravel Scheduler con `withoutOverlapping()`, siguiendo el patrón del scheduler existente en `cgrapi/app/Console/Kernel.php`. Empezar con una consulta reciente cada 1–2 minutos y ajustar con métricas y límites reales; no consultar por cada cajero ni por cada refresco de pantalla.
- Binance limita esta consulta a ventanas de hasta 90 días, máximo 100 resultados y una antigüedad de 18 meses; el peso documentado es 3000 por UID por llamada. Si una ventana devuelve 100 filas, subdividirla para no omitir transacciones. Backfill inicial desde abril de 2025 en ventanas menores de 90 días, con pausas, presupuesto de llamadas y cursor reanudable; no hacer el histórico completo en una petición web.
- Medir cabeceras de peso/respuesta, respetar `429` con backoff y no reintentar continuamente errores de firma/reloj. Sincronizar hora del servidor. El error de un lote no debe borrar cursor ni afectar operaciones existentes.
- Referencia oficial: [Binance Developer Docs · Pay REST API](https://developers.binance.com/en/docs/catalog/investment-and-services-pay/api/rest-api). Confirmar el esquema, límite y peso contra la especificación de la cuenta antes de habilitar producción, pues Binance puede cambiar parámetros.

### Interfaz y operación

- En la operación y en **Historial Binance Pay**, el cajero ve los movimientos permitidos de su caja/agencia, compara monto/activo/hora/remitente y usa **Confirmar recepción**. Mostrar el identificador de transacción necesario para el comprobante y enmascarar identificadores personales que no sean necesarios.
- La vista global de ADMIN/Tesorería muestra **Sin conciliar**, duplicados, montos no coincidentes y excepciones, además del historial de confirmación por cajero. No presenta la confirmación de Tesorería como requisito normal para cada cobro.
- El cajero conserva el QR actual y puede indicar al cliente el activo/monto a enviar. La API de historial no genera un QR dinámico ni garantiza que una transacción detectada pertenece a esa operación sin revisar los criterios de vínculo.
- Registrar importación, candidato presentado, vínculo, desvínculo, confirmación y rechazo en eventos auditables. No registrar API key, secret, firma ni URL con firma.

### Entregas

1. **Preparación segura:** revocar cualquier clave que haya quedado expuesta en mensajes o archivos compartidos; emitir una clave nueva de solo lectura y restringida por IP; cargar secretos solo en el entorno del backend. Validar consulta de prueba sin incluir credenciales en logs.
2. **Conector de backend:** cliente firmado para el endpoint oficial, reloj/ventana, manejo de respuestas, errores, límites y sanitización.
3. **Persistencia y sincronizador:** migraciones `Pos_`, comando programado, deduplicación, cursor reanudable, solapamiento y backfill acotado.
4. **Conciliación:** reglas de candidatos, vínculo único y confirmación de recepción por cajero, respetando caja/agencia y el movimiento de inventario existente.
5. **UI y permisos:** historial Pay y confirmación en el flujo del cajero; panel global para ADMIN/Tesorería con sincronización y excepciones.
6. **Piloto controlado:** importar historial desde abril de 2025 en lotes, revisar contra Binance y operar un periodo en paralelo con el QR/manual. El cajero confirma cada pago desde su caja; ADMIN/Tesorería monitorea errores y excepciones.

### Criterios de aceptación de esta fase

- Una transacción entrante de Binance Pay aparece en la bandeja autorizada sin intervención del cajero ni consulta desde el navegador.
- Repetir una sincronización no duplica registros ni movimientos de inventario.
- Solo una transacción con activo, signo, destinatario y operación compatibles puede ofrecerse como candidata; ambigüedades y pagos parciales requieren revisión manual.
- La detección o el vínculo por sí solos no cambian el estado a recibido, no registran inventario y no habilitan el pago BOB; el cajero debe confirmar explícitamente desde una operación autorizada de su caja.
- El cajero autorizado puede confirmar la recepción vinculada desde su caja; el ID externo queda auditado y se consume una sola vez.
- Si la integración se desconecta, el proceso manual QR existente sigue funcionando y el error queda visible sin exponer secretos.

## Flujos operativos

### Compra de cripto al cliente (cripto entra, BOB sale)

1. El cajero selecciona activo/red, registra monto cripto y dirección o referencia de origen; el sistema calcula BOB con la cotización vigente.
2. Se crea la operación en `PENDIENTE_RECEPCION_CRIPTO`. No se descuenta efectivo todavía.
3. Si el cliente paga por Binance Pay, el cajero contrasta el movimiento en el historial, verifica cliente/activo/monto y confirma la recepción desde su caja. Para recepción on-chain sin integración, Tesorería sigue verificando manualmente la red, monto y hash.
4. Al confirmar la recepción, se registra el ingreso en el inventario contable de cripto y la operación pasa a `PENDIENTE_PAGO_BOB`.
5. El cajero paga BOB desde la caja seleccionada. En una transacción de base de datos se registra el egreso en `saldo_caja`, se vincula a la operación y pasa a `COMPLETADA`.

### Venta de cripto al cliente (BOB entra, cripto sale)

1. El cajero ingresa monto cripto y dirección de destino del cliente; el sistema calcula el importe BOB.
2. Se crea la operación en `PENDIENTE_COBRO_BOB`; todavía no se envía cripto.
3. El cajero confirma el cobro efectivo. En una transacción de base de datos se registra el ingreso en `saldo_caja`, se vincula y pasa a `PENDIENTE_ENVIO_CRIPTO`.
4. Tesorería vuelve a validar activo, red, dirección y monto antes de enviar desde la billetera corporativa.
5. Tesorería guarda hash/referencia y confirma manualmente. Se registra la salida del inventario de Tesorería y pasa a `COMPLETADA`.

La operación no se completa por guardar un hash solamente: el usuario de Tesorería debe confirmar explícitamente el resultado. Una operación con efectivo ya aplicado no se elimina ni se cancela silenciosamente; requiere un movimiento compensatorio auditado.

## Estados y transiciones

| Estado | Significado | Acción siguiente |
|---|---|---|
| `PENDIENTE_RECEPCION_CRIPTO` | Compra al cliente creada; falta verificar los fondos en Binance Pay o en la red | Cajero confirma Pay; Tesorería confirma recepción on-chain |
| `PENDIENTE_PAGO_BOB` | Cripto recibido y verificado | Cajero paga BOB y completa |
| `PENDIENTE_COBRO_BOB` | Venta al cliente creada; no se confirmó el efectivo | Cajero confirma cobro o cancela antes del cobro |
| `PENDIENTE_ENVIO_CRIPTO` | BOB recibido en caja; falta enviar cripto | Tesorería confirma envío o registra incidencia |
| `COMPLETADA` | Efectivo e instrucción cripto completados manualmente | Solo consulta |
| `RECHAZADA` | Tesorería rechazó la recepción antes de afectar caja | Consulta; nueva operación si corresponde |
| `CANCELADA` | Cancelada antes de aplicar el lado monetario correspondiente | Consulta |
| `INCIDENCIA` | Fallo posterior a registrar efectivo o envío; requiere resolución | Revisión autorizada y compensación documentada |

## Persistencia propuesta

Todas las tablas nuevas usarán el prefijo solicitado `Pos_` y migraciones SQL versionadas en `cgrapi/database/migrations`.

### `Pos_CriptoActivo`

Catálogo administrable de activo y red: símbolo, nombre, red, identificador de contrato cuando aplique, decimales, estado activo y datos públicos de recepción de Tesorería. No guardar frases semilla, llaves privadas ni credenciales de firma.

### `Pos_CriptoOperacion`

Cabecera: código/UUID, tipo compra/venta, activo y red, agencia, caja BOB, usuario cajero, monto cripto, cotización, comisión, monto BOB, fecha de cotización/vencimiento, dirección origen/destino, referencia/hash, estado, usuario y fecha de las confirmaciones, referencia al movimiento de caja y timestamps.

Guardar los valores de la cotización dentro de cada operación para que cambios posteriores no alteren el comprobante ni el cálculo histórico.

### `Pos_CriptoEvento`

Bitácora append-only: operación, estado anterior/nuevo, acción, usuario, fecha, motivo y metadatos mínimos. Toda confirmación, rechazo, cancelación y corrección debe generar evento.

### `Pos_CriptoMovimientoTesoreria`

Libro auxiliar de unidades cripto: activo/red, operación, cantidad con signo, tipo recepción/envío/ajuste, hash/referencia, usuario confirmador y fecha. El saldo se calcula sumando movimientos; no mantener un saldo editable que pueda quedar desincronizado. Ajustes manuales solo con permiso y motivo obligatorio.

Los nombres físicos definitivos y tipos de clave foránea se validarán contra el motor y convenciones reales de la base antes de escribir la migración. Si el sistema requiere compatibilidad con más de un motor, se mantendrá la migración en el formato usado por este proyecto.

## API propuesta

Endpoints autenticados dentro del área de cajero, separando permisos de caja y de Tesorería:

- `GET /cajero/cripto/catalogo` — activos, redes y direcciones públicas habilitadas.
- `GET /cajero/cripto/cotizacion` — cotización y comisión vigente por activo/red/operación.
- `POST /cajero/cripto/operaciones` — crear operación con UUID idempotente.
- `GET /cajero/cripto/operaciones` — listado con filtros y paginación.
- `GET /cajero/cripto/operaciones/{id}` — detalle y eventos.
- `POST /cajero/cripto/operaciones/{id}/confirmar-cobro` — cajero confirma efectivo recibido para una venta.
- `POST /cajero/cripto/operaciones/{id}/confirmar-recepcion` — el cajero confirma un movimiento Binance Pay vinculado desde su caja; Tesorería confirma recepciones on-chain.
- `POST /cajero/cripto/operaciones/{id}/confirmar-envio` — Tesorería valida envío cripto de una venta.
- `POST /cajero/cripto/operaciones/{id}/rechazar` — rechazo con motivo antes de una liquidación irreversible.
- `POST /cajero/cripto/operaciones/{id}/cancelar` — cancelación válida según estado.

El servidor recalcula y valida montos, cotización, permisos, caja abierta, saldo disponible para egresos, transiciones válidas e idempotencia. El frontend nunca será autoridad para cambiar estados ni balances.

## Interfaz POS

- Entrada de menú: **Cripto**, con vistas **Operaciones** y **Pendientes de Tesorería** según permiso.
- Lista de operaciones con filtros y estado visible; detalle en drawer.
- Acción **Nueva operación** abre un drawer/paso simple: comprar o vender, activo/red, monto, cotización, comisión, caja BOB y datos de transferencia.
- Comprar: mostrar QR/dirección corporativa, historial Pay y movimientos candidatos en la caja del cajero; bloquear el pago BOB hasta que el cajero confirme la recepción Binance Pay (o Tesorería confirme la recepción on-chain).
- Vender: validar dirección y red con confirmación visual; confirmar cobro BOB antes de pasar a Tesorería.
- Cola de Tesorería: mostrar dirección, red y monto destacados; acciones confirmar/rechazar; pedir hash/referencia y confirmación explícita.
- Comprobante con UUID, tipo, activo/red, cantidades, precio, comisión, equivalente BOB, estado, agencia, cajero y referencias disponibles.

## Permisos y controles

- Cajero: crear operación, consultar el historial Binance Pay y operaciones autorizadas de su caja/agencia, confirmar cobros Pay vinculados a su propia operación/caja y registrar el pago BOB.
- Tesorería: consultar cola global, validar recepciones on-chain, confirmar envíos, registrar referencias/hash y resolver excepciones Binance Pay. No es aprobador de rutina de los pagos Pay que el cajero verifica en ventanilla.
- Supervisor: revisar incidencias y ejecutar ajustes compensatorios bajo permiso específico.
- Definir qué roles actuales corresponden a Tesorería antes de habilitar rutas; no ampliar permisos de roles POS por conveniencia.
- Validar dirección y red, limitar monto por operación y exigir justificación para ajustes.
- Proteger doble clic/reintentos con UUID idempotente y bloqueo de la operación durante cambios críticos.
- Registrar eventos sin exponer secretos; llaves privadas permanecen fuera del POS.

## Entregas de implementación

1. **Contrato y esquema:** confirmar roles de Tesorería, moneda de cotización, precisión, red inicial, proceso de cotización y caja BOB; crear migración `Pos_` y documentación del flujo.
2. **Backend básico:** catálogo, cotización manual, creación, listado/detalle, estados y auditoría; validaciones e idempotencia.
3. **Liquidación caja:** integrar entrada/salida BOB con `saldo_caja` de forma atómica y enlaces auditables.
4. **Frontend cajero:** lista, drawer de alta/detalle, cotización congelada y estados de espera.
5. **Frontend Tesorería:** cola, revisión de red/dirección/monto, confirmación o rechazo y registro de hash.
6. **Operación piloto:** habilitar solo USDT en una red elegida, límites bajos, pruebas con casos de rechazo/reintento y conciliación diaria.

## Criterios para considerar lista la fase 1

- No se puede pagar BOB antes de verificar la recepción de cripto en una compra.
- No se puede enviar cripto antes de registrar el cobro BOB en una venta.
- Cada movimiento de BOB aparece una sola vez en caja, incluso si hay reintentos de red o doble clic.
- Cada transición es autorizada y queda en bitácora con usuario y fecha.
- La operación conserva cotización, comisión, activo, red, direcciones y referencias originales.
- Tesorería puede conciliar entradas/salidas de cripto con el libro auxiliar y resolver incidencias sin editar operaciones completadas.

## Definiciones pendientes antes de codificar

1. Red inicial de USDT y dirección corporativa de recepción para esa red.
2. Quién administra las cotizaciones y qué margen/comisión se mostrará.
3. Roles existentes que actuarán como Tesorería y Supervisor.
4. Política de límites, vencimiento de cotización y tratamiento de operación con fondos enviados pero no localizados.
5. Confirmación de si el pago BOB será siempre efectivo en caja en esta fase o si también se aceptarán medios electrónicos.

## Estado de implementación

- Módulo frontend disponible en `/cripto`, con lista, filtros, drawer de operación, detalle con eventos, QR de recepción, configuración de activo/cotización y ajustes auditados de inventario.
- API bajo `/api/cajero/cripto`; exige una caja BOB con sesión diaria abierta y registra sus movimientos en `saldo_caja`.
- La configuración y acciones de Tesorería están limitadas provisionalmente al rol 2 (ADMIN). El rol real de Tesorería se debe asignar antes de habilitarlo para usuarios operativos.
- Las migraciones `014_pos_cripto_fase1.sql` y `015_pos_cripto_binance_pay_qr.sql` crean las tablas `Pos_`; deben aplicarse antes de usar el módulo. El QR Binance Pay inicial se entrega como recurso privado del módulo API; un administrador puede reemplazarlo desde la configuración y los cajeros autorizados lo reciben por API autenticada.
- En compras, el drawer muestra el QR y el importe/activo que debe enviar el cliente. El cajero podrá contrastar el pago entrante con el historial de Binance Pay y confirmar la recepción; el QR o la detección automática no cambian por sí solos los estados.
- El conector de historial está implementado en `cgrapi`: `cripto:binance-pay-sync` consulta el endpoint de lectura cada dos minutos, importa por ventanas con subdivisión al alcanzar 100 filas y deduplica por `transactionId`. El cajero consulta `/pay/historial`; ADMIN ve el estado del sincronizador y los movimientos globales.
- La migración `016_pos_cripto_binance_pay_historial.sql` crea las tablas `Pos_` para movimientos y estado del sincronizador. Antes de habilitar la función en el entorno, aplicar esa migración, configurar `BINANCE_PAY_HISTORY_API_BASE`, `BINANCE_PAY_HISTORY_API_KEY`, `BINANCE_PAY_HISTORY_API_SECRET` y `BINANCE_PAY_HISTORY_RECEIVER_ID` en el entorno del backend, refrescar la caché de configuración y comprobar que el scheduler de Laravel esté activo.
- Para recuperar histórico, ejecutar el comando con lotes de hasta 89 días, sin solapar las fechas: `php artisan cripto:binance-pay-sync --from="2025-04-30 00:00:00" --to="2025-07-28 00:00:00"`. Repetir por lotes hasta la fecha actual. El comando automático solo consulta la ventana reciente; no ejecuta el backfill histórico.
- El permiso de lectura y el ID Binance de la cuenta receptora son necesarios para validar entradas. Las credenciales no se guardan en tablas ni se devuelven al cliente. Las claves que se compartieron previamente deben revocarse y reemplazarse antes de cargarlas al servidor.
- La dirección on-chain del activo queda opcional para el flujo de compra con Binance Pay. El activo/red, cotización y demás datos siguen configurándose desde la interfaz administrativa.
- Esta versión toma la tasa vigente al crear la operación; todavía no existe reserva temporal de cotización ni vencimiento configurable. No conecta ni valida por sí sola la red blockchain.
