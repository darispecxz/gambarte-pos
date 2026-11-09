# Pendientes de Cumplimiento UIF/ASFI — GambartePOS

> Basado en: Instructivo EIF v3 (R21-2019) — UIF Bolivia
> Fecha de análisis: 2026-09-28
> Última actualización: 2026-09-29

---

## Estado Actual

El módulo POS cubre la operativa del cajero: formularios PCC-06/PCC-08, verificación PEP/listas, señales de alerta Art. 55.13, observaciones del cajero, usuario habitual Art. 37, origen/destino por umbral, bloqueo DD incompleta, y motor PLAFT parametrizado. Lo que falta es la capa de **gestión, reporte y procesos periódicos** que exige la normativa.

---

## 1. PRIORIDAD CRÍTICA

### 1.1 Módulo ROS — Reporte de Operaciones Sospechosas (Art. 57-58)

**Qué exige la norma:**
- Cuando una operación inusual no puede ser justificada, se convierte en sospechosa y debe reportarse a la UIF en máximo **48 horas** desde la detección.
- Solo el **Funcionario Responsable** de la Unidad de Cumplimiento debe conocer y gestionar los ROS.
- El reporte debe incluir: datos del cliente, descripción de la operación, motivo de sospecha, documentación de respaldo, análisis realizado.
- Debe quedar **constancia escrita** del análisis (Art. 56.III).
- Los ROS son **estrictamente confidenciales** (Art. 67).

**Qué implementar:**

1. **Tabla `reporte_operacion_sospechosa`:**
   - `id`, `codigo` (auto-generado GMB/ROS-YYYY-NNN)
   - `usuario_financiero_id` — cliente involucrado
   - `operacion_tipo` (cambio/remesa), `operacion_id`
   - `fecha_deteccion`, `fecha_limite` (detección + 48h)
   - `fecha_envio` (cuando se remitió a la UIF)
   - `estado` (pendiente_analisis, en_analisis, descartado, pendiente_envio, enviado)
   - `motivo_sospecha` TEXT
   - `analisis` TEXT — constancia escrita del análisis
   - `conclusion` TEXT
   - `documentos_respaldo` JSON — lista de archivos adjuntos
   - `cod_usuario_detector` — cajero que detectó
   - `cod_usuario_responsable` — funcionario responsable que gestiona
   - `observaciones_descarte` TEXT — si se descarta, justificación

2. **Workflow de escalamiento:**
   ```
   Señal de alerta detectada (automática o manual por cajero)
     → Notificación al supervisor
       → Análisis inicial (registro de hallazgos)
         → Solicitud de información al cliente (opcional)
           → Calificación:
             A) Descarte justificado (registrar motivo)
             B) Escalamiento a sospechosa → ROS
               → Timer 48h con alertas a 24h, 12h, 6h, 1h
                 → Envío a UIF (registrar fecha/hora)
   ```

3. **Interfaz de gestión ROS:**
   - Acceso exclusivo por rol `funcionario_responsable`
   - Lista de ROS pendientes con timer visual (rojo si < 12h)
   - Formulario de análisis con campos estructurados
   - Adjuntar documentación de respaldo
   - Botón de envío (manual o integración con sistema UIF si existe API)
   - Historial completo de acciones sobre cada ROS

4. **Seguridad:**
   - Rol dedicado `funcionario_responsable` (NO usar roles existentes de admin/supervisor)
   - Log de acceso independiente al módulo ROS
   - ROS NO visible en dashboard general, reportes generales, ni módulo de auditoría estándar
   - Cifrado de datos en reposo para tabla ROS (si la BD lo soporta)

5. **Conexión con el POS:**
   - Desde el panel UIF del cajero (cuando hay alertas/señales), botón "Escalar a análisis"
   - Crea registro en `reporte_operacion_sospechosa` con estado `pendiente_analisis`
   - Notificación push/email al funcionario responsable

**Tablas existentes relacionadas:** `reporte_uif` (ya existe pero sin workflow), `UifExporter.php` → `reportPdf()` (genera PDF del reporte)

**Endpoints sugeridos:**
- `POST /uif/ros` — crear nuevo ROS
- `GET /uif/ros` — listar ROS (solo funcionario responsable)
- `GET /uif/ros/{id}` — detalle de un ROS
- `PUT /uif/ros/{id}` — actualizar análisis/estado
- `POST /uif/ros/{id}/enviar` — marcar como enviado a UIF
- `POST /uif/ros/{id}/descartar` — descartar con justificación
- `GET /uif/ros/alertas` — ROS próximos a vencer (< 12h)

---

## 2. PRIORIDAD ALTA

### 2.1 Remisión Mensual de PCC a la UIF (Art. 52, VII)

**Qué exige la norma:**
- Remitir a la UIF **mensualmente** todos los formularios PCC llenados el mes anterior.
- Si no se llenó ningún PCC en el mes, **también se debe informar** (informe negativo).
- Formato definido por la UIF.

**Qué implementar:**

1. **Proceso de consolidación mensual:**
   - Query que extraiga todos los registros de `cambio` con `impresion_pcc06 = 'S'` del mes anterior
   - Query que extraiga todos los registros de `remesa` con `impresion_pcc08 = 'S'` del mes anterior
   - Consolidar en un archivo (Excel o formato UIF)
   - Si no hay registros → generar informe negativo

2. **Tabla `pcc_remision_mensual`:**
   - `id`, `periodo` (YYYY-MM), `tipo` (PCC-06/PCC-08/NEGATIVO)
   - `cantidad_formularios`, `fecha_generacion`, `fecha_envio`
   - `archivo_generado` (ruta al archivo exportado)
   - `estado` (generado, enviado, confirmado)
   - `cod_usuario` — quién generó/envió
   - `observaciones`

3. **Interfaz:**
   - Pantalla en módulo de cumplimiento
   - Selector de mes/año
   - Botón "Generar consolidado"
   - Vista previa de los PCC incluidos
   - Botón "Marcar como enviado"
   - Historial de remisiones con estado

4. **Alerta automática:**
   - Si al día 5 del mes no se ha generado la remisión del mes anterior → notificación

**Datos que debe incluir cada PCC remitido (verificar formato UIF exacto):**
- Datos del cliente (nombre, documento, expedición)
- Tipo y monto de operación
- Origen y destino de fondos
- Datos del tercero (si aplica)
- Fecha de operación
- Agencia

---

### 2.2 Base de Datos PEP Mensual (Art. 54)

**Qué exige la norma:**
- Elaborar base de datos de clientes catalogados como PEP.
- Actualizar mensualmente (agregar nuevos, excluir relaciones terminadas).
- Remitir a la UIF **antes del día 15** del mes siguiente.
- Formato definido por la UIF.

**Qué implementar:**

1. **Proceso de generación mensual:**
   - Query: todos los `usuario_financiero` donde `pep = 'S'`, enriquecido con datos de la tabla `pep` y `usuario_financiero_complemento`
   - Incluir: nombre completo, documento, tipo PEP (NAL/EXT), cargo, entidad, fecha desde que es PEP
   - Excluir: clientes cuya relación PEP terminó hace más de N años (parámetro `limite_anyos_ya_no_pep`)

2. **Tabla `pep_remision_mensual`:**
   - `id`, `periodo` (YYYY-MM)
   - `cantidad_pep`, `nuevos`, `excluidos`
   - `fecha_generacion`, `fecha_envio`
   - `archivo_generado`
   - `estado` (generado, enviado)

3. **Formato de exportación:**
   - Verificar con la UIF el formato exacto (probablemente Excel con columnas predefinidas)
   - Campos mínimos: nombre, documento, tipo doc, cargo PEP, entidad, tipo (NAL/EXT), fecha registro

4. **Alerta:** Si al día 10 del mes no se ha generado → notificación.

---

### 2.3 Verificación Bimensual de Listas Internacionales (Art. 49)

**Qué exige la norma:**
- Verificar **bimensualmente** (cada 2 meses) TODA la base de clientes contra listas ONU, OFAC, GAFI y otras.
- Documentar resultados del cruce.
- Tomar acciones sobre coincidencias.

**Qué implementar:**

1. **Proceso batch:**
   - Cruzar TODOS los registros de `usuario_financiero` contra `personas_riesgos`
   - Registrar: total clientes verificados, total coincidencias, detalle de cada coincidencia
   - Ejecutable manualmente o por cron job

2. **Tabla `verificacion_listas`:**
   - `id`, `fecha_verificacion`
   - `total_clientes_verificados`, `total_coincidencias`
   - `estado` (en_proceso, completado, con_acciones_pendientes)
   - `cod_usuario`
   - `observaciones`

3. **Tabla `verificacion_listas_detalle`:**
   - `id`, `verificacion_id`
   - `usuario_financiero_id`
   - `lista_coincidencia` (ONU/OFAC/GAFI/UE)
   - `accion_tomada` TEXT
   - `estado` (pendiente, revisado, reportado)

4. **Importador de listas:**
   - Mecanismo para actualizar la tabla `personas_riesgos` desde archivos oficiales
   - Formatos: CSV, XML (ONU publica en XML)
   - Log de importación: fecha, fuente, cantidad de registros importados/actualizados/eliminados
   - Tabla `personas_riesgos_importacion_log`: `id`, `fecha`, `fuente`, `registros_nuevos`, `registros_actualizados`, `registros_total`

5. **Calendario bimensual:** Ene, Mar, May, Jul, Sep, Nov — alerta si no se ejecutó.

---

### 2.4 Verificación Semestral PEP (Art. 53, III)

**Qué exige la norma:**
- Semestralmente verificar si algún cliente ha adquirido la característica de PEP.
- Si se detecta un nuevo PEP, solicitar **autorización de Alta Gerencia** para continuar la relación.

**Qué implementar:**

1. **Proceso semestral:**
   - Cruzar TODOS los `usuario_financiero` contra tabla `pep` actualizada
   - Identificar nuevos PEP que no estaban marcados en `usuario_financiero.pep`
   - Generar lista de clientes que requieren autorización de Alta Gerencia

2. **Workflow de autorización:**
   - Para cada nuevo PEP detectado:
     - Notificación al funcionario responsable
     - Solicitud de autorización a Alta Gerencia
     - Registro de la decisión (autorizado/rechazado) con fecha y firma
     - Si rechazado → marcar relación como terminada

3. **Tabla `pep_verificacion_semestral`:**
   - `id`, `periodo` (YYYY-S1/S2), `fecha_verificacion`
   - `total_verificados`, `nuevos_pep_detectados`
   - `estado` (completado, pendiente_autorizacion)

4. **Calendario:** Cortes 30 de junio y 31 de diciembre.

---

### 2.5 Formulario PCC-01 — Declaración Jurada (Art. 52)

**Qué exige la norma:**
- Formulario de Declaración Jurada para operaciones >= USD 10,000 (o equivalente).
- Es **adicional** al PCC-06/PCC-08 según el tipo de operación.
- Aplica a: operaciones únicas >= USD 10,000, cambio >= USD 3,000 en 1-5 días, giros >= USD 2,000 en 1-5 días.

**Acción requerida:**
- **Primero:** Consultar formalmente con la UIF si el PCC-01 aplica como formulario adicional para casas de cambio o si los PCC-06/PCC-08 lo reemplazan.
- **Si aplica:** Implementar lógica similar a PCC-06/PCC-08 con umbral propio y generación de PDF.
- El PCC-01 tiene campos diferentes: es una declaración jurada sobre el origen lícito de fondos, no un formulario operativo.

---

### 2.6 Política de Conservación de Datos — 10 Años (Art. 66)

**Qué exige la norma:**
- Conservar al menos **10 años**:
  - Registros de operaciones
  - Documentos de debida diligencia
  - Registros de transferencias electrónicas
  - Bases de datos
  - Copias de documentos de identidad
  - Observaciones sobre operaciones inusuales
- Los registros deben ser suficientes para reconstruir operaciones como prueba judicial.

**Qué implementar:**

1. **Política de retención en BD:**
   - Prohibir DELETE en tablas operativas (cambio, remesa, usuario_financiero, pcc, reporte_uif)
   - Soft delete con campo `eliminado` si es necesario, pero nunca borrado físico
   - Particionamiento de tablas por año si el volumen lo requiere

2. **Backups:**
   - Backup diario incremental
   - Backup semanal completo
   - Retención de backups: mínimo 10 años
   - Almacenamiento off-site (cloud o cinta)
   - Pruebas de restauración semestrales

3. **Documentación:**
   - Documento formal de política de retención
   - Procedimiento de restauración
   - Responsable designado

---

### 2.7 Auditoría Semestral LGI/FT (Art. 62-63)

**Qué exige la norma:**
- Auditorías semestrales con corte 30 de junio y 31 de diciembre.
- Remitir informes a UIF: 31 de agosto y 28 de febrero.
- Debe incluir acta de Directorio.
- El Art. 63 define **12 puntos de alcance**:
  1. Cumplimiento de normativa LGI/FT
  2. Gobierno corporativo (unidad de cumplimiento, comité)
  3. Sistemas de información
  4. Metodología de gestión de riesgos
  5. Sistemas informáticos
  6. Controles internos
  7. Debida diligencia
  8. Registros de operaciones inusuales y ROS
  9. Capacitación
  10. Conservación de información
  11. Código de conducta
  12. Plan anual de cumplimiento

**Qué implementar:**

1. **Template de auditoría:**
   - Checklist interactivo con los 12 puntos
   - Para cada punto: estado (cumple/no cumple/parcial), evidencia, observaciones, recomendaciones
   - Generación de PDF del informe

2. **Tabla `auditoria_semestral_lgift`:**
   - `id`, `periodo` (YYYY-S1/S2)
   - `fecha_inicio`, `fecha_fin`, `fecha_envio_uif`
   - `estado` (en_proceso, completado, enviado)
   - `resultado_general` (satisfactorio/con_observaciones/insatisfactorio)
   - `acta_directorio` (referencia al acta)

3. **Calendario:** Alertas en mayo y noviembre para iniciar la auditoría.

---

## 3. PRIORIDAD MEDIA

### 3.1 Debida Diligencia Intensificada como Workflow (Art. 51)

**Qué exige la norma:**
- Tres niveles de DD: simplificada, continua, intensificada.
- Aplicar intensificada cuando hay sospecha de LGI/FT o mayor riesgo.
- Si no se puede cumplir DD → no iniciar relación o dar por finalizada.

**Qué implementar:**

1. **Campo `nivel_dd` en `usuario_financiero`:**
   - Valores: `simplificada`, `continua`, `intensificada`
   - Default: `simplificada`
   - Se escala automáticamente basado en:
     - PEP detectado → `intensificada`
     - Lista de riesgo → `intensificada`
     - Usuario habitual (3+ ops) → `continua`
     - ROS previo → `intensificada`
     - Actividad económica de riesgo alto → `continua`

2. **Requisitos por nivel:**
   - **Simplificada:** datos básicos (lo que ya se captura)
   - **Continua:** datos básicos + complemento + actualización anual
   - **Intensificada:** todo lo anterior + documentación de respaldo + autorización de Alta Gerencia + monitoreo reforzado

3. **Bloqueo por nivel:**
   - Si `nivel_dd = intensificada` y no tiene complemento completo → bloquear operación (ya implementado parcialmente con `dd_bloqueado`)
   - Si no se puede completar DD → opción de "rechazar relación" con registro del motivo

---

### 3.2 DD Persona Jurídica Completa (Art. 35)

**Qué exige la norma (adicional a lo que ya se captura):**
- Escritura de constitución (número, fecha, notaría)
- Poder del representante legal
- Registro SEPREC (Fundempresa)
- Estructura accionaria (accionistas con >= 20% de participación)
- Estados financieros (último ejercicio)

**Qué implementar:**

1. **Ampliar tabla `personas_juridicas` o crear `persona_juridica_complemento`:**
   - `escritura_numero`, `escritura_fecha`, `escritura_notaria`
   - `poder_representante` (referencia/número)
   - `seprec_matricula`, `seprec_fecha_renovacion`
   - `estructura_accionaria` JSON (nombre, documento, porcentaje)
   - `estados_financieros_periodo`, `estados_financieros_adjunto`

2. **Validación:** Requerir estos campos cuando el tipo de persona es jurídica y el monto supera umbrales.

---

### 3.3 Capacitación LGI/FT Específica (Art. 59-61)

**Qué exige la norma:**
- Programa anual de capacitación LGI/FT aprobado por Directorio
- Capacitación especializada para Unidad de Cumplimiento
- Capacitación anual a Directorio y ejecutivos
- Capacitación **semestral** a funcionarios con evaluación
- Capacitación a nuevos empleados en **30 días hábiles**
- Registro: fecha, participantes, temas, evaluaciones

**Qué implementar en el módulo RRHH existente:**

1. **Campo `categoria` en tabla de capacitaciones:**
   - Valores: `general`, `lgift`, `lgift_directorio`, `lgift_cumplimiento`

2. **Reglas de cumplimiento:**
   - Directorio/ejecutivos: al menos 1 capacitación LGI/FT por año
   - Funcionarios: al menos 1 cada 6 meses
   - Nuevos empleados: dentro de 30 días hábiles desde ingreso
   - Unidad de cumplimiento: capacitación especializada anual

3. **Evaluaciones post-capacitación:**
   - Campo `evaluacion_nota` y `evaluacion_aprobado` en registro de participación
   - Nota mínima configurable

4. **Reporte de cumplimiento anual:**
   - Dashboard con porcentaje de cumplimiento por rol
   - Lista de empleados que no han cumplido su capacitación LGI/FT
   - Exportable para auditoría

---

### 3.4 Cliente Interno — KYC de Empleados (Art. 40)

**Qué exige la norma:**
- Aplicar debida diligencia sobre los propios empleados.
- Conocer antecedentes y situación patrimonial.
- Identificar cambios inusuales en estilo de vida o patrimonio.

**Qué implementar:**

1. **Ampliar módulo RRHH:**
   - Datos KYC del empleado: patrimonio declarado, ingresos adicionales, actividades secundarias
   - Declaración jurada anual de patrimonio
   - Antecedentes (verificación SEGIP, antecedentes penales)

2. **Monitoreo:**
   - Comparar patrimonio declarado año a año
   - Alerta si un empleado opera como cliente con montos inusuales (cruzar tabla empleados con `usuario_financiero`)

---

### 3.5 Actualización Periódica de Información (Art. 38)

**Qué exige la norma:**
- Actualizar datos del cliente periódicamente (frecuencia basada en nivel de riesgo).
- Verificar que la información sigue siendo vigente.

**Qué implementar:**

1. **Campo `fecha_ultima_actualizacion` en `usuario_financiero`** (puede ya existir).
2. **Reglas de vencimiento:**
   - Riesgo bajo: actualizar cada 2 años
   - Riesgo medio: cada año
   - Riesgo alto/PEP: cada 6 meses
3. **Alerta al cajero:** "Datos del cliente desactualizados (última actualización: hace X meses)" al buscar un cliente cuya información venció.

---

### 3.6 Señales de Alerta Ampliadas (Art. 55)

**Señales del Art. 55 que NO están automatizadas y requieren registro manual o lógica adicional:**

**Para cambio de moneda (Art. 55.13):**
- c) Menores de edad, turistas, extranjeros con montos inconsistentes con su perfil
- d) Solicitud frecuente de billetes de alta denominación o entrega de baja denominación
- e) Preocupación inusual por requisitos de información del PCC
- f) Renuencia al llenado de formularios
- g) Múltiples personas cambiando moneda coordinadamente
- h) Operaciones sin sentido económico aparente
- i) Billetes con marcas o características inusuales
- j) Cliente que busca evitar dejar registro de la operación

**Para giros/remesas (Art. 55.3):**
- Múltiples remesas a mismo país por diferentes remitentes
- Cambio frecuente de datos personales
- Documentación dudosa o ilegible
- Ubicación incoherente del PAF con domicilio del cliente

**Para empleados internos (Art. 55.10):**
- Estilo de vida inconsistente con ingresos
- Resistencia a tomar vacaciones
- Horas de trabajo inusuales sin justificación

**Implementación:** La mayoría ya se cubren con el campo de observaciones del cajero (implementado). Para completar:
- Agregar las señales faltantes como opciones predefinidas en el selector de observaciones
- Para señales de empleados: módulo separado en RRHH/Cumplimiento

---

### 3.7 Países No Cooperantes (Art. 50)

**Qué exige la norma:**
- Prestar especial atención a operaciones con países identificados como no cooperantes por GAFI.
- Aplicar contramedidas proporcionales al riesgo.

**Qué implementar:**

1. **Tabla `paises_no_cooperantes`:**
   - `id_pais` (FK a tabla `pais`), `fuente` (GAFI), `fecha_inclusion`, `estado`

2. **Verificación al registrar operación:**
   - Si `cliente.id_pais` está en lista → alerta de nivel alto
   - Si destino de remesa está en lista → alerta de nivel alto

3. **Actualización:** Manual o semi-automática cuando GAFI actualiza la lista (generalmente febrero y octubre).

---

## 4. PRIORIDAD BAJA

### 4.1 DD Proveedores (Art. 45)

- Aplica si el volumen de proveedores lo justifica
- Tabla `proveedor_kyc` con datos básicos + verificación contra listas
- Evaluación anual de riesgo

### 4.2 DD Corresponsalías (Art. 43)

- Solo aplica si Gambarte opera como corresponsal de otra entidad
- KYC del corresponsal: licencia, supervisión, controles LGI/FT
- Evaluación antes de iniciar relación

### 4.3 Dashboard Consolidado de Cumplimiento

- Vista única para el Funcionario Responsable con:
  - PCC del mes (llenados / pendientes de envío)
  - Próxima verificación bimensual de listas
  - Señales de alerta activas pendientes de análisis
  - ROS en proceso (con timer)
  - Estado del programa de capacitación LGI/FT
  - Próxima auditoría semestral
  - Estado de remisión mensual PEP

---

## 5. CALENDARIO DE OBLIGACIONES PERIÓDICAS

| Frecuencia | Obligación | Fecha límite | Art. |
|------------|-----------|--------------|------|
| Mensual | Remisión PCC a UIF | Día 10 del mes siguiente | 52 |
| Mensual | BD PEP a UIF | Antes del día 15 | 54 |
| Bimensual | Verificación masiva listas internacionales | Ene, Mar, May, Jul, Sep, Nov | 49 |
| Semestral | Verificación PEP en base de clientes | Jun 30, Dic 31 | 53 |
| Semestral | Capacitación LGI/FT a funcionarios | Jun, Dic | 60 |
| Semestral | Auditoría LGI/FT | Informe: Ago 31 y Feb 28 | 62 |
| Anual | Capacitación LGI/FT a Directorio | Antes de Dic 31 | 60 |
| Anual | Programa anual de capacitación (aprobación) | Inicio del año | 59 |
| Anual | Declaración patrimonial empleados | — | 40 |
| Continuo | ROS | 48h desde detección | 57 |
| Continuo | Actualización datos cliente | Según nivel riesgo | 38 |

---

## 6. TABLAS NUEVAS NECESARIAS (Resumen)

| Tabla | Módulo | Prioridad |
|-------|--------|-----------|
| `reporte_operacion_sospechosa` | ROS | Crítica |
| `ros_historial` | ROS | Crítica |
| `pcc_remision_mensual` | Remisión PCC | Alta |
| `pep_remision_mensual` | BD PEP | Alta |
| `verificacion_listas` | Listas internacionales | Alta |
| `verificacion_listas_detalle` | Listas internacionales | Alta |
| `personas_riesgos_importacion_log` | Listas internacionales | Alta |
| `pep_verificacion_semestral` | PEP semestral | Alta |
| `auditoria_semestral_lgift` | Auditoría | Alta |
| `auditoria_semestral_detalle` | Auditoría | Alta |
| `paises_no_cooperantes` | Países GAFI | Media |
| `persona_juridica_complemento` | DD PJ | Media |

---

## 7. ORDEN DE IMPLEMENTACIÓN SUGERIDO

1. **ROS** (Art. 57-58) — Es la obligación más crítica, tiene plazo legal de 48h
2. **Remisión mensual PCC** (Art. 52) — Relativamente simple, alto impacto regulatorio
3. **BD PEP mensual** (Art. 54) — Similar a remisión PCC
4. **Verificación bimensual listas** (Art. 49) — Proceso batch, una sola vez y queda
5. **Verificación semestral PEP** (Art. 53) — Complementa el punto 3
6. **Consultar PCC-01** con la UIF — Podría no aplicar, pero hay que confirmarlo
7. **Niveles DD** (Art. 51) — Mejora el bloqueo ya implementado
8. **Política retención 10 años** (Art. 66) — Más de infraestructura que de código
9. **Template auditoría semestral** (Art. 62-63) — Necesario para las fechas fijas
10. **Capacitación LGI/FT** (Art. 59-61) — Extensión del módulo RRHH existente
11. **Países no cooperantes** (Art. 50) — Tabla + verificación simple
12. **DD persona jurídica** (Art. 35) — Campos adicionales
13. **Cliente interno** (Art. 40) — Módulo RRHH
14. **DD proveedores/corresponsalías** (Art. 43, 45) — Solo si aplica
15. **Dashboard consolidado** — Integra todo lo anterior
