# Analisis del Instructivo EIF v3 (R21-2019) vs GambartePOS

> Instructivo Especifico para Entidades de Intermediacion Financiera con Enfoque Basado en Gestion de Riesgo - UIF Bolivia
> Analisis realizado: 2026-09-28

---

## Resumen Ejecutivo

El instructivo tiene 68 articulos organizados en 12 capitulos, mas disposiciones transitorias y glosario. Gambarte Bolivia S.R.L., como casa de cambio (EIF), es **sujeto obligado** y debe cumplir con la totalidad del instructivo. El sistema GambartePOS cubre una parte significativa de los requerimientos operativos (formularios PCC, verificacion UIF, deteccion de riesgos PLAFT), pero tiene brechas importantes en areas administrativas, de reporte y de gestion documental.

---

## 1. IMPLEMENTADO (Funcional en el sistema)

### 1.1 Formulario PCC-06 (Cambio de Moneda) — Art. 52
- **Estado:** IMPLEMENTADO
- **Donde:** Backend `CajeroCambioService.php` → `calcularCambioUif()`, Frontend `cambio.component.ts`
- **Detalle:**
  - Verificacion automatica de umbrales configurable via tabla `parametros`
  - Umbral operacion unica: USD 10,000 (default, configurable)
  - Umbral operaciones multiples: USD 10,000 acumulado en 30 dias con 3+ operaciones
  - Generacion de PDF del formulario PCC-06 (`UifExporter.php` → `pcc06Pdf()`)
  - Formulario en blanco para llenado manual (`pccBlank()`)
  - Vista `v_pcc06` y `v_pcc06_uif` para consultas

### 1.2 Formulario PCC-08 (Giros y Remesas) — Art. 52
- **Estado:** IMPLEMENTADO
- **Donde:** Backend `CajeroRemesaService.php` → `verificarUifRemesa()`, Frontend `remesa.component.ts`
- **Detalle:**
  - Umbrales diferenciados para remesas:
    - PCC-08 operacion unica: USD 1,000
    - PCC-08 multiples: USD 2,000 (3+ ops en 30 dias)
    - Formulario unica: USD 500
    - Formulario multiples: USD 1,000
  - Generacion PDF PCC-08 (`UifExporter.php` → `pcc08Pdf()`)
  - Campo `impresion_pcc08` en tabla de operaciones

### 1.3 Identificacion PEP — Art. 53
- **Estado:** IMPLEMENTADO
- **Donde:** Backend `CajeroRemesaService.php` → `verificarListasControl()`, `CajeroCambioService.php`
- **Detalle:**
  - Tabla `pep` con registro de personas expuestas politicamente
  - Verificacion automatica por numero de documento al registrar operacion
  - Auto-determinacion de PEP por cargo via tabla `listas_cargos` con flag de riesgo
  - Parametro configurable `limite_anyos_ya_no_pep` (default 5 anos)
  - Campos PEP en `usuario_financiero`: `pep` (S/N), `stipo_pep` (NAL/EXT/ninguno)
  - UI en frontend con secciones "Dependiente del Estado — Anterior/Actual" y datos de conyuge
  - Alerta nivel "alto" cuando se detecta PEP

### 1.4 Verificacion contra Listas Internacionales — Art. 49
- **Estado:** IMPLEMENTADO (parcialmente — ver seccion 3.3)
- **Donde:** `CajeroRemesaService.php` → `verificarListasControl()`, `RiesgoPLAFT.php`
- **Detalle:**
  - Tabla `personas_riesgos` para listas ONU, OFAC, GAFI
  - Verificacion automatica por documento al registrar operacion
  - Alerta nivel "critico" cuando hay coincidencia
  - Cruce con operaciones de cambio en motor PLAFT

### 1.5 Debida Diligencia / KYC — Art. 34-37
- **Estado:** IMPLEMENTADO
- **Donde:** `usuario_financiero`, `usuario_financiero_complemento`, `cambio.component.ts`
- **Detalle:**
  - **Persona Natural (Art. 34):** nombre, documento, expedicion, sexo, fecha nacimiento, pais, estado civil, domicilio, telefono, actividad economica, ocupacion, lugar de trabajo
  - **Persona Juridica:** razon social, NIT, telefono, domicilio (tabla `personas_juridicas`)
  - **Formulario Complemento UIF:** apellido casada, pais/ciudad residencia, ingresos, experiencia laboral, actividad secundaria, referencias bancarias/comerciales/personales, datos PEP anterior/actual, datos conyuge
  - **Beneficiario Final (Art. 39):** tabla `beneficiario_final` con nombres, documento, NIT, departamento, telefono, zona, domicilio, actividad economica
  - Origen y destino de recursos en formularios PCC

### 1.6 Motor de Riesgos PLAFT — Art. 23-28 (Gestion de Riesgos)
- **Estado:** IMPLEMENTADO
- **Donde:** `Modules/Riesgos/Engines/RiesgoPLAFT.php`, `RiskPanelService.php`
- **Detalle:**
  - **Umbral:** Operaciones sobre BOB 70,000 (configurable)
  - **Fraccionamiento (structuring):** 3+ operaciones/dia bajo umbral que suman por encima
  - **Frecuencia:** Clientes con 15+ operaciones en periodo
  - **PEP:** Cruce con base de datos PEP
  - **Listas:** Cruce con `personas_riesgos`
  - Informe con semaforo (ok/warn/bad) codificado como `GMB/GIR/LGI-MM-YYYY`
  - API: `/risks/`, `/risks/dashboard`, `/risks/{slug}`, `/risks/{slug}/pdf`

### 1.7 Otros Motores de Riesgo — Art. 23-28
- **Estado:** IMPLEMENTADO
- **Donde:** `Modules/Riesgos/Engines/`
- **Detalle:**
  - `RiesgoCambiario.php` — riesgo de tipo de cambio
  - `RiesgoLiquidez.php` — riesgo de liquidez
  - `RiesgoOperativo.php` — riesgo operativo
  - `Seguridad.php` — seguridad y trazabilidad

### 1.8 Deteccion de Operaciones Inusuales — Art. 55-56
- **Estado:** IMPLEMENTADO (parcialmente — ver seccion 3.5)
- **Donde:** `NotificacionService.php`
- **Detalle:**
  - **Transferencia inusual:** Deteccion estadistica (media + 2 desviaciones estandar en 90 dias, o primera transferencia > BOB 50,000). Categoria "riesgo", prioridad "alta"
  - **Cotizacion mercado:** Alertas por desviacion de cotizacion
  - **Concentracion efectivo:** Alertas por concentracion
  - **Brecha cotizacion:** Riesgo de arbitraje interno
  - Fraccionamiento y frecuencia en motor PLAFT

### 1.9 Pistas de Auditoria — Art. 63 (parcial)
- **Estado:** IMPLEMENTADO
- **Donde:** `Modules/Auditoria/`
- **Detalle:**
  - 8 tipos de reportes de auditoria (login, cajero, administrador, contabilidad, etc.)
  - Tabla `pos_operacion_log` con: uuid, tipo_operacion, monto_total_bob, ip_origen, user_agent, metadata JSON
  - Exportacion a Excel y ZIP
  - Resumen ejecutivo consolidado

### 1.10 Perfil Financiero del Usuario — Art. 37
- **Estado:** IMPLEMENTADO
- **Donde:** `UifService.php` → `usuarioFinanciero()`
- **Detalle:**
  - Query UNION ALL que consolida todas las operaciones del usuario (cambio, giro, remesa, pago)
  - Perfil completo con datos KYC enriquecidos
  - Datos de Chile via `tmp_reporte_remesa`

### 1.11 Dolarizacion y Tipo de Cambio Oficial — Art. 52
- **Estado:** IMPLEMENTADO
- **Donde:** `CajeroCambioService.php`, `FacturacionService.php`
- **Detalle:**
  - Cotizacion oficial BCB para contabilidad y facturacion
  - Cotizacion base por agencia para operaciones
  - Conversion a USD para verificacion de umbrales UIF
  - Campo `monto_total_bob` en log de operaciones para auditoria UIF

### 1.12 Umbrales Configurables — Art. 52
- **Estado:** IMPLEMENTADO
- **Donde:** Tabla `parametros` con slugs especificos
- **Detalle:**
  - Todos los umbrales UIF son configurables via base de datos
  - Sin valores hardcodeados en logica de negocio (excepto PLAFT — ver seccion 4.2)
  - Parametros por tipo de operacion y modalidad (unica/multiples)

---

## 2. NO IMPLEMENTADO (Falta en el sistema)

### 2.1 Formulario PCC-01 — Art. 52
- **Estado:** NO IMPLEMENTADO
- **Requerimiento:** Formulario de Declaracion Jurada para operaciones >= USD 10,000 (o equivalente). Aplica a:
  - Operaciones unicas >= USD 10,000
  - Operaciones multiples en efectivo/transferencia >= USD 10,000
  - Cambio de moneda >= USD 3,000 en periodos de 1-5 dias
  - Giros/remesas >= USD 2,000 en periodos de 1-5 dias
- **Impacto:** ALTO. El PCC-01 es diferente al PCC-06/PCC-08. Es una declaracion jurada sobre origen/destino de fondos que debe llenarse ademas del PCC correspondiente al tipo de operacion.
- **Nota:** El sistema actualmente solo tiene PCC-06 (cambio) y PCC-08 (giros/remesas). Se debe verificar con la UIF si el PCC-01 aplica como formulario adicional o si los PCC-06/PCC-08 lo reemplazan para casas de cambio.

### 2.2 Reporte de Operaciones Sospechosas (ROS) — Art. 57-58
- **Estado:** NO IMPLEMENTADO (solo existe la tabla `reporte_uif` y generacion de PDF)
- **Requerimiento:**
  - Formulario electronico ROS en sistema de la UIF
  - Plazo maximo de 48 horas desde deteccion
  - Documentacion de respaldo del analisis
  - Workflow: señal de alerta → analisis → operacion inusual → verificacion → ROS
  - Solo el Funcionario Responsable debe conocer/gestionar los ROS
- **Falta:**
  - CRUD completo para crear, editar y dar seguimiento a ROS
  - Workflow de escalamiento (señal → inusual → sospechosa → ROS)
  - Temporizador de 48 horas con alertas
  - Restriccion de acceso (solo Funcionario Responsable)
  - Integracion con sistema electronico de la UIF (si existe API)
- **Impacto:** CRITICO. El reporte de operaciones sospechosas es la obligacion mas importante del sujeto obligado.

### 2.3 Remision Mensual de PCC a la UIF — Art. 52 (VII)
- **Estado:** NO IMPLEMENTADO
- **Requerimiento:** Remitir a la UIF mensualmente los formularios PCC llenados el mes anterior, en formato definido por la UIF. Si no se lleno ningun PCC en el mes, tambien se debe informar.
- **Falta:**
  - Proceso de consolidacion mensual de formularios PCC
  - Generacion de archivo en formato UIF
  - Mecanismo de envio (manual o automatico)
  - Registro de envio y acuse de recibo
- **Impacto:** ALTO

### 2.4 Base de Datos PEP Mensual — Art. 54
- **Estado:** NO IMPLEMENTADO
- **Requerimiento:**
  - Elaborar base de datos de clientes catalogados como PEP
  - Actualizar mensualmente (nuevos PEP + excluir relaciones terminadas)
  - Remitir a la UIF antes del dia 15 del mes siguiente
  - Formato definido por la UIF
- **Falta:**
  - Proceso de generacion mensual de BD PEP
  - Formato de exportacion UIF
  - Mecanismo de envio
- **Impacto:** ALTO

### 2.5 Verificacion Bimensual de Listas Internacionales — Art. 49
- **Estado:** NO IMPLEMENTADO (la verificacion existe pero es puntual, no bimensual masiva)
- **Requerimiento:** Verificar bimensualmente TODA la base de clientes contra listas ONU, OFAC, GAFI y otras listas internacionales. Documentar resultados.
- **Falta:**
  - Proceso batch bimensual que cruce todos los `usuario_financiero` contra `personas_riesgos`
  - Reporte de resultados del cruce
  - Documentacion de acciones tomadas para coincidencias
- **Impacto:** ALTO

### 2.6 Verificacion Semestral PEP — Art. 53 (III)
- **Estado:** NO IMPLEMENTADO
- **Requerimiento:** Semestralmente verificar si algun cliente ha adquirido la caracteristica de PEP. Si es asi, solicitar autorizacion de Alta Gerencia para continuar la relacion.
- **Falta:**
  - Proceso semestral de re-verificacion PEP
  - Workflow de autorizacion por Alta Gerencia
- **Impacto:** MEDIO

### 2.7 Politica de Conservacion de Informacion — Art. 66
- **Estado:** NO IMPLEMENTADO
- **Requerimiento:**
  - Conservar al menos 10 anos: registros de operaciones, documentos de debida diligencia, registros de transferencias electronicas, bases de datos, documentos de identidad y observaciones sobre operaciones inusuales
  - Registros suficientes para reconstruir operaciones como prueba judicial
- **Falta:**
  - Politica formal de retencion de datos en el sistema
  - Mecanismo de archivado a largo plazo
  - Proteccion contra eliminacion accidental
  - Plan de backup con retencion de 10+ anos
- **Impacto:** ALTO (obligacion legal)

### 2.8 Modulo de Capacitacion LGI/FT — Art. 59-61
- **Estado:** NO IMPLEMENTADO (existe modulo RRHH generico pero no especifico LGI/FT)
- **Requerimiento:**
  - Programa anual de capacitacion LGI/FT aprobado por Directorio
  - Capacitacion especializada para Unidad de Cumplimiento
  - Capacitacion anual a Directorio y ejecutivos
  - Capacitacion semestral a funcionarios con evaluacion
  - Capacitacion a nuevos empleados en 30 dias habiles
  - Registro de capacitaciones con fecha, participantes, temas, evaluaciones
- **Falta:**
  - Etiquetado de capacitaciones como "LGI/FT" en el modulo RRHH
  - Cronograma especifico de cumplimiento (anual directorio, semestral funcionarios)
  - Evaluaciones post-capacitacion
  - Reporte de cumplimiento del programa anual
- **Impacto:** MEDIO

### 2.9 Modulo de Auditoria Semestral LGI/FT — Art. 62-63
- **Estado:** NO IMPLEMENTADO
- **Requerimiento:**
  - Auditorias semestrales (corte 30 junio y 31 diciembre) sobre gestion de riesgos LGI/FT
  - Alcance definido en 12 puntos (Art. 63): normativa, gobierno corporativo, sistemas de informacion, metodologia, sistemas informaticos, controles internos, debida diligencia, capacitacion, etc.
  - Remitir informes a UIF (31 agosto y 28 febrero) con acta de Directorio
- **Falta:**
  - Template de auditoria semestral LGI/FT
  - Checklist de los 12 puntos del Art. 63
  - Generacion de informe formal
  - Registro de remision a UIF
- **Impacto:** ALTO (obligacion regulatoria con fechas fijas)

### 2.10 Debida Diligencia Intensificada — Art. 51
- **Estado:** NO IMPLEMENTADO como workflow diferenciado
- **Requerimiento:**
  - Aplicar cuando existe sospecha de LGI/FT
  - Aplicar en escenarios de mayor riesgo
  - En caso de duda sobre nivel de riesgo, aplicar categoria superior
  - Si no se puede cumplir con debida diligencia: no iniciar relacion, o dar por finalizada
- **Falta:**
  - Niveles de debida diligencia (simplificada, continua, intensificada) como workflow
  - Escalamiento automatico basado en nivel de riesgo del cliente
  - Bloqueo de operaciones cuando no se cumple debida diligencia
- **Impacto:** ALTO

---

## 3. PARCIALMENTE IMPLEMENTADO (Existe pero incompleto)

### 3.1 Senales de Alerta para Cambio de Moneda — Art. 55 (punto 13)
- **Estado:** PARCIAL
- **Implementado:**
  - Deteccion de fraccionamiento (structuring) en motor PLAFT
  - Deteccion de alta frecuencia
  - Operaciones sobre umbral
  - Deteccion estadistica de transferencias inusuales
- **Falta (del listado del Art. 55.13):**
  - a) Operaciones < USD 3,000 aparentemente estructuradas para evadir umbral
  - b) Incremento repentino de frecuencia y montos
  - c) Menores de edad, turistas, extranjeros con montos inconsistentes
  - d) Solicitud frecuente de billetes de alta denominacion o entrega de baja denominacion
  - e) Preocupacion inusual por requisitos de informacion
  - f) Renuencia al llenado de formularios
  - g-l) Otras senales especificas de cambio de moneda
- **Recomendacion:** Implementar las senales especificas de cambio de moneda como reglas configurables en el motor PLAFT, ya que son las mas relevantes para una casa de cambio.

### 3.2 Senales de Alerta para Giros/Remesas — Art. 55 (punto 3)
- **Estado:** PARCIAL
- **Implementado:**
  - Alertas PEP y lista riesgo al registrar operacion
  - Verificacion de umbrales
- **Falta (del listado del Art. 55.3):**
  - Multiples remesas a mismo pais por diferentes remitentes
  - Montos cercanos al limite PCC (structuring especifico de remesas)
  - Cambio frecuente de datos personales
  - Documentacion dudosa o ilegible
  - Nerviosismo o dudas del cliente
  - Ubicacion incoherente del PAF con domicilio/negocio del cliente
- **Recomendacion:** Muchas de estas senales requieren registro manual por el cajero. Agregar un campo de "observaciones de alerta" en la operacion.

### 3.3 Gestion de Listas Internacionales — Art. 49
- **Estado:** PARCIAL
- **Implementado:**
  - Tabla `personas_riesgos` con registros
  - Verificacion automatica por documento al operar
  - Cruce en motor PLAFT
- **Falta:**
  - Mecanismo de importacion/actualizacion de listas (ONU, OFAC, GAFI, UE)
  - Frecuencia de actualizacion (el instructivo exige verificacion bimensual)
  - Log de actualizaciones de listas con fecha y fuente
  - Proceso batch de re-verificacion de toda la base de clientes
- **Recomendacion:** Implementar importador automatico o semi-automatico de listas internacionales con registro de fecha de actualizacion.

### 3.4 Reporte UIF — Art. 57
- **Estado:** PARCIAL
- **Implementado:**
  - Tabla `reporte_uif` en base de datos
  - Generacion de PDF del reporte (`UifExporter.php` → `reportPdf()`)
  - Vista PLAFT con recomendacion de elevar ROS
- **Falta:**
  - Interfaz de usuario para crear/gestionar reportes
  - Workflow de analisis documentado (constancia escrita del analisis, observaciones, juicios de valor)
  - Control de plazo de 48 horas
  - Confidencialidad (acceso restringido a Funcionario Responsable)
  - Integracion con sistema electronico de la UIF

### 3.5 Deteccion de Operaciones Inusuales/Sospechosas — Art. 55-57
- **Estado:** PARCIAL
- **Implementado:**
  - Deteccion estadistica automatica (NotificacionService)
  - Motor PLAFT con umbral, fraccionamiento, frecuencia
  - Alertas de riesgo (cotizacion, concentracion, brecha)
- **Falta:**
  - Workflow completo: señal de alerta → analisis → operacion inusual → verificacion/descarte → ROS
  - Registro de analisis con constancia escrita (Art. 56.III)
  - Las 13 categorias de senales de alerta del Art. 55 (solo 3-4 estan automatizadas)
  - Senales de alerta de empleados internos (Art. 55.10)
  - Senales de operaciones con paises no cooperantes (Art. 55.11)
  - Senales de financiamiento del terrorismo (Art. 55.12)

### 3.6 Capacitacion — Art. 59-61
- **Estado:** PARCIAL
- **Implementado:**
  - Modulo RRHH con gestion de capacitaciones
  - Cumplimiento de capacitaciones obligatorias
  - Registro de participantes
- **Falta:**
  - Clasificacion especifica como "LGI/FT"
  - Cronograma diferenciado por rol (directorio anual, funcionarios semestral)
  - Capacitacion en 30 dias para nuevos empleados
  - Evaluaciones formales post-capacitacion
  - Reporte de cumplimiento del programa anual LGI/FT

### 3.7 Debida Diligencia del Cliente — Art. 34-40
- **Estado:** PARCIAL
- **Implementado:**
  - Persona natural: datos basicos completos
  - Persona juridica: razon social, NIT, contacto
  - Beneficiario final: datos completos
  - Formulario complemento UIF
  - PEP y listas de riesgo
- **Falta:**
  - **Art. 35 — Persona Juridica completa:** escritura de constitucion, poder del representante legal, SEPREC, estructura accionaria, estados financieros
  - **Art. 37 — Usuarios habituales:** reglas especificas para usuarios que operan >= 3 veces en 30 dias (se convierten en clientes)
  - **Art. 39 — Beneficiario final profundizado:** verificar cadena de propiedad >= 20% de acciones
  - **Art. 40 — Cliente interno:** debida diligencia sobre empleados propios
  - **Art. 43 — Corresponsalias:** KYC para corresponsales (si aplica)
  - **Art. 44 — Transferencias electronicas >= USD 1,000:** datos del originador
  - **Art. 45 — Proveedores:** debida diligencia sobre proveedores

---

## 4. OPORTUNIDADES DE MEJORA

### 4.1 Automatizar Senales de Alerta Especificas de Casa de Cambio
- El Art. 55.13 lista senales especificas para cambio de moneda. Muchas son detectables automaticamente:
  - **Structuring de USD 3,000:** detectar operaciones justo bajo USD 3,000 en ventana de 1-5 dias
  - **Incremento repentino:** comparar frecuencia/monto actual vs historico del cliente
  - **Inconsistencia actividad economica:** cruzar monto operado vs actividad economica registrada
  - **Alta denominacion:** si el sistema registra denominacion de billetes, detectar patrones

### 4.2 Parametrizar Constantes PLAFT
- Los umbrales en `RiesgoPLAFT.php` estan hardcodeados como constantes PHP:
  - `UMBRAL_BOB = 70,000`
  - `FRACC_MINOPS = 3`
  - `FREQ_OPS = 15`
- **Recomendacion:** Migrar a tabla `parametros` como ya se hizo con los umbrales UIF de cambio/remesa, para cumplir con la directriz de no tener valores hardcodeados.

### 4.3 Dashboard de Cumplimiento Consolidado
- Los modulos UIF, Riesgos y Auditoria existen como APIs backend separadas
- **Recomendacion:** Un dashboard unico que muestre:
  - Estado de PCC del mes (llenados vs pendientes de envio a UIF)
  - Proxima verificacion bimensual de listas
  - Senales de alerta activas pendientes de analisis
  - ROS en proceso (con timer de 48h)
  - Estado del programa de capacitacion LGI/FT
  - Proxima auditoria semestral

### 4.4 Workflow de Escalamiento
- Actualmente las alertas son notificaciones pasivas
- **Recomendacion:** Implementar workflow formal:
  1. Senal de alerta detectada → notificacion a cajero/supervisor
  2. Analisis inicial → registro de hallazgos
  3. Solicitud de informacion al cliente
  4. Calificacion: descarte justificado o escalamiento a sospechosa
  5. ROS automatico con template pre-llenado
  6. Timer de 48 horas con escalamiento automatico

### 4.5 Campo de Observaciones del Cajero
- Muchas senales de alerta del Art. 55 son conductuales (nerviosismo, renuencia, documentacion dudosa)
- **Recomendacion:** Agregar campo de "Observaciones de cumplimiento" en la interfaz del cajero con opciones predefinidas basadas en el listado del Art. 55, para registro sistematico

### 4.6 Registro de Origen y Destino de Fondos
- El instructivo exige conocer origen y destino de fondos en multiples escenarios
- **Recomendacion:** Hacer los campos `origen` y `destino` obligatorios (no solo en PCC) para operaciones que superen un umbral menor configurable

### 4.7 Confidencialidad de ROS — Art. 67
- Los ROS y su documentacion son estrictamente confidenciales
- **Recomendacion:** Cuando se implemente el modulo ROS, aplicar:
  - Acceso exclusivo para Funcionario Responsable (rol dedicado)
  - Cifrado de datos en reposo
  - Log de acceso independiente
  - No visible en reportes generales ni dashboard comun

---

## 5. MATRIZ RESUMEN POR ARTICULO

| Cap. | Art. | Tema | Estado | Prioridad |
|------|------|------|--------|-----------|
| I | 1-4 | Disposiciones generales | N/A (organizacional) | — |
| II | 5-8 | Sujeto obligado, directorio, comite | N/A (organizacional) | — |
| III | 9-14 | Unidad de cumplimiento | N/A (organizacional) | — |
| IV | 15-17 | Plan anual, manual interno | N/A (organizacional) | — |
| V | 18-22 | Politica de gestion de riesgos | N/A (organizacional) | — |
| V | 23-28 | Metodologia gestion de riesgos | **IMPLEMENTADO** | — |
| VI | 29-33 | Factores de riesgo | **PARCIAL** | Media |
| VII | 34 | DD persona natural | **IMPLEMENTADO** | — |
| VII | 35 | DD persona juridica | **PARCIAL** | Media |
| VII | 36 | DD cliente existente | **PARCIAL** | Media |
| VII | 37 | DD usuarios/usuarios habituales | **PARCIAL** | Alta |
| VII | 38 | Actualizacion de informacion | **PARCIAL** | Media |
| VII | 39 | Beneficiario final | **IMPLEMENTADO** | — |
| VII | 40 | Cliente interno | **NO IMPLEMENTADO** | Media |
| VII | 41-42 | Politica aceptacion clientes | N/A (organizacional) | — |
| VII | 43 | Corresponsalias | **NO IMPLEMENTADO** | Baja |
| VII | 44 | Transferencias electronicas | **PARCIAL** | Alta |
| VII | 45 | Proveedores | **NO IMPLEMENTADO** | Baja |
| VII | 46-48 | Productos nuevos, monitoreo | **PARCIAL** | Media |
| VII | 49 | Listas internacionales | **PARCIAL** | Alta |
| VII | 50 | Paises no cooperantes | **NO IMPLEMENTADO** | Media |
| VII | 51 | Debida diligencia niveles | **NO IMPLEMENTADO** | Alta |
| VII | 52 | Formulario PCC-01 | **NO IMPLEMENTADO** | Alta |
| VII | 52 | Formulario PCC-06 | **IMPLEMENTADO** | — |
| VII | 52 | Formulario PCC-08 | **IMPLEMENTADO** | — |
| VII | 52 | Remision mensual PCC | **NO IMPLEMENTADO** | Alta |
| VIII | 53 | Identificacion PEP | **IMPLEMENTADO** | — |
| VIII | 53 | Verificacion semestral PEP | **NO IMPLEMENTADO** | Alta |
| VIII | 54 | BD PEP mensual | **NO IMPLEMENTADO** | Alta |
| IX | 55 | Senales de alerta | **PARCIAL** | Alta |
| IX | 56 | Operaciones inusuales | **PARCIAL** | Alta |
| IX | 57-58 | ROS | **PARCIAL** | Critica |
| X | 59-61 | Capacitacion LGI/FT | **PARCIAL** | Media |
| XI | 62-65 | Auditorias | **PARCIAL** | Alta |
| XII | 66 | Conservacion 10 anos | **NO IMPLEMENTADO** | Alta |
| XII | 67 | Confidencialidad | **PARCIAL** | Alta |
| XII | 68 | Responsabilidades | N/A (organizacional) | — |

---

## 6. PLAN DE ACCION SUGERIDO (por prioridad)

### Prioridad CRITICA
1. **Modulo ROS completo** — Crear workflow de reporte de operaciones sospechosas con timer de 48h, acceso restringido, y documentacion de analisis

### Prioridad ALTA
2. **Verificar necesidad de PCC-01** — Consultar con UIF si aplica adicionalmente al PCC-06/PCC-08 para casas de cambio
3. **Remision mensual de PCC** — Proceso automatizado de consolidacion y exportacion en formato UIF
4. **Base de datos PEP mensual** — Exportacion mensual antes del dia 15
5. **Verificacion bimensual de listas** — Proceso batch de cruce masivo con log de resultados
6. **Verificacion semestral PEP** — Proceso de re-verificacion con workflow de autorizacion
7. **Senales de alerta ampliadas** — Especialmente las del Art. 55.13 (cambio de moneda)
8. **Parametrizar constantes PLAFT** — Migrar de PHP constants a tabla `parametros`
9. **Politica de conservacion de datos** — Implementar retencion de 10 anos con backups
10. **Niveles de debida diligencia** — Workflow simplificada/continua/intensificada

### Prioridad MEDIA
11. **Capacitacion LGI/FT especifica** — Etiquetar en modulo RRHH, cronograma por rol
12. **Template auditoria semestral** — Checklist del Art. 63 (12 puntos)
13. **DD persona juridica completa** — Documentos adicionales (escritura, SEPREC, estructura)
14. **Cliente interno KYC** — Debida diligencia sobre empleados
15. **Campo observaciones cajero** — Registro de senales de alerta conductuales

### Prioridad BAJA
16. **DD proveedores** — Si aplica segun volumen
17. **DD corresponsalias** — Si Gambarte opera como corresponsal
