import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/auth.service';
import { CriptoActivo, CriptoCaja, CriptoOperacion, CriptoPayMovement, CriptoPaySyncStatus, CriptoService } from '../../core/cripto.service';

@Component({
  selector: 'app-cripto', standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSnackBarModule],
  templateUrl: './cripto.component.html',
  styleUrl: './cripto.component.scss',
})
export class CriptoComponent implements OnInit, OnDestroy {
  private api = inject(CriptoService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  get isTreasury(): boolean { return this.auth.rol?.id_rol === 2; }
  get activeAssets(): CriptoActivo[] { return this.activos.filter(a => Number(a.activo) === 1); }
  get userId(): number { return Number(this.auth.user?.cod_usuario ?? 0); }
  get hasPaySyncError(): boolean {
    const status = this.paySyncStatus;
    if (!status?.last_error_at) return false;
    const errorTime = Date.parse(status.last_error_at.replace(' ', 'T'));
    const successTime = status.last_success_at ? Date.parse(status.last_success_at.replace(' ', 'T')) : 0;
    return !successTime || errorTime > successTime;
  }
  get paySyncLabel(): string {
    const status = this.paySyncStatus;
    if (!status) return 'Estado de sincronización no disponible';
    if (!status.api_configured || !status.receiver_configured) return 'Binance Pay pendiente de configuración';
    if (this.hasPaySyncError) return 'Error al sincronizar';
    if (!status.last_success_at) return 'Esperando primera sincronización';
    return 'Historial sincronizado';
  }
  get paySyncDetail(): string {
    const status = this.paySyncStatus;
    if (!status) return 'No se pudo consultar el estado del sincronizador. Actualiza la pantalla o contacta al administrador.';
    if (!status.api_configured || !status.receiver_configured) return 'El servidor debe configurar las credenciales de lectura y el Binance ID receptor para consultar los pagos.';
    if (this.hasPaySyncError) {
      const lastErrorAt = status.last_error_at;
      const lastAttempt = lastErrorAt ? new Date(lastErrorAt).toLocaleString() : 'fecha no disponible';
      return `${status.last_error || 'La última consulta a Binance Pay falló.'} Último intento: ${lastAttempt}.`;
    }
    if (!status.last_success_at) return 'La sincronización automática aún no ha consultado Binance Pay.';
    return `Última consulta exitosa: ${new Date(status.last_success_at).toLocaleString()}.`;
  }
  get payNextSyncAt(): Date | null {
    if (!this.paySyncStatus?.api_configured || !this.paySyncStatus?.receiver_configured) return null;
    const next = new Date();
    next.setSeconds(0, 0);
    next.setMinutes((Math.floor(next.getMinutes() / 2) + 1) * 2);
    return next;
  }
  get isOwner(): boolean { return !!this.selectedOp && Number((this.selectedOp as any).cod_usuario_cajero ?? this.userId) === this.userId; }
  get selectedAsset(): CriptoActivo | undefined { return this.activos.find(a => Number(a.id) === Number(this.form.id_activo)); }
  get pageSelectedAsset(): CriptoActivo | undefined { return this.activeAssets.find(a => Number(a.id) === Number(this.selectedAssetId)); }
  readonly assetPresets = [
    { simbolo: 'USDT', nombre: 'Tether', icono: 'https://cdn-icons-png.flaticon.com/512/14446/14446253.png', redes: ['TRC20', 'ERC20', 'BEP20', 'Polygon', 'Arbitrum'] },
    { simbolo: 'USDC', nombre: 'USD Coin', icono: 'https://cdn-icons-png.flaticon.com/512/14446/14446284.png', redes: ['ERC20', 'Solana', 'Polygon', 'Arbitrum', 'Base', 'BEP20'] },
    { simbolo: 'BTC', nombre: 'Bitcoin', icono: 'https://cdn-icons-png.flaticon.com/512/1322/1322801.png', redes: ['Bitcoin'] },
    { simbolo: 'SOL', nombre: 'Solana', icono: 'https://cdn-icons-png.flaticon.com/512/17623/17623253.png', redes: ['Solana'] },
  ];
  configPreset = '';
  get configNetworks(): string[] {
    const preset = this.assetPresets.find(p => p.simbolo === this.configPreset);
    const configuredNetworks = this.activos.filter(a => a.simbolo === this.config.simbolo).map(a => a.red);
    const networks = preset ? [...preset.redes, ...configuredNetworks] : configuredNetworks;
    if (this.config.red && !networks.includes(this.config.red)) networks.unshift(this.config.red);
    return [...new Set(networks)];
  }
  get amountBob(): number {
    const a = this.selectedAsset; if (!a || !this.form.cantidad) return 0;
    const gross = Number(this.form.cantidad) * Number(this.form.tipo === 'COMPRA' ? a.tasa_compra_bob : a.tasa_venta_bob);
    const fee = gross * Number(a.comision_porcentaje) / 100;
    return Math.max(0, this.form.tipo === 'COMPRA' ? gross - fee : gross + fee);
  }
  get canActOnSelected(): boolean {
    const s = this.selectedOp?.estado;
    return !!s && ((this.isTreasury && ['PENDIENTE_RECEPCION','PENDIENTE_ENVIO'].includes(s)) || (this.isOwner && ['PENDIENTE_COBRO_BOB','PENDIENTE_PAGO_BOB'].includes(s)) || (this.isOwner && s === 'PENDIENTE_RECEPCION' && !!this.selectedPayMovement));
  }
  get drawerTitle(): string {
    if (this.drawer === 'new') return 'Nueva operación';
    if (this.drawer === 'detail') return `${this.selectedOp?.tipo === 'COMPRA' ? 'Compra' : 'Venta'} cripto · #${this.selectedOp?.id ?? ''}`;
    if (this.drawer === 'config') return 'Configurar activo';
    if (this.drawer === 'qrConfig') return 'Configurar QR de Binance Pay';
    return 'Ajustar inventario';
  }
  get drawerSubtitle(): string {
    if (this.drawer === 'new') return 'Cotiza y registra la operación en la caja.';
    if (this.drawer === 'detail') return this.selectedOp?.simbolo + ' · ' + this.selectedOp?.red;
    if (this.drawer === 'config') return 'Activo, red, billetera pública y cotización.';
    if (this.drawer === 'qrConfig') return 'El QR guardado se mostrará en las compras de cripto.';
    return 'Registra una entrada o salida manual de Tesorería.';
  }

  activos: CriptoActivo[] = [];
  cajas: CriptoCaja[] = [];
  operaciones: CriptoOperacion[] = [];
  loading = false; saving = false;
  cajasLoading = false;
  drawer: '' | 'new' | 'detail' | 'config' | 'qrConfig' | 'adjustment' = '';
  selectedOp: CriptoOperacion | null = null;
  payMovements: CriptoPayMovement[] = [];
  selectedPayMovement: CriptoPayMovement | null = null;
  registeredCode: string | null = null;
  draftReferenceCode: string | null = null;
  operationRegistered = false;
  paySyncStatus: CriptoPaySyncStatus | null = null;
  payLoading = false;
  private payPoll?: number;
  reference = '';
  filters = { desde: this.monthStart(), hasta: this.today(), estado: '', tipo: '' };
  estados = [
    { value:'PENDIENTE_RECEPCION', label:'Pendiente recepción' }, { value:'PENDIENTE_PAGO_BOB', label:'Pendiente pago BOB' },
    { value:'PENDIENTE_COBRO_BOB', label:'Pendiente cobro BOB' }, { value:'PENDIENTE_ENVIO', label:'Pendiente envío' },
    { value:'COMPLETADA', label:'Completada' }, { value:'RECHAZADA', label:'Rechazada' }, { value:'CANCELADA', label:'Cancelada' },
  ];
  form = { tipo: 'COMPRA' as 'COMPRA'|'VENTA', id_activo: 0, id_caja: 0, cantidad: 0, direccion: '', concepto: '' };
  config: any = this.emptyConfig();
  adjust = { id: 0, cantidad: 0, motivo: '' };
  binancePayQrUrl: string | null = null;
  qrPreviewUrl: string | null = null;
  qrFile: File | null = null;
  qrLoading = false;
  currentView: 'operations' | 'admin' = 'operations';
  adminTab: 'assets' | 'binancePay' | 'payReconciliation' | 'treasury' | 'audit' = 'assets';
  selectedAssetId = 0;

  ngOnInit(): void { this.loadAll(); this.loadBinancePayQr(); this.loadPayHistory(); this.payPoll=window.setInterval(()=>this.loadPayHistory(false), 60000); }
  ngOnDestroy(): void { if (this.payPoll) window.clearInterval(this.payPoll); }
  loadAll(): void {
    this.loading = true;
    this.api.catalogo().subscribe({ next: a => {
      this.activos = a || [];
      if (!this.activeAssets.some(x => Number(x.id) === Number(this.selectedAssetId))) {
        this.selectedAssetId = this.activeAssets.length === 1 ? Number(this.activeAssets[0].id) : 0;
      }
      if (!this.activeAssets.some(x => Number(x.id) === Number(this.form.id_activo))) this.form.id_activo = this.selectedAssetId;
    }, error: e => this.error(e) });
    this.loadCajas();
    this.loadOperations();
  }
  loadCajas(): void {
    this.cajasLoading=true;
    this.api.cajas().subscribe({
      next: c => {
        this.cajas=c||[]; this.cajasLoading=false;
        if (this.drawer==='new' && !this.form.id_caja && this.cajas.length) this.form.id_caja=Number(this.cajas[0].id_caja);
      },
      error: e => { this.cajasLoading=false; this.error(e); },
    });
  }
  loadOperations(): void { this.loading = true; this.api.listar(this.filters).subscribe({ next: rows => { this.operaciones = rows || []; this.loading = false; }, error: e => { this.loading = false; this.error(e); } }); }
  selectAsset(id: number): void { this.selectedAssetId=Number(id); this.form.id_activo=this.selectedAssetId; this.form.cantidad=0; }
  openNew(tipo: 'COMPRA'|'VENTA' = 'COMPRA'): void {
    if (!this.pageSelectedAsset) { this.snack.open('Selecciona primero el activo que deseas comprar o vender.','Cerrar',{duration:3500}); return; }
    this.form = { tipo, id_activo:this.selectedAssetId, id_caja:Number(this.cajas[0]?.id_caja || 0), cantidad:0, direccion:'', concepto:'' };
    this.registeredCode=null; this.draftReferenceCode=tipo === 'COMPRA' ? this.newReferenceCode() : null; this.operationRegistered=false;
    this.drawer='new';
  }
  openDetail(op: CriptoOperacion): void { this.selectedPayMovement=null; this.selectedOp = op; this.reference=''; this.drawer='detail'; this.api.detalle(op.id).subscribe({next:d=>{if(this.selectedOp?.id===op.id)this.selectedOp=d;},error:e=>this.error(e)}); }
  openPayMovement(movement: CriptoPayMovement): void {
    if (movement.confirmado_at) { this.snack.open('Este pago ya fue confirmado en la operación vinculada.','Cerrar',{duration:3500}); return; }
    const manuallyLinkedToOperation = movement.conciliacion_metodo === 'MANUAL' && !!movement.id_operacion;
    if (!manuallyLinkedToOperation && (movement.candidate_count !== 1 || !movement.candidate_operation_id)) {
      Swal.fire({ icon: 'warning', title: movement.candidate_count > 1 ? 'Pago ambiguo' : 'Sin operación compatible', text: movement.candidate_count > 1 ? 'Este pago coincide con varias operaciones pendientes. No se vinculará automáticamente para evitar una conciliación incorrecta.' : 'No hay una operación pendiente de tu caja que coincida exactamente con este activo e importe.', confirmButtonText: 'Entendido', confirmButtonColor: '#F58634' });
      return;
    }
    if (this.isTreasury && Number(movement.candidate_operation?.cod_usuario_cajero) !== this.userId) { this.snack.open('Solo el cajero propietario de la operación puede confirmar esta recepción.','Cerrar',{duration:4500}); return; }
    this.selectedPayMovement=movement; this.reference=''; this.drawer='detail'; this.selectedOp=null;
    this.api.detalle(manuallyLinkedToOperation ? Number(movement.id_operacion) : movement.candidate_operation_id!).subscribe({next:d=>this.selectedOp=d,error:e=>this.error(e)});
  }
  closeDrawer(): void { this.drawer=''; this.selectedOp=null; this.selectedPayMovement=null; this.reference=''; this.registeredCode=null; this.draftReferenceCode=null; this.operationRegistered=false; }
  loadPayHistory(showLoading = true): void {
    if (showLoading) this.payLoading=true;
    this.api.binancePayHistory().subscribe({next: rows=>{this.payMovements=rows||[];this.payLoading=false;},error:e=>{this.payLoading=false;if(showLoading)this.error(e);}});
    this.api.binancePaySyncStatus().subscribe({next:s=>this.paySyncStatus=s,error:()=>this.paySyncStatus=null});
  }
  loadBinancePayQr(): void {
    this.qrLoading = true;
    this.api.binancePayQr().subscribe({
      next: config => {
        this.binancePayQrUrl = config?.qr_data_url || null;
        if (this.drawer === 'qrConfig' && !this.qrFile) this.qrPreviewUrl = this.binancePayQrUrl;
        this.qrLoading = false;
      },
      error: e => { this.qrLoading = false; this.error(e); },
    });
  }
  openQrConfig(): void { this.qrFile=null; this.qrPreviewUrl=this.binancePayQrUrl; this.drawer='qrConfig'; }
  onBinanceQrSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      input.value=''; this.qrFile=null; this.qrPreviewUrl=this.binancePayQrUrl;
      this.snack.open('El QR debe ser PNG, JPG o WEBP y pesar hasta 2 MB.','Cerrar',{duration:4500});
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { this.qrFile=file; this.qrPreviewUrl=typeof reader.result === 'string' ? reader.result : null; };
    reader.onerror = () => this.snack.open('No se pudo leer la imagen seleccionada.','Cerrar',{duration:4500});
    reader.readAsDataURL(file);
  }
  saveBinancePayQr(): void {
    if (!this.qrFile || this.saving) return;
    this.saving=true;
    this.api.guardarBinancePayQr(this.qrFile).subscribe({
      next: () => { this.binancePayQrUrl=this.qrPreviewUrl; this.qrFile=null; this.saving=false; this.closeDrawer(); this.snack.open('QR de Binance Pay actualizado.','Cerrar',{duration:3500}); },
      error: e => { this.saving=false; this.error(e); },
    });
  }
  onAssetChange(): void { this.recalculate(); }
  recalculate(): void { /* value is derived from current asset and side */ }
  createOperation(): void {
    if (!this.selectedAsset) return;
    this.saving=true;
    this.api.crear({ uuid: crypto.randomUUID(), tipo:this.form.tipo, id_activo:this.form.id_activo, id_caja:this.form.id_caja, cantidad_cripto:this.form.cantidad, direccion_cliente:this.form.direccion, concepto:this.form.concepto, codigo_referencia:this.form.tipo === 'COMPRA' ? this.draftReferenceCode : null }).subscribe({
      next: (result: any) => {
        this.saving=false;
        const responseCode = typeof result?.codigo_referencia === 'string' && /^GB-[0-9]{5}[A-HJ-NP-Z]$/.test(result.codigo_referencia) ? result.codigo_referencia : null;
        const code = responseCode || (this.form.tipo === 'COMPRA' ? this.draftReferenceCode : null);
        if (this.form.tipo === 'COMPRA') {
          this.operationRegistered=true; this.registeredCode=code;
          this.loadAll(); this.loadPayHistory(false);
          if (code) setTimeout(() => document.querySelector('.registered-reference')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
          if (code) this.snack.open('Compra registrada. El código para Binance Pay está visible junto al QR.','Cerrar',{duration:5000});
          else Swal.fire({icon:'warning',title:'Compra registrada sin código visible',text:'No registres la operación de nuevo. Actualiza la lista y consulta el detalle para recuperar su código.',confirmButtonText:'Entendido',confirmButtonColor:'#F58634'});
          return;
        }
        this.closeDrawer(); this.loadAll(); this.loadPayHistory(false);
        this.snack.open('Operación registrada.','Cerrar',{duration:3500});
      },
      error: e => { this.saving=false; this.error(e); },
    });
  }
  async copyRegisteredCode(): Promise<void> {
    if (!this.registeredCode) return;
    try { await navigator.clipboard.writeText(this.registeredCode); this.snack.open('Código copiado.','Cerrar',{duration:3000}); }
    catch { this.snack.open(`Código para el cliente: ${this.registeredCode}`,'Cerrar',{duration:6000}); }
  }
  async copyDraftReferenceCode(): Promise<void> {
    if (!this.draftReferenceCode) return;
    try { await navigator.clipboard.writeText(this.draftReferenceCode); this.snack.open('Código copiado.','Cerrar',{duration:3000}); }
    catch { this.snack.open(`Código para el cliente: ${this.draftReferenceCode}`,'Cerrar',{duration:6000}); }
  }
  async copyOperationCode(): Promise<void> {
    const code = this.selectedOp?.codigo_referencia;
    if (!code) return;
    try { await navigator.clipboard.writeText(code); this.snack.open('Código copiado.','Cerrar',{duration:3000}); }
    catch { this.snack.open(`Código para el cliente: ${code}`,'Cerrar',{duration:6000}); }
  }
  confirmReceipt(): void {
    if (this.selectedPayMovement) {
      const payment = this.selectedPayMovement;
      const operation = this.selectedOp;
      const manualLink = payment.conciliacion_metodo === 'MANUAL' && Number(payment.id_operacion) === operation?.id;
      if (!operation || (!manualLink && (payment.candidate_count !== 1 || payment.candidate_operation_id !== operation.id))) {
        this.error({ error: { message: 'La coincidencia del pago cambió. Actualiza el historial antes de confirmar.' } });
        return;
      }
      Swal.fire({
        icon: 'question',
        title: '¿Confirmar recepción del pago?',
        text: `Binance Pay recibió ${Number(payment.amount).toLocaleString()} ${payment.currency}. Operación #${operation.id}, Caja ${operation.num_caja}. Confirma solo si verificaste que el pago corresponde a esta operación. ID: ${payment.transaction_id}`,
        showCancelButton: true,
        confirmButtonText: 'Confirmar recepción',
        cancelButtonText: 'Revisar de nuevo',
        confirmButtonColor: '#F58634',
      }).then(result => {
        if (result.isConfirmed) this.run(() => this.api.confirmarRecepcion(operation.id, '', payment.transaction_id), 'Recepción verificada; ahora puedes registrar el pago BOB.');
      });
      return;
    }
    this.run(() => this.api.confirmarRecepcion(this.selectedOp!.id,this.reference), 'Recepción cripto confirmada');
  }
  confirmCash(): void { this.run(() => this.api.confirmarCobro(this.selectedOp!.id), 'Cobro BOB registrado en caja'); }
  payBob(): void { this.run(() => this.api.pagarBob(this.selectedOp!.id), 'Pago BOB registrado en caja'); }
  confirmShipment(): void { this.run(() => this.api.confirmarEnvio(this.selectedOp!.id,this.reference), 'Envío cripto confirmado'); }
  reviewUnmatchedPay(movement: CriptoPayMovement): void {
    if (movement.id_operacion) return;
    this.api.binancePayPendingOperations().subscribe({
      next: operations => {
        const options = (operations || []).filter(op => op.simbolo.toUpperCase() === movement.currency.toUpperCase() && Number(op.cantidad_cripto) === Number(movement.amount));
        if (!options.length) {
          Swal.fire({ icon:'info', title:'No hay una compra compatible', text:'Para vincular manualmente, la moneda y la cantidad deben coincidir exactamente con una compra pendiente de esta agencia.', confirmButtonText:'Entendido', confirmButtonColor:'#F58634' });
          return;
        }
        const inputOptions: Record<string, string> = {};
        for (const op of options) inputOptions[String(op.id)] = `#${op.id} · Caja ${op.num_caja} · ${op.cantidad_cripto} ${op.simbolo} · ${new Date(op.created_at).toLocaleString()}`;
        Swal.fire({
          icon:'question', title:'Vincular pago manualmente',
          text:`Pago ${movement.amount} ${movement.currency} · ${movement.transaction_id}. La vinculación quedará auditada y el cajero tendrá que verificar la recepción.`,
          input:'select', inputOptions, inputPlaceholder:'Selecciona la compra pendiente',
          showCancelButton:true, confirmButtonText:'Vincular', cancelButtonText:'Cancelar', confirmButtonColor:'#F58634',
        }).then(result => {
          const operationId = Number(result.value);
          if (!result.isConfirmed || !operationId) return;
          this.api.vincularBinancePayManual(movement.transaction_id, operationId).subscribe({
            next: () => { this.snack.open('Pago vinculado; el cajero aún debe verificar la recepción.','Cerrar',{duration:4500}); this.loadPayHistory(false); this.loadOperations(); },
            error: e => this.error(e),
          });
        });
      },
      error: e => this.error(e),
    });
  }
  payCandidateMatches(movement: CriptoPayMovement): boolean {
    if (!movement.candidate_operation) return true;
    if (Number(movement.candidate_operation.cantidad_cripto) !== Number(movement.amount)) return false;
    const paidAt = new Date(movement.transaction_time).getTime();
    const createdAt = new Date(movement.candidate_operation.created_at).getTime();
    return Number.isFinite(paidAt) && Number.isFinite(createdAt) && paidAt >= createdAt - 300_000 && paidAt <= createdAt + 86_400_000;
  }
  rejectOperation(): void { const reason=window.prompt('Motivo del rechazo'); if(reason && reason.trim().length>=5) this.run(() => this.api.rechazar(this.selectedOp!.id,reason.trim()),'Operación rechazada'); }
  cancelOperation(): void { const reason=window.prompt('Motivo de cancelación'); if(reason && reason.trim().length>=5) this.run(() => this.api.cancelar(this.selectedOp!.id,reason.trim()),'Operación cancelada'); }

  openConfig(): void { this.config=this.emptyConfig(); this.configPreset=''; this.drawer='config'; }
  onConfigPresetChange(): void {
    const preset = this.assetPresets.find(p => p.simbolo === this.configPreset);
    this.config.id = 0;
    if (!preset) {
      this.config.simbolo = '';
      this.config.nombre = '';
      this.config.red = '';
      this.config.contrato = '';
      this.config.decimales = 6;
      return;
    }
    this.config.simbolo = preset.simbolo;
    this.config.nombre = preset.nombre;
    this.config.red = preset.redes[0] || '';
    this.config.contrato = '';
    this.config.decimales = preset.simbolo === 'BTC' ? 8 : 6;
  }
  onConfigNetworkChange(): void {
    const matching = this.activos.find(a => a.simbolo === this.config.simbolo && a.red === this.config.red);
    if (matching) { this.config.id=matching.id; this.selectConfig(); return; }
    const sibling = this.activos.find(a => a.simbolo === this.config.simbolo);
    this.config.id=0;
    this.config.contrato='';
    this.config.direccion_recepcion='';
    if (sibling) {
      this.config.tasa_compra_bob=Number(sibling.tasa_compra_bob);
      this.config.tasa_venta_bob=Number(sibling.tasa_venta_bob);
      this.config.comision_porcentaje=Number(sibling.comision_porcentaje);
    }
  }
  assetIcon(symbol: string): string | null {
    return this.assetPresets.find(p => p.simbolo === symbol)?.icono || 'https://cdn-icons-png.flaticon.com/512/15208/15208261.png';
  }
  assetIconName(symbol: string): string {
    return symbol === 'BTC' ? 'currency_bitcoin' : symbol === 'SOL' ? 'toll' : 'monetization_on';
  }
  editAsset(id: number): void { this.config.id=id; this.selectConfig(); this.drawer='config'; }
  selectConfig(): void {
    const a=this.activos.find(x=>Number(x.id)===Number(this.config.id));
    this.config=a ? { id:a.id, simbolo:a.simbolo,nombre:a.nombre,red:a.red,contrato:a.contrato||'',decimales:Number(a.decimales),direccion_recepcion:a.direccion_recepcion||'',tasa_compra_bob:Number(a.tasa_compra_bob),tasa_venta_bob:Number(a.tasa_venta_bob),comision_porcentaje:Number(a.comision_porcentaje),activo:!!Number(a.activo) } : this.emptyConfig();
    this.configPreset = !a ? '' : this.assetPresets.some(p => p.simbolo === a.simbolo) ? a.simbolo : 'CUSTOM';
  }
  saveAsset(): void {
    const { id, ...asset } = this.config;
    const payload = Number(id) > 0 ? { id: Number(id), ...asset } : asset;
    this.run(() => this.api.guardarActivo(payload), 'Activo guardado');
  }
  openAdjustment(): void { this.adjust={id:Number(this.activos[0]?.id||0),cantidad:0,motivo:''}; this.drawer='adjustment'; }
  saveAdjustment(): void { this.run(() => this.api.ajustar(this.adjust.id,this.adjust.cantidad,this.adjust.motivo), 'Ajuste de inventario registrado'); }

  private run(call: () => import('rxjs').Observable<unknown>, success: string): void {
    this.saving=true;
    call().subscribe({ next: () => { this.saving=false; this.snack.open(success,'Cerrar',{duration:3500}); this.closeDrawer(); this.loadAll(); this.loadPayHistory(false); }, error: e => { this.saving=false; this.error(e); } });
  }
  private error(e: any): void {
    const validation = e?.error?.errors;
    const detail = validation && typeof validation === 'object'
      ? Object.values(validation).flat().join(' ')
      : '';
    const message = detail || e?.error?.message || e?.message || 'No se pudo completar la acción';
    const cajaNoDisponible = message.toLowerCase().includes('la caja debe seguir abierta y asignada a tu usuario');
    Swal.fire({
      icon: cajaNoDisponible ? 'warning' : 'error',
      title: cajaNoDisponible ? 'Caja no disponible' : 'No se pudo completar la acción',
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#F58634',
      customClass: {
        popup: 'banking-notice-popup',
        title: 'banking-notice-title',
        confirmButton: 'banking-notice-confirm',
      },
    });
  }
  statusLabel(s: string): string { return this.estados.find(x=>x.value===s)?.label || s; }
  eventLabel(s: string): string { return ({CREADA:'Operación creada',RECEPCION_CONFIRMADA:'Recepción cripto confirmada',RECEPCION_PAY_AUTOCONCILIADA:'Pago asociado automáticamente por código GB',RECEPCION_PAY_CONFIRMADA:'Recepción Binance Pay verificada por caja',RECEPCION_PAY_VINCULO_MANUAL:'Pago Binance Pay vinculado manualmente por administración',COBRO_BOB_CONFIRMADO:'Cobro BOB confirmado',PAGO_BOB_COMPLETADO:'Pago BOB completado',ENVIO_CONFIRMADO:'Envío cripto confirmado',RECHAZADA:'Operación rechazada',CANCELADA:'Operación cancelada'} as Record<string,string>)[s] || s; }
  get operationTimeline(): { label: string; at: string | null; complete: boolean; current: boolean }[] {
    const op = this.selectedOp;
    if (!op) return [];
    const compra = op.tipo === 'COMPRA';
    const steps = compra
      ? [
          { label: 'Operación registrada', actions: ['CREADA'] },
          { label: 'Recepción de cripto verificada', actions: ['RECEPCION_CONFIRMADA', 'RECEPCION_PAY_CONFIRMADA'] },
          { label: 'Pago en BOB completado', actions: ['PAGO_BOB_COMPLETADO'] },
        ]
      : [
          { label: 'Operación registrada', actions: ['CREADA'] },
          { label: 'Cobro en BOB confirmado', actions: ['COBRO_BOB_CONFIRMADO'] },
          { label: 'Envío de cripto confirmado', actions: ['ENVIO_CONFIRMADO'] },
        ];
    const stage = compra
      ? ({ PENDIENTE_RECEPCION: 1, PENDIENTE_PAGO_BOB: 2, COMPLETADA: 3 } as Record<string, number>)[op.estado] ?? 0
      : ({ PENDIENTE_COBRO_BOB: 1, PENDIENTE_ENVIO: 2, COMPLETADA: 3 } as Record<string, number>)[op.estado] ?? 0;
    const terminal = ['RECHAZADA', 'CANCELADA'].includes(op.estado);
    return steps.map((step, index) => {
      const event = op.eventos?.find(ev => step.actions.includes(ev.accion));
      return {
        label: step.label,
        at: event?.created_at || (index === 0 ? op.created_at : null),
        complete: index === 0 || !!event || (!terminal && (index < stage || op.estado === 'COMPLETADA')),
        current: !terminal && op.estado !== 'COMPLETADA' && index === stage,
      };
    });
  }
  statusHint(s: string): string {
    return ({PENDIENTE_RECEPCION:'Verifica el ingreso en Binance Pay o la red indicada antes de pagar BOB.',PENDIENTE_PAGO_BOB:'Recepción verificada. El cajero debe entregar y registrar BOB.',PENDIENTE_COBRO_BOB:'No se envía cripto hasta confirmar el cobro efectivo en caja.',PENDIENTE_ENVIO:'BOB ya fue registrado. Tesorería debe enviar el cripto y guardar su referencia.',COMPLETADA:'Los pasos de caja y Tesorería quedaron confirmados.'} as Record<string,string>)[s] || 'Consulta la bitácora y los datos de la operación.';
  }
  private emptyConfig(): any { return {id:0,simbolo:'',nombre:'',red:'',contrato:'',decimales:6,direccion_recepcion:'',tasa_compra_bob:0,tasa_venta_bob:0,comision_porcentaje:0,activo:true}; }
  private newReferenceCode(): string {
    const values = new Uint8Array(6);
    crypto.getRandomValues(values);
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    return `GB-${Array.from(values.slice(0, 5), value => value % 10).join('')}${letters[values[5] % letters.length]}`;
  }
  private today(): string { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  private monthStart(): string { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }
}
