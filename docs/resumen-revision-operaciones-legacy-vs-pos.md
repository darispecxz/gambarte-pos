# Resumen: operaciones del legacy frente al POS nuevo

Documento de síntesis de las revisiones realizadas para **Giros Nacionales**, **Giros Internacionales** y **Cambios de Moneda**. Separa la funcionalidad que ya está cubierta de las diferencias o verificaciones pendientes.

## Resumen ejecutivo

| Operación | Cobertura principal en el POS | Pendientes / decisiones |
|---|---|---|
| Giros Nacionales | Se solicitó igualar la UI al flujo de remesas: resumen, datos complementarios y PCC-08; se implementaron los cambios acordados. | La confirmación del monto se dejó fuera explícitamente, por indicación del usuario. |
| Giros Internacionales | Registro de remitente y destinatario, destinatarios previos, pago en Chile (efectivo o depósito), cotización, comisión/cargos, controles UIF/PCC-08, formulario complementario y forma de cobro. | Alinear la longitud de origen/destino de fondos con el legacy; ofrecer constancias imprimibles de listas y formularios de cumplimiento; confirmar equivalencia de fuentes de screening. |
| Cambios de Moneda | Compra y venta, monedas, tipo de cambio, confirmación, total/comisión, efectivo recibido y cambio, perfil de cliente y controles UIF/PCC-06. | Revisar longitud de origen/destino en los escenarios sin PCC-06; agregar o confirmar constancias imprimibles de listas y formularios de cumplimiento. |

## Giros Nacionales

La UI del POS se reorganizó para mantener consistencia con Remesas en el **Resumen de la operación**, **Datos complementarios** y **PCC-08**. El formulario de control de fondos incluye origen, destino y datos adicionales PCC-08 cuando correspondan.

**Decisión explícita:** no implementar la confirmación del monto. Se excluyó del alcance solicitado.

## Giros Internacionales

La revisión del legacy encontró que su flujo de remesa al exterior incluye importes y monedas, comisión y cargos, destinatarios previos y forma de pago en Chile. El POS nuevo cubre el flujo principal, incluida la opción de depósito a cuenta y sus datos de banco/cuenta, además de los controles UIF/PCC-08 y el formulario complementario.

### Diferencias por cerrar

1. **Longitud de los textos de fondos:** el legacy valida origen y destino entre 20 y 200 caracteres; la UI del POS indica un mínimo de 5. Confirmar la regla vigente y aplicarla de forma consistente también en servidor.
2. **Constancias de cumplimiento:** el legacy dispone de impresiones del complemento y del resultado de consulta de listas. En el POS no se identificó una opción equivalente desde el resultado de la operación; allí se ofrecen comprobante y factura.
3. **Fuentes de listas:** el legacy documenta consultas a PEP, OFAC, CSNU e Interpol. El servicio nuevo detecta PEP y personas de riesgo; falta verificar que las fuentes actuales cubran y auditen el mismo alcance.

## Cambios de Moneda

El legacy maneja dos operaciones: **compra** y **venta**. El POS nuevo ofrece ambas y contempla el tipo de cambio, los montos, la confirmación, el cálculo de total y comisión, el efectivo recibido y el cambio. También tiene identificación de cliente y evaluación UIF/PCC-06.

### Diferencias por cerrar

1. **Longitud de los textos de fondos:** el legacy valida entre 20 y 200 caracteres. El POS usa ese mínimo cuando requiere PCC-06, pero permite desde 5 en el otro escenario. Confirmar si el mínimo de 20 debe aplicarse también fuera de PCC-06.
2. **Constancias de cumplimiento:** el legacy tiene impresiones del formulario complementario y del resultado de listas de control. No se encontró una opción equivalente en la pantalla de resultado del POS; revisar si deben generarse allí.
3. **Fuentes de listas:** verificar que el screening nuevo cubra las listas que declara el legacy y conserve evidencia del resultado consultado.

## Recomendación

Antes de considerar cerrada la paridad con el legacy, acordar una regla única para la longitud de los textos de fondos y confirmar con Cumplimiento qué formularios/constancias deben poder imprimirse y cuáles listas deben consultarse. Para Giros Nacionales, mantener fuera la confirmación de monto mientras siga vigente la decisión indicada.

## Referencias de código revisadas

- Legacy Giros Internacionales: `C:\\wamp64\\www\\bo_cgr_hostinger\\modules\\giros_internacionales`
- Legacy Cambios: `C:\\wamp64\\www\\bo_cgr_hostinger\\modules\\cambios`
- POS nuevo, Remesas/Giro Internacional: `src/app/features/remesa/remesa.component.ts`
- POS nuevo, Cambios: `src/app/features/cambio/cambio.component.ts`
- API, controles de Remesas: `D:\\GitHub\\cgrapi\\app\\Modules\\Cajero\\Services\\CajeroRemesaService.php`
- API, controles de Cambios: `D:\\GitHub\\cgrapi\\app\\Modules\\Cajero\\Services\\CajeroCambioService.php`
