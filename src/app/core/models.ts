export interface Envelope<T> {
  success: boolean;
  data: T;
  message: string | null;
  errors: unknown[];
}

export interface CajaInfo {
  id_caja: number;
  num_caja: number;
  id_moneda: number;
  id_agencia: number;
  maximo: number;
  minimo: number;
  estado: string;
  moneda: string;
  moneda_desc: string;
  agencia: string;
  agencia_abr: string;
  saldo_actual: number;
  sesion_hoy: SesionInfo | null;
  boveda_disponible: number | null;
  boveda_abierta: boolean;
}

export interface SesionInfo {
  estado: 'sin_abrir' | 'abierta' | 'cerrada';
  saldo_apertura?: number;
  hora_apertura?: string;
  saldo_cierre?: number;
  hora_cierre?: string;
}

export interface Denominacion {
  id_corte: number;
  valor: number;
  id_moneda: number;
  moneda: string;
  id_tipo_corte: number;
  tipo_corte?: string;
  id_agrupacion: number;
  multiplicador: number;
  agrupacion: string;
}

export interface DenominacionInput {
  id_corte: number;
  id_tipo_corte: number;
  id_agrupacion: number;
  valor: number;
  multiplicador: number;
  cantidad: number;
}

export interface DisponibilidadInfo {
  caja: any;
  saldo_actual: number;
  sesion: SesionInfo;
  movimientos: number;
  boveda_saldo: number | null;
  boveda_minimo: number | null;
  boveda_maximo: number | null;
}

export interface AperturaResponse {
  id_caja: number;
  saldo_apertura: number;
  fecha: string;
  uuid: string;
}

export interface CierreResponse {
  id_caja: number;
  saldo_cierre: number;
  saldo_esperado: number;
  diferencia: number;
  fecha: string;
  uuid: string;
}

// --- Cambio de moneda ---

export interface CotizacionInfo {
  id_moneda: number;
  moneda: string;
  moneda_desc: string;
  compra: number | null;
  venta: number | null;
}

export interface ClienteInfo {
  id?: number;
  id_tipo_doc_identidad: number;
  num_doc_identidad: string;
  id_expedicion: number;
  nombres: string;
  ape_pat: string;
  ape_mat: string;
  id_sexo: number;
  fecha_nacimiento: string;
  id_pais: number;
  lugar_nacimiento: string;
  id_estado_civil: number;
  id_ocupacion: number;
  id_actividad_economica: number;
  id_ciudad: number;
  zona: string;
  domicilio: string;
  tel_dom: string;
  tel_trab: string;
  celular: string;
  e_trabajo: string;
  e_cargo: string;
  e_direccion: string;
  nit: string;
  email?: string;
}

export interface OperacionCambioInput {
  mon_rec: number;
  mon_ent: number;
  tipo_cambio: number;
  monto: number;
  total_cambio: number;
  recibido: number;
  entregado: number;
  cambio: number;
  origen?: string;
  origen_ingreso?: string;
  entregado_por?: string | null;
  destino?: string;
  dinero_si?: number;
  select_per?: number;
  nombres_dd?: string;
  doc_nit_dd?: string;
  act_eco_dd?: number;
  domicilio_dd?: string;
  id_departamento_dd?: number;
  id_ciudad_pcc?: number;
  telefono_dd?: string;
  zona_dd?: string;
  impresion_pcc06?: 'S' | 'N';
}

export interface EstadoSiat {
  conexiones: {
    facturador: boolean;
    sin: boolean;
    estado: 'EN_LINEA' | 'CONTINGENCIA' | 'INACTIVO';
  };
  punto_venta: {
    agencia: string;
    sucursal: number;
    punto_venta: number;
    cuis: string;
    cufd: string;
    codigo_control: string;
    cufd_vigente: boolean;
    cufd_vencimiento: string;
  } | null;
  sincronizacion: {
    cambios_pendientes: number;
  };
  puede_facturar: boolean;
}

export interface FacturaInfo {
  cuf: string;
  numero_factura: number;
  tipo_emision: number;
  estado: string;
  monto_total: number;
  fecha_emision: string;
  nit_emisor: string;
}

export interface CambioResponse {
  id_cambio: number;
  id_operacion: number;
  tipo_operacion: string;
  mon_rec: number;
  mon_ent: number;
  moneda_recibida: string;
  moneda_entregada: string;
  monto: number;
  tipo_cambio: number;
  total_cambio: number;
  recibido: number;
  entregado: number;
  cambio: number;
  fecha: string;
  agencia: string;
  cliente_nombre: string;
  cliente_documento: string;
  impresion_pcc06: string;
  factura: FacturaInfo;
}

export interface UifAlerta {
  tipo: string;
  nivel: 'critico' | 'alto' | 'medio' | 'bajo';
  mensaje: string;
  detalle: string;
}

export interface UifSenal {
  codigo: string;
  mensaje: string;
  nivel: 'critico' | 'alto' | 'medio' | 'bajo';
}

export interface UifCheckResponse {
  dolarizado: number;
  tipo_cambio_oficial: number;
  requiere_formulario: boolean;
  requiere_pcc06: boolean;
  operaciones_previas: {
    cantidad: number;
    total_dolarizado: number;
    dias_ventana: number;
  };
  umbrales: {
    formulario_unica: number;
    pcc06_unica: number;
    formulario_multiples: number;
    pcc06_multiples: number;
  };
  alertas?: UifAlerta[];
  usuario_habitual?: boolean;
  senales_alerta?: UifSenal[];
  requiere_origen_destino?: boolean;
  umbral_origen_destino?: number;
  dd_incompleta?: boolean;
  dd_bloqueado?: boolean;
}

export interface Pcc06Data {
  origen: string;
  destino: string;
  dinero_si: number;
  select_per: number;
  nombres_dd: string;
  doc_nit_dd: string;
  act_eco_dd: number;
  domicilio_dd: string;
  id_departamento_dd: number;
  id_ciudad_pcc: number;
  telefono_dd: string;
  zona_dd: string;
}

// --- Formulario Complemento UIF ---

export interface ComplementoData {
  c_apellido_casada: string;
  c_pais_residencia_id: number;
  c_ciudad_residencia: string;
  c_ingresos: number;
  c_fecha_ingreso: string;
  c_experiencia_trabajo: string;
  c_actividad_secundaria_id: number;
  c_ingresos_actividad_secundaria: number;
  c_experiencia_actividad_secundaria: string;
  c_referencias_bancarias: string;
  c_referencias_comerciales: string;
  c_referencias_personales: string;
  c_dependiente_estado_anterior: string;
  c_entidad_trabajo_anterior: string;
  c_fecha_inicio_trabajo_anterior: string;
  c_fecha_fin_trabajo_anterior: string;
  c_cargo_trabajo_anterior_id: number;
  c_dependiente_estado_actual: string;
  c_entidad_trabajo_actual: string;
  c_cargo_trabajo_actual_id: number;
  c_nombres_conyugue: string;
  c_apellido_paterno_conyugue: string;
  c_apellido_materno_conyugue: string;
  c_apellido_casada_conyugue: string;
  c_profesion_conyugue_id: number;
  c_actividad_principal_conyugue_id: number;
  c_actividad_secundaria_conyugue_id: number;
  c_lugar_trabajo_conyugue: string;
  c_cargo_conyugue_id: number;
  c_ingreso_mensual_conyugue: number;
  c_experiencia_trabajo_conyugue: string;
}

// --- Historial ---

export interface HistorialRecord {
  id: number;
  idOperacion: number;
  tipo: string;
  tipoDesc: string;
  idAgencia: number;
  agencia: string;
  operador: string;
  usuarioFinanciero: string;
  telefonoUf: string;
  documento: string;
  moneda: string;
  monedaRecibida: string;
  monedaEntregada: string;
  monto: number;
  tipoCambio: number;
  tipoCambioBob: number;
  cotizacionOficial: number | null;
  totalOperacion: number;
  totalOperacionBob: number;
  diferenciaBob: number | null;
  recibido: number;
  entregado: number;
  fecha: string;
  facturado: number;
}

export interface HistorialTotals {
  compras: {
    count: number;
    totalBob: number;
    byMoneda: { [key: string]: { count: number; monto: number; totalBob: number } };
  };
  ventas: {
    count: number;
    totalBob: number;
    byMoneda: { [key: string]: { count: number; monto: number; totalBob: number } };
  };
}

export interface HistorialResponse {
  desde: string;
  hasta: string;
  total: number;
  totals: HistorialTotals;
  records: HistorialRecord[];
}

export interface HistorialDetail {
  id: number;
  idOperacion: number;
  tipo: string;
  tipoDesc: string;
  agencia: string;
  operador: string;
  fecha: string;
  cliente: {
    nombre: string;
    documento: string;
    telefono: string;
    domicilio: string;
  };
  monedaRecibida: string;
  monedaRecibidaDesc: string;
  monedaEntregada: string;
  monedaEntregadaDesc: string;
  monto: number;
  tipoCambio: number;
  tipoCambioBob: number;
  totalOperacion: number;
  totalOperacionBob: number;
  recibido: number;
  entregado: number;
  cambio: number;
  totalCambio: number;
  facturado: number;
  origen: string | null;
  destino: string | null;
  factura: {
    numero: string;
    fecha: string;
    hora: string;
    nit: string;
    nombre: string;
    importe: number;
    autorizacion: string;
  } | null;
}

// --- Movimientos de caja ---

export interface MovimientoResponse {
  id_caja: number;
  monto: number;
  moneda: string;
  saldo_anterior: number;
  saldo_nuevo: number;
  fecha: string;
  uuid: string;
  concepto?: string;
  tipo?: string;
  tipo_label?: string;
  referencia?: string;
  id_caja_origen?: number;
  id_caja_destino?: number;
  cajero_destino?: string;
  boveda_origen?: string;
  boveda_destino?: string;
  id_egreso?: number;
  estado?: string;
  origen?: string;
  beneficiario?: string;
  categoria?: string;
}

export interface CajaDestino {
  id_caja: number;
  num_caja: number;
  id_moneda: number;
  moneda: string;
  cajero: string;
}

export interface BovedaInfo {
  id_boveda: number;
  num_boveda: number;
  id_agencia: number;
  id_moneda: number;
  moneda: string;
  agencia: string;
  saldo_actual: number;
}

export interface EgresoInfo {
  id: number;
  uuid: string;
  origen: 'caja' | 'banca';
  id_caja: number | null;
  num_caja: number | null;
  id_agencia: number;
  id_moneda: number;
  moneda: string;
  moneda_desc: string;
  monto: number;
  concepto: string;
  beneficiario: string | null;
  categoria: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'anulado';
  comprobante_path: string | null;
  comprobante_nombre: string | null;
  cod_usuario_cajero: number;
  cajero_nombre: string;
  cod_usuario_aprobador: number | null;
  aprobador_nombre: string | null;
  fecha_aprobacion: string | null;
  observaciones_aprobacion: string | null;
  comprobante_aprobacion_path: string | null;
  comprobante_aprobacion_nombre: string | null;
  created_at: string;
}

export interface MovimientoCajaInfo {
  id: number;
  id_caja_contexto?: number;
  num_caja_contexto?: number;
  uuid: string;
  tipo_operacion: 'egreso' | 'ingreso' | 'transaccion_bancaria' | 'solicitud_fondos' | 'traspaso_boveda' | 'traspaso_cajero' | 'transferencia_boveda' | 'transferencia_caja_agencia';
  id_moneda: number;
  moneda: string;
  monto: number;
  estado: string;
  metadata: {
    autorizado?: boolean;
    concepto?: string;
    glosa?: string;
    numero_comprobante?: number | string;
    codsubcuenta?: string;
    tipo_transaccion?: string;
    referencia?: string;
    origen_ingreso?: string;
    entregado_por?: string | null;
    categoria?: string;
    comprobante_nombre?: string;
    comprobante_path?: string;
    id_caja_destino?: number;
    num_caja_destino?: number;
    cajero_destino?: string;
    num_caja_origen?: number;
    cajero_origen?: string;
    id_boveda_destino?: number;
    id_agencia_destino?: number;
    boveda_origen?: string;
    boveda_destino?: string;
    es_destino?: boolean;
    cortes?: unknown[];
  };
  created_at: string;
  estado_egreso: EgresoInfo['estado'] | null;
  origen: string | null;
  beneficiario: string | null;
  categoria: string | null;
  comprobante_nombre: string | null;
  observaciones_aprobacion: string | null;
  impacto_saldo: number | null;
}

export interface AsientoAutorizado {
  idasiento: number;
  numero: number;
  glosa: string;
  fecha_asiento: string;
  monto: number;
  id_moneda: number;
  moneda: string;
  codsubcuenta: string;
  tipo: 'E' | 'I';
}

export interface CuentaBancariaCobro {
  num_cuenta_bancaria: string;
  id_entidad_financiera: number;
  id_moneda: number;
  codsubcuenta: string;
  id_agencia: number;
  id_tipo_cuenta_bancaria: number;
  entidad: string;
  entidad_desc: string;
  moneda: string;
  tipo_cuenta: string;
}

export interface CatalogoItem {
  [key: string]: any;
}

export interface CatalogDefaults {
  id_pais: number;
  id_departamento: number;
}

export interface Catalogos {
  tipos_documento: CatalogoItem[];
  expediciones: CatalogoItem[];
  monedas: CatalogoItem[];
  sexos: CatalogoItem[];
  estados_civiles: CatalogoItem[];
  ocupaciones: CatalogoItem[];
  actividades_economicas: CatalogoItem[];
  paises: CatalogoItem[];
  departamentos: CatalogoItem[];
  ciudades: CatalogoItem[];
  cargos: CatalogoItem[];
  defaults?: CatalogDefaults;
}
