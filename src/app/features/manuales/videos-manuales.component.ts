import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { ManualesService, VideoManualInfo } from '../../core/manuales.service';

interface ManualOption { key: string; title: string; group: string; }

@Component({
  selector: 'app-videos-manuales',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  template: `
    <main class="videos-page">
      <header class="page-heading">
        <span class="heading-icon"><mat-icon>video_library</mat-icon></span>
        <div><small>ADMINISTRACIÓN · CENTRO DE AYUDA</small><h1>Videos de los manuales</h1><p>Asocia videos de capacitación a cada guía para que el equipo pueda reproducirlos desde el manual.</p></div>
      </header>

      <section class="manager-panel">
        <div class="panel-heading"><div><h2>Administrar video</h2><p>Selecciona una guía para consultar su video o cargar uno nuevo.</p></div><span class="admin-tag"><mat-icon>admin_panel_settings</mat-icon>Solo administradores</span></div>
        <mat-form-field appearance="outline" class="manual-select">
          <mat-label>Manual</mat-label>
          <mat-select [value]="selected.key" (selectionChange)="selectManual($event.value)">
            @for (group of groups; track group.name) {
              <mat-optgroup [label]="group.name">
                @for (manual of group.items; track manual.key) { <mat-option [value]="manual.key">{{ manual.title }}</mat-option> }
              </mat-optgroup>
            }
          </mat-select>
        </mat-form-field>

        <section class="video-status" [class.has-video]="info?.disponible">
          <span class="status-icon"><mat-icon>{{ info?.disponible ? 'check_circle' : 'movie' }}</mat-icon></span>
          <div class="status-copy">
            <strong>{{ loadingInfo ? 'Consultando video…' : info?.disponible ? 'Video asociado' : 'Este manual aún no tiene video' }}</strong>
            @if (info?.disponible) {
              <small>{{ info?.nombre }} · {{ (info?.tamano_bytes || 0) / 1048576 | number:'1.1-1' }} MB · actualizado {{ info?.actualizado_en | date:'dd/MM/yyyy HH:mm' }}</small>
            } @else {
              <small>El archivo se guardará en el servidor del sistema y quedará vinculado a “{{ selected.title }}”.</small>
            }
          </div>
          <input #filePicker type="file" hidden accept="video/mp4,.mp4" (change)="upload($event)">
          <button mat-stroked-button class="upload-button" type="button" [disabled]="uploading || loadingInfo" (click)="filePicker.click()">
            <mat-icon>{{ uploading ? 'hourglass_top' : info?.disponible ? 'sync' : 'upload' }}</mat-icon>{{ uploading ? 'Subiendo…' : info?.disponible ? 'Reemplazar video' : 'Seleccionar video' }}
          </button>
        </section>
        <p class="file-hint"><mat-icon>info</mat-icon>Formato MP4 · Tamaño máximo {{ info?.max_size_mb || maxSizeMb }} MB.</p>
        @if (error) { <div class="message error"><mat-icon>error_outline</mat-icon>{{ error }}</div> }
        @if (success) { <div class="message success"><mat-icon>check_circle</mat-icon>{{ success }}</div> }

        @if (info?.disponible) {
          <section class="player-panel">
            <div class="player-heading"><div><strong>Vista previa</strong><small>{{ selected.title }}</small></div><button mat-stroked-button type="button" [disabled]="loadingVideo" (click)="toggleVideo()"><mat-icon>{{ videoUrl ? 'stop' : 'play_arrow' }}</mat-icon>{{ loadingVideo ? 'Cargando…' : videoUrl ? 'Detener' : 'Reproducir video' }}</button></div>
            @if (loadingVideo) { <div class="player-placeholder"><mat-icon>hourglass_top</mat-icon>Preparando reproducción…</div> }
            @else if (videoUrl) { <video class="video-player" [src]="videoUrl" controls autoplay preload="metadata">Tu navegador no puede reproducir este video.</video> }
            @else { <div class="player-placeholder"><mat-icon>play_circle</mat-icon>Reproduce el video para comprobar que se asoció correctamente.</div> }
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.videos-page{padding:4px 0 28px}.page-heading{display:flex;align-items:center;gap:14px;margin:0 0 20px}.heading-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:13px;background:#fff0e2;color:#b95d12}.heading-icon mat-icon{font-size:24px;width:24px;height:24px}.page-heading small{color:#b45b13;font-size:10px;font-weight:800;letter-spacing:.07em}.page-heading h1{margin:3px 0;color:#172b49;font-size:22px}.page-heading p,.panel-heading p{margin:0;color:#7789a2;font-size:12px}.manager-panel{max-width:1100px;padding:20px;border:1px solid #dfe6ee;border-radius:13px;background:#fff}.panel-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}.panel-heading h2{margin:0 0 4px;color:#243a58;font-size:15px}.admin-tag{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:20px;background:#f1f5f9;color:#62758d;font-size:10px;font-weight:700;white-space:nowrap}.admin-tag mat-icon{font-size:16px;width:16px;height:16px}.manual-select{display:block;max-width:620px}.video-status{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid #dce5ef;border-radius:10px;background:#f8fafc}.video-status.has-video{border-color:#bde7d0;background:#f2fbf6}.status-icon{display:grid;place-items:center;width:38px;height:38px;flex:none;border-radius:10px;background:#eaf1ff;color:#3474bd}.has-video .status-icon{background:#ddf5e8;color:#138354}.status-icon mat-icon{font-size:21px;width:21px;height:21px}.status-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.status-copy strong{color:#243a58;font-size:12px}.status-copy small{overflow-wrap:anywhere;color:#788aa2;font-size:10px}.upload-button{flex:none;color:#a95715!important;border-color:#e7b27f!important}.upload-button mat-icon{margin-right:4px}.file-hint{display:flex;align-items:center;gap:5px;margin:9px 2px 18px;color:#8190a5;font-size:10px}.file-hint mat-icon{font-size:15px;width:15px;height:15px}.message{display:flex;align-items:center;gap:8px;margin:10px 0;padding:10px 12px;border-radius:8px;font-size:11px}.message mat-icon{font-size:18px;width:18px;height:18px}.message.error{background:#fff1f0;color:#b42318}.message.success{background:#edf9f1;color:#13794d}.player-panel{overflow:hidden;border:1px solid #dfe6ee;border-radius:10px}.player-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e8edf3}.player-heading>div{display:flex;flex-direction:column;gap:3px}.player-heading strong{color:#243a58;font-size:12px}.player-heading small{color:#788aa2;font-size:10px}.player-heading button{color:#3e5877}.player-heading button mat-icon{margin-right:4px}.player-placeholder{display:flex;align-items:center;justify-content:center;gap:9px;min-height:170px;background:#f7f9fc;color:#7b8ba1;font-size:11px}.player-placeholder mat-icon{color:#9aabc0}.video-player{display:block;width:100%;max-height:560px;background:#101827}@media(max-width:700px){.manager-panel{padding:14px}.panel-heading{align-items:flex-start;flex-direction:column}.video-status{align-items:flex-start;flex-wrap:wrap}.status-copy{flex-basis:calc(100% - 56px)}.upload-button{margin-left:50px}}
  `],
})
export class VideosManualesComponent implements OnInit, OnDestroy {
  private readonly service = inject(ManualesService);
  private infoRequest?: Subscription;
  private videoRequest?: Subscription;
  private uploadRequest?: Subscription;
  readonly groups: Array<{ name: string; items: ManualOption[] }> = [
    { name: 'Punto de Venta', items: [{ key: 'apertura_caja', title: 'Apertura de caja', group: 'Punto de Venta' }, { key: 'cierre_caja', title: 'Cierre de caja', group: 'Punto de Venta' }] },
    { name: 'Cambios', items: [{ key: 'compra_moneda', title: 'Compra de moneda', group: 'Cambios' }, { key: 'venta_moneda', title: 'Venta de moneda', group: 'Cambios' }, { key: 'reportes_cambio', title: 'Reportes de cambio', group: 'Cambios' }] },
    { name: 'Giro Internacional', items: [{ key: 'enviar_giro_internacional', title: 'Enviar giro internacional', group: 'Giro Internacional' }, { key: 'reportes_giros', title: 'Reportes de giros', group: 'Giro Internacional' }] },
    { name: 'Pago de Remesas', items: [{ key: 'pago_remesa_efectivo', title: 'Pago en efectivo', group: 'Pago de Remesas' }, { key: 'pago_remesa_deposito', title: 'Pago por depósito', group: 'Pago de Remesas' }, { key: 'reporte_pago_remesas', title: 'Reporte de pagos', group: 'Pago de Remesas' }] },
    { name: 'Gestión Efectivo', items: [{ key: 'traspaso_cajero', title: 'Traspaso a Cajero', group: 'Gestión Efectivo' }, { key: 'operaciones_boveda', title: 'Operaciones de Bóveda', group: 'Gestión Efectivo' }] },
    { name: 'Bancos', items: [{ key: 'cuentas_bancarias', title: 'Cuentas bancarias', group: 'Bancos' }, { key: 'traspasos_bancarios', title: 'Traspasos bancarios', group: 'Bancos' }, { key: 'depositos_retiros', title: 'Depósitos y retiros', group: 'Bancos' }, { key: 'movimientos_bancarios', title: 'Movimientos bancarios', group: 'Bancos' }, { key: 'cheques', title: 'Cheques', group: 'Bancos' }, { key: 'conciliacion', title: 'Conciliación', group: 'Bancos' }] },
    { name: 'Egresos e Ingresos', items: [{ key: 'egreso_directo', title: 'Egreso directo', group: 'Egresos e Ingresos' }, { key: 'ingreso_directo', title: 'Ingreso directo', group: 'Egresos e Ingresos' }, { key: 'egreso_autorizado', title: 'Egreso autorizado', group: 'Egresos e Ingresos' }, { key: 'ingreso_autorizado', title: 'Ingreso autorizado', group: 'Egresos e Ingresos' }, { key: 'transaccion_bancaria', title: 'Transacción bancaria', group: 'Egresos e Ingresos' }] },
  ];
  selected = this.groups[0].items[0];
  info: VideoManualInfo | null = null;
  loadingInfo = false;
  loadingVideo = false;
  uploading = false;
  videoUrl: string | null = null;
  error = '';
  success = '';
  maxSizeMb = 10;

  ngOnInit(): void { this.loadInfo(); }
  ngOnDestroy(): void { this.cancelRequests(); this.clearVideo(); }

  selectManual(key: string): void {
    const manual = this.groups.flatMap(group => group.items).find(item => item.key === key);
    if (!manual || manual.key === this.selected.key) return;
    this.selected = manual;
    this.error = '';
    this.success = '';
    this.clearVideo();
    this.loadInfo();
  }

  private loadInfo(): void {
    this.infoRequest?.unsubscribe();
    this.loadingInfo = true;
    this.info = null;
    this.infoRequest = this.service.videoInfo(this.selected.key).subscribe({
      next: result => {
        this.info = result.success && result.data
          ? { ...result.data, actualizado_en: this.normalizeDate(result.data.actualizado_en) }
          : null;
        this.maxSizeMb = this.info?.max_size_mb || 10;
        this.loadingInfo = false;
      },
      error: () => { this.error = 'No se pudo consultar el video de este manual.'; this.loadingInfo = false; },
    });
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith('.mp4') || (file.type && !['video/mp4', 'application/mp4', 'application/octet-stream'].includes(file.type))) { this.error = 'Selecciona un archivo de video MP4 válido.'; return; }
    if (file.size > this.maxSizeMb * 1024 * 1024) { this.error = `El video supera el máximo de ${this.maxSizeMb} MB.`; return; }
    this.error = ''; this.success = ''; this.uploading = true;
    this.uploadRequest?.unsubscribe();
    this.uploadRequest = this.service.subirVideo(this.selected.key, file).subscribe({
      next: response => {
        this.uploading = false;
        if (!response.success) { this.error = response.message || 'No se pudo guardar el video.'; return; }
        this.success = `Video asociado correctamente a “${this.selected.title}”.`;
        this.loadInfo();
      },
      error: err => { this.uploading = false; this.error = this.uploadErrorMessage(err); },
    });
  }

  toggleVideo(): void {
    if (this.videoUrl) { this.clearVideo(); return; }
    this.loadingVideo = true;
    this.videoRequest?.unsubscribe();
    this.videoRequest = this.service.video(this.selected.key).subscribe({
      next: blob => { this.videoUrl = URL.createObjectURL(blob); this.loadingVideo = false; },
      error: () => { this.loadingVideo = false; this.error = 'No se pudo cargar el video para reproducirlo.'; },
    });
  }

  private clearVideo(): void {
    this.videoRequest?.unsubscribe();
    if (this.videoUrl) URL.revokeObjectURL(this.videoUrl);
    this.videoUrl = null;
    this.loadingVideo = false;
  }

  private uploadErrorMessage(err: any): string {
    const errors = err?.error?.errors as Record<string, string[] | string> | undefined;
    const validationMessages = errors ? Object.values(errors).flatMap(value => Array.isArray(value) ? value : [value]) : [];
    if (validationMessages.some(message => message === 'validation.uploaded')) {
      return `PHP no pudo recibir el archivo. El límite de carga del servidor es menor al video o el servidor no tiene espacio temporal disponible. Configura upload_max_filesize y post_max_size para permitir hasta ${this.maxSizeMb} MB.`;
    }
    const detail = errors ? Object.entries(errors).flatMap(([field, messages]) => {
      const label = field === 'video' ? 'Video' : field === 'manual_key' ? 'Manual' : field;
      return (Array.isArray(messages) ? messages : [messages]).map(message => `${label}: ${message}`);
    }).join(' ') : '';
    if (detail) return detail;
    if (err?.status === 413) return `El servidor rechazó el archivo por su tamaño. Reduce el video o aumenta el límite de carga del servidor (actualmente ${this.maxSizeMb} MB).`;
    if (err?.status === 422) return 'El servidor rechazó la carga. Comprueba que elegiste un archivo MP4 válido y que no supere el límite indicado.';
    return err?.error?.message || 'No se pudo subir el video. Verifica el formato y el tamaño.';
  }

  private normalizeDate(value: string | null): string | null {
    if (!value) return null;
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    return Number.isNaN(Date.parse(normalized)) ? null : normalized;
  }

  private cancelRequests(): void { this.infoRequest?.unsubscribe(); this.videoRequest?.unsubscribe(); this.uploadRequest?.unsubscribe(); }
}
