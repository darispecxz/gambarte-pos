# Comparativa Legacy vs GambartePOS — Funcionalidades del Cajero

> Sistema legacy: SCGR (bo_cgr_hostinger) — PHP/jQuery
> Sistema nuevo: GambartePOS — Angular 19 + cgrapi (Laravel)
> Fecha: 2026-09-29

---

## Leyenda

- **IMPLEMENTADO** — Funcionalidad completa en el nuevo POS
- **PARCIAL** — Existe pero le faltan partes vs el legacy
- **FALTA** — No existe en el nuevo POS, hay que implementar
- **NO APLICA** — Descartado intencionalmente o movido al sistema administrativo

---

## 1. DASHBOARD / INICIO

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Tabla de cotizaciones al entrar | centro.php | dashboard.component.ts (accesos rápidos, resumen operaciones) | **PARCIAL** |
| Comisiones giros nacionales | centro.php | — | **FALTA** |
| Comisiones remesas | centro.php | — | **FALTA** |
| Saludo + resumen del día | — | dashboard.component.ts | **IMPLEMENTADO** (nuevo) |
| Cards de cajas/cambios/remesas/alertas | — | dashboard.component.ts | **IMPLEMENTADO** (nuevo) |

### Pendiente:
- [ ] Agregar tabla de cotizaciones en vivo al dashboard (tira de cotizaciones solo aparece en cambio.component)
- [ ] Mostrar tabla de comisiones de giros/remesas en el dashboard

---

## 2. HEADER / BARRA SUPERIOR

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Fecha actual | info.php | — | **FALTA** |
| Info usuario y rol | info.php | shell.component.ts (header + sidebar footer) | **IMPLEMENTADO** |
| Selector/display de agencia | info.php | shell.component.ts (.unit) | **IMPLEMENTADO** |
| Campana de notificaciones | notificacion.php | shell.component.ts (notif-wrap) | **IMPLEMENTADO** |
| Estado facturación electrónica SIAT | sync_contingencias.php | shell.component.ts (siat-wrap) | **IMPLEMENTADO** |
| Logout | info.php | shell.component.ts | **IMPLEMENTADO** |
| Timeout por inactividad (15 min) | info.php | — | **FALTA** |
| Alerta benchmark no realizado | info.php | — | **NO APLICA** (admin) |

### Pendiente:
- [ ] Agregar timeout por inactividad (15 minutos sin interacción → logout automático)

---

## 3. CAMBIO DE MONEDA

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Registrar compra de moneda extranjera | cambio.php (t=1) | cambio.component.ts (op=1) | **IMPLEMENTADO** |
| Registrar venta de moneda extranjera | cambio.php (t=2) | cambio.component.ts (op=2) | **IMPLEMENTADO** |
| Verificación persona en listas riesgo | buscarPersonaEnListas.php | CajeroCambioService (verificarListasControl) | **IMPLEMENTADO** |
| Formulario usuario financiero completo | usuario_financiero_cambio_moneda.php | cambio.component.ts (formulario cliente) | **IMPLEMENTADO** |
| Persona jurídica | formPersonasJuridicasSelect.php | — | **FALTA** |
| Selección moneda + tipo cambio + cálculo | cambio.php | cambio.component.ts | **IMPLEMENTADO** |
| Control UIF / PCC-06 | control_uif.php, form_uif.php | cambio.component.ts (UIF check + PCC-06 form) | **IMPLEMENTADO** |
| Señales de alerta Art. 55.13 | — | cambio.component.ts (senalesAlerta) | **IMPLEMENTADO** (nuevo) |
| Usuario habitual Art. 37 | — | cambio.component.ts (esUsuarioHabitual) | **IMPLEMENTADO** (nuevo) |
| Bloqueo DD incompleta Art. 51 | — | cambio.component.ts (ddBloqueado) | **IMPLEMENTADO** (nuevo) |
| Origen/destino por umbral | — | cambio.component.ts (requiereOrigenDestino) | **IMPLEMENTADO** (nuevo) |
| Observaciones cumplimiento cajero | — | cambio.component.ts (observacionesUif) | **IMPLEMENTADO** (nuevo) |
| Formulario complemento UIF | — | cambio.component.ts (complemento) | **IMPLEMENTADO** (nuevo) |
| Múltiples métodos de pago | — | cambio.component.ts (métodos de pago) | **IMPLEMENTADO** (nuevo) |
| Factura electrónica SIAT | facturacion_electronica/ | CajeroCambioService (SIAT integration) | **IMPLEMENTADO** |
| Imprimir recibo cambio | imprime_cambio.php | cambio.component.ts (imprimir comprobante) | **IMPLEMENTADO** |
| Imprimir factura | imprime_factura_cambio.php | cambio.component.ts (descargar factura PDF) | **IMPLEMENTADO** |
| Control a la competencia | control_competencia.php | — | **FALTA** |
| Reporte general de cambios | rep_cambio.php | historial.component.ts | **IMPLEMENTADO** |

### Pendiente:
- [ ] Soporte para persona jurídica en cambio (selección/registro de empresa)
- [ ] Control a la competencia (ingreso de cotizaciones de competidores) — evaluar si va en POS o en admin

---

## 4. GIROS NACIONALES

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Registrar giro nacional | giro.php | — | **FALTA** |
| Pagar giro nacional | paga_giro.php | — | **FALTA** |
| Devolver giro nacional | devuelve_giro.php | — | **FALTA** |
| Giros a cuentas bancarias | giros_cuentas.php | — | **FALTA** |
| Formulario usuario financiero giro | usuario_financiero_giros.php | — | **FALTA** |
| Formulario destinatario giro | destinatario_giro.php | — | **FALTA** |
| Complemento origen/destino | complemento_origen_destino.php | — | **FALTA** |
| Beneficiario final | buscador.php | — | **FALTA** |
| Comisiones e ITF | registro_giro.php | — | **FALTA** |
| Factura electrónica giro | facturaGiro.php | — | **FALTA** |
| Imprimir recibo giro | imprime_giro.php | — | **FALTA** |
| Imprimir factura giro | imprime_factura_giro.php | — | **FALTA** |
| Reporte giros enviados | rep_giro.php | — | **FALTA** |
| Reporte giros pagados | rep_pago_giro.php | — | **FALTA** |
| Reporte giros devueltos | rep_devolucion_giro.php | — | **FALTA** |
| Reporte giros pendientes | rep_pendientes_giro.php | — | **FALTA** |
| Notificación email al destinatario | enviarCorreo.php | — | **FALTA** |

### Pendiente:
- [ ] **Módulo completo de giros nacionales** — registro, pago, devolución, reportes, facturación
- [ ] Este es el módulo más grande que falta del POS del cajero

---

## 5. REMESAS / GIROS INTERNACIONALES

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Registrar remesa internacional | giro_internacional.php | remesa.component.ts | **IMPLEMENTADO** |
| Formulario remitente (usuario financiero) | usuario_financiero_remesas.php | remesa.component.ts (cliente) | **IMPLEMENTADO** |
| Formulario destinatario | destinatario.php | remesa.component.ts (destinatario) | **IMPLEMENTADO** |
| Cálculo comisiones (%, BOB, moneda) | ComisionService.php | remesa.service.ts (calcularComision) | **IMPLEMENTADO** |
| Comisiones preferenciales | — | remesa.service.ts (comisionesPreferenciales) | **IMPLEMENTADO** (nuevo) |
| Cotización CLP | — | remesa.service.ts (cotizacionChile) | **IMPLEMENTADO** |
| Compra automática USD | venta_remesa.php | remesa.component.ts (compra USD) | **IMPLEMENTADO** |
| Complemento origen/destino | complemento_origen_destino.php | remesa.component.ts (campos origen/destino) | **IMPLEMENTADO** |
| Control UIF / PCC-08 | — | remesa.component.ts (UIF check + PCC-08) | **IMPLEMENTADO** |
| Señales alerta + DD | — | remesa.component.ts (señales, DD bloqueo) | **IMPLEMENTADO** (nuevo) |
| Sistema de cotizaciones | cotizacionView.php | remesa.component.ts (cotizaciones) | **IMPLEMENTADO** |
| Factura electrónica | facturaGiroInternacional.php | CajeroRemesaService (SIAT) | **IMPLEMENTADO** |
| Recibo con QR | imprime_giro_internacional.php | recibo-remesa.component.ts (con QR) | **IMPLEMENTADO** |
| Pagar remesa entrante (CGR) | paga_remesa.php | — | **FALTA** |
| Pagar remesa entrante (SIG) | paga_remesa_sig.php | — | **FALTA** |
| Devolver remesa | devuelve_remesa.php | — | **FALTA** |
| Reporte remesas enviadas | rep_remesa.php | historial-remesa.component.ts | **IMPLEMENTADO** |
| Reporte remesas pagadas exterior | rep_con_remesa.php | — | **FALTA** |
| Reporte remesas pendientes | rep_remesa_pendiente.php | — | **FALTA** |
| Conciliación diaria remesas | rep_remesa_diaria.php | — | **FALTA** (→ admin) |

### Pendiente:
- [ ] Pago de remesas entrantes (CGR y SIG) — recibir remesas que llegan del exterior
- [ ] Devolución de remesas
- [ ] Reportes de remesas pagadas en exterior y pendientes

---

## 6. CAJA (Gestión de Efectivo)

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Apertura de caja por denominación | apertura_caja.php | caja.component.ts (apertura) | **IMPLEMENTADO** |
| Cierre de caja por denominación | cierre_caja.php | caja.component.ts (cierre) | **IMPLEMENTADO** |
| Cierre con apertura simultánea | — | caja.component.ts (cierreConApertura) | **IMPLEMENTADO** (nuevo) |
| Solicitar fondos a bóveda | solicita_fondo_caja.php | movimientos.component.ts | **IMPLEMENTADO** |
| Recibir fondos de bóveda | transferencia_saldo_caja.php | movimientos.component.ts | **IMPLEMENTADO** |
| Transferencia a bóveda | transferencia_caja.php | movimientos.component.ts | **IMPLEMENTADO** |
| Transferencia entre cajeros | transferencia_cajero.php | movimientos.component.ts | **IMPLEMENTADO** |
| Transferencia entre bóvedas | — | movimientos.component.ts | **IMPLEMENTADO** (nuevo) |
| Ingreso a caja | ingreso_caja.php | egresos-ingresos.component.ts | **IMPLEMENTADO** |
| Egreso de caja | egreso_caja.php | egresos-ingresos.component.ts | **IMPLEMENTADO** |
| Egreso autorizado (asiento contable) | — | egresos-ingresos.component.ts | **IMPLEMENTADO** (nuevo) |
| Ingreso autorizado | — | egresos-ingresos.component.ts | **IMPLEMENTADO** (nuevo) |
| Transacción bancaria desde caja | — | egresos-ingresos.component.ts | **IMPLEMENTADO** (nuevo) |
| Workflow aprobación egresos | — | egresos-ingresos.component.ts | **IMPLEMENTADO** (nuevo) |
| Registrar movimiento | movimiento_caja.php | — | **PARCIAL** (integrado en otros flujos) |
| Reporte de operaciones/cierres | cierres.php | — | **FALTA** (→ admin) |
| Imprimir apertura | imprime_apertura_caja.php | — | **FALTA** |
| Imprimir cierre | imprime_cierre_caja.php | — | **FALTA** |
| Imprimir acta de cierre | imprime_acta_cierre_caja.php | — | **FALTA** |

### Pendiente:
- [ ] Imprimir comprobante de apertura de caja
- [ ] Imprimir comprobante/acta de cierre de caja

---

## 7. BANCOS / CHEQUERA / OBEL

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Cuentas y saldos | reporte_saldo_cuenta.php | bancos.component.ts (tab cuentas) | **IMPLEMENTADO** |
| Apertura/cierre de banca | — | bancos.component.ts (tab banca) | **IMPLEMENTADO** (nuevo) |
| Traspasos entre agencias | — | bancos.component.ts (tab traspasos) | **IMPLEMENTADO** (nuevo) |
| Depósitos/retiros | ingreso_cuenta.php | bancos.component.ts (tab depositos) | **IMPLEMENTADO** |
| Movimientos bancarios | rep_mov_cuenta.php | bancos.component.ts (tab movimientos) | **IMPLEMENTADO** |
| Chequeras | nuevocheque | bancos.component.ts (tab cheques) | **IMPLEMENTADO** |
| Registrar cheque | debitocheque | bancos.component.ts (cheques) | **IMPLEMENTADO** |
| Gestión envíos cheques | — | bancos.component.ts (envíos cheques) | **IMPLEMENTADO** (nuevo) |
| Adjuntar comprobantes | — | bancos.component.ts (uploads) | **IMPLEMENTADO** (nuevo) |
| Reportes bancarios | rep_diario_cuenta.php | bancos.component.ts (tab reportes) | **PARCIAL** |
| Reporte diferencias | rep_dif_cuenta.php | — | **FALTA** (→ admin) |

---

## 8. FACTURACIÓN ELECTRÓNICA

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Emisión factura cambio | facturaCambio.php | Integrado en cambio.component | **IMPLEMENTADO** |
| Emisión factura remesa | facturaRemesas.php | Integrado en remesa.component | **IMPLEMENTADO** |
| Emisión factura giro nacional | facturaGiro.php | — | **FALTA** (depende de giros) |
| Estado SIAT en línea/contingencia | sync_contingencias.php | shell.component.ts (SIAT panel) | **IMPLEMENTADO** |
| Gestión CUIS/CUFD | facturacion_electronica/ | Backend (SiatClient) | **IMPLEMENTADO** |
| Sincronización offline | sync_contingencias.php | shell.component.ts (cambios pendientes) | **IMPLEMENTADO** |
| Reporte facturas por agencia | rep_fac_age.php | — | **FALTA** (→ admin) |

---

## 9. ANULACIONES DE OPERACIONES

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Solicitar anulación de operación | formNuevaSolicitudAnulacion.php | — | **FALTA** |
| Listar solicitudes de anulación | listaSolicitudesAnulacion.php | — | **FALTA** |
| Ver detalle de solicitud | detalleSolicitud.php | — | **FALTA** |
| Aprobar/rechazar anulación | revisarSolicitud.php | — | **FALTA** (→ admin) |
| Ejecutar anulación | ejecutarSolicitud.php | — | **FALTA** (→ admin) |

### Pendiente:
- [ ] **Módulo de anulaciones** — al menos la solicitud y el listado del lado del cajero

---

## 10. EXTRACTO DE USUARIO FINANCIERO

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Consultar historial de operaciones por cliente | extracto_usu_fin.php | — | **FALTA** |
| Filtro por tipo operación (cambio/giro/remesa) | extracto_usu_fin.php | — | **FALTA** |
| Filtro por fechas y agencia | extracto_usu_fin.php | — | **FALTA** |

### Pendiente:
- [ ] **Extracto de usuario financiero** — consultar todas las operaciones de un cliente por documento

---

## 11. REPORTE DE INCIDENTES / RIESGOS

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Formulario de incidentes operativos | form_riesgos.php | — | **FALTA** |
| Reporte de incidentes | rep_form_riesgos.php | — | **FALTA** |

### Pendiente:
- [ ] Formulario de reporte de incidentes operativos (tipo evento, detalle, responsable, adjuntos)

---

## 12. BILLETE FALSO

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Reportar billete falso | form_billete_falso.php | — | **FALTA** |
| Imprimir reporte billete falso | imprime_billete_falso.php | — | **FALTA** |

### Pendiente:
- [ ] Formulario de reporte de billete falso (moneda, denominación, serie, procedencia)

---

## 13. NOTIFICACIONES / MENSAJERÍA

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Campana de notificaciones | notificacion.php | shell.component.ts (notif-wrap) | **IMPLEMENTADO** |
| Lista de notificaciones no leídas | notificacion.php | shell.component.ts (notif-panel) | **IMPLEMENTADO** |
| Marcar leída / marcar todas | — | shell.component.ts | **IMPLEMENTADO** (nuevo) |
| Mensajes recibidos | recibidos.php | — | **FALTA** |
| Mensajes enviados | enviados.php | — | **FALTA** |
| Mensajes leídos | leidos.php | — | **FALTA** |
| Enviar comunicado | comunicadoController.php | — | **FALTA** (→ admin) |

### Pendiente:
- [ ] Bandeja de mensajes completa (recibidos/enviados/leídos) — evaluar si va en POS o admin

---

## 14. DISPONIBILIDAD

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Disponibilidad en caja | disponibilidad_agencia.php | caja.component.ts (saldo por caja) | **PARCIAL** |
| Disponibilidad en bóveda | rep_disponibilidad_boveda.php | movimientos.component.ts (muestra saldo bóveda) | **PARCIAL** |
| Vista consolidada disponibilidad | reporte_detalle_saldo.php | — | **FALTA** (→ admin) |

---

## 15. AYUDA / RECURSOS

| Funcionalidad | Legacy | POS Nuevo | Estado |
|---|---|---|---|
| Manual de usuario | links a PDFs | — | **FALTA** |
| Guía de formularios PCC | links a PDFs | — | **FALTA** |
| Formulario PCC-06 en blanco | enlace | — | **FALTA** |
| Formulario PCC-08 en blanco | enlace | — | **FALTA** |
| Listado actividades económicas | enlace | — | **FALTA** |
| Normativa | normativa.php | — | **FALTA** |
| Destinatarios preferenciales | reporte_comision_preferencial.php | — | **FALTA** |

### Pendiente:
- [ ] Sección de ayuda con enlaces a PDFs de manuales y formularios

---

## 16. FUNCIONALIDADES NUEVAS EN POS (no existían en legacy)

| Funcionalidad | Componente | Detalle |
|---|---|---|
| Dark mode | shell.component.ts + styles.scss | Toggle claro/oscuro con persistencia |
| Routing por rol | shell.component.ts | Sidebar filtrado según rol del usuario |
| Dashboard con resumen | dashboard.component.ts | Cards de cajas/operaciones/alertas + accesos rápidos |
| Señales alerta Art. 55.13 | cambio + remesa | Detección automática de structuring, frecuencia, inconsistencia |
| Usuario habitual Art. 37 | cambio + remesa | 3+ ops en 30 días → tratamiento como cliente |
| Bloqueo DD incompleta Art. 51 | cambio + remesa | Bloqueo si hay alertas y falta complemento |
| Origen/destino por umbral | cambio + remesa | Campos obligatorios según umbral configurable |
| Observaciones cajero | cambio + remesa | Checkboxes predefinidos + texto libre |
| Formulario complemento UIF | cambio | Datos extendidos del cliente (cónyuge, trabajo, referencias) |
| Múltiples métodos de pago | cambio + remesa | N métodos con referencia bancaria |
| Cierre con apertura | caja | Cerrar e inmediatamente reabrir |
| Apertura/cierre banca | bancos | Gestión de sesiones bancarias por grupo |
| Traspasos entre agencias | bancos | Con adjuntos y workflow aceptar/rechazar |
| Envíos de cheques | bancos | Gestión de envíos entre agencias |
| Egresos autorizados | egresos-ingresos | Ejecución de asientos contables pre-autorizados |
| Workflow aprobación egresos | egresos-ingresos | Pendiente → aprobado/rechazado con comprobante |
| Sistema de cotizaciones remesa | remesa | Crear/buscar cotizaciones con código y vencimiento |
| Comisiones preferenciales | remesa | Tarifas especiales por destinatario |
| Recibo remesa con QR | shared/recibo-remesa | Código QR para verificación |
| Motor PLAFT parametrizado | backend RiesgoPLAFT.php | Constantes en tabla parametros, no hardcodeadas |

---

## RESUMEN: Lo que FALTA implementar en el POS del cajero

### Prioridad CRÍTICA (módulo completo faltante)

1. **Giros nacionales** — Registro, pago, devolución, reportes, facturación
   - Es el módulo operativo más grande que falta
   - Backend: necesita módulo `CajeroGiroService` nuevo
   - Frontend: necesita `giro.component.ts` + `historial-giro.component.ts`

### Prioridad ALTA

2. **Pago de remesas entrantes** — CGR y SIG
   - El cajero puede enviar remesas pero NO puede pagar las que llegan
   - Backend: parcialmente en `CajeroRemesaService`
   - Frontend: agregar tab o flujo en remesa.component

3. **Devolución de remesas**
   - Flujo de devolución con motivo y reintegro

4. **Anulaciones de operaciones**
   - Al menos: solicitar anulación + ver estado de mis solicitudes
   - Backend: necesita endpoint nuevo o usar el de POS Admin

5. **Extracto de usuario financiero**
   - Consultar historial completo de un cliente por documento
   - Útil para DD y para el cajero que necesita verificar operaciones previas

6. **Persona jurídica en cambio**
   - Seleccionar/registrar empresa como cliente en vez de persona natural

### Prioridad MEDIA

7. **Timeout por inactividad** (15 min → logout)
8. **Imprimir apertura/cierre de caja**
9. **Reporte de billete falso**
10. **Reporte de incidentes operativos**
11. **Cotizaciones/comisiones en dashboard** (tabla de TC al entrar)
12. **Sección de ayuda** (enlaces a manuales y formularios PDF)

### Prioridad BAJA

13. **Control a la competencia** (benchmark) — evaluar si va en POS
14. **Bandeja de mensajes** (recibidos/enviados) — evaluar si va en POS o admin
15. **Reportes avanzados** (pendientes exterior, conciliación diaria) — probablemente admin

---

## Orden de implementación sugerido

| # | Módulo | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Giros nacionales (registro + pago + devolución) | **Muy Alto** | Crítico — operación diaria |
| 2 | Pago de remesas entrantes (CGR/SIG) | **Alto** | Alto — operación diaria |
| 3 | Devolución de remesas | **Medio** | Alto — operación |
| 4 | Anulaciones (solicitud del cajero) | **Medio** | Alto — corrección de errores |
| 5 | Extracto de usuario financiero | **Bajo-Medio** | Alto — compliance y servicio |
| 6 | Persona jurídica en cambio | **Medio** | Medio — clientes empresa |
| 7 | Timeout por inactividad | **Bajo** | Medio — seguridad |
| 8 | Imprimir apertura/cierre | **Bajo** | Medio — operativa |
| 9 | Billete falso | **Bajo** | Bajo — incidental |
| 10 | Incidentes operativos | **Bajo** | Bajo — riesgos |
| 11 | Dashboard con cotizaciones | **Bajo** | Bajo — conveniencia |
| 12 | Sección de ayuda | **Bajo** | Bajo — referencia |
