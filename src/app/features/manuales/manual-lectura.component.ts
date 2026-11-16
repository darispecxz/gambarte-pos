import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ManualesService, VideoManualInfo } from '../../core/manuales.service';

@Component({
  selector: 'app-manual-lectura',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  template: `
    @if (showVideo) {
      <section class="training-video" aria-label="Video de capacitación del manual">
        <div class="training-heading">
          <span class="training-icon"><mat-icon>play_circle</mat-icon></span>
          <div class="training-copy"><strong>Video de capacitación</strong>
            <small>{{ videoInfo?.disponible ? videoInfo?.nombre : 'Material de capacitación para esta guía.' }}</small>
          </div>
          @if (videoInfo?.disponible && !videoOpen) {
            <button type="button" class="training-button" (click)="reproducirVideo()"><mat-icon>play_arrow</mat-icon>Reproducir</button>
          }
          @if (videoOpen) {
            <button type="button" class="training-button training-secondary" (click)="cerrarVideo()"><mat-icon>close</mat-icon>Cerrar</button>
          }
          @if (isAdmin) {
            <input #videoFile type="file" hidden accept="video/mp4,.mp4" (change)="subirVideo($event)">
            <button type="button" class="training-button training-upload" [disabled]="uploading" (click)="videoFile.click()">
              <mat-icon>{{ uploading ? 'hourglass_top' : 'upload' }}</mat-icon>{{ uploading ? 'Subiendo…' : (videoInfo?.disponible ? 'Reemplazar video' : 'Subir video') }}
            </button>
          }
        </div>
        @if (videoInfoLoading) { <p class="training-note">Consultando video asociado…</p> }
        @if (!videoInfoLoading && videoInfoError) { <p class="training-note training-error">No se pudo consultar el video. Verifica la conexión con el servidor.</p> }
        @if (!videoInfoLoading && !videoInfoError && !videoInfo?.disponible && !isAdmin) { <p class="training-note">Todavía no hay un video asociado a este manual.</p> }
        @if (isAdmin) { <p class="training-note">Formato MP4 · Máximo {{ maxVideoMb }} MB.</p> }
        @if (!videoInfoLoading && !videoInfo?.disponible && isAdmin) { <p class="training-note">Aún no hay un video asociado a este manual.</p> }
        @if (videoOpen && videoLoading) { <p class="training-note">Cargando video…</p> }
        @if (videoError) { <p class="training-note training-error">{{ videoError }}</p> }
        @if (videoOpen && videoUrl) {
          <video class="training-player" [src]="videoUrl" controls preload="metadata" playsinline>
            Tu navegador no puede reproducir este video.
          </video>
        }
      </section>
    }
    @if (!videoOnly) {
    <section class="read-confirm" [class.read-done]="!!readAt" aria-live="polite">
      <span class="read-icon"><mat-icon>{{ readAt ? 'task_alt' : 'menu_book' }}</mat-icon></span>
      <div class="read-copy"><strong>{{ readAt ? 'Manual revisado' : '¿Terminaste de revisar este manual?' }}</strong>
        <small>{{ readAt ? ('Lectura confirmada el ' + (readAt | date:'dd/MM/yyyy HH:mm')) : 'Confirma la lectura cuando hayas revisado todos los pasos de la guía.' }}</small>
      </div>
      @if (!readAt) {
        <button type="button" class="read-button" [disabled]="!atEnd || saving" (click)="confirmRead()">
          <mat-icon>{{ saving ? 'hourglass_top' : 'check' }}</mat-icon>{{ saving ? 'Guardando…' : 'Marcar como leído' }}
        </button>
      }
      @if (error) { <small class="read-error">{{ error }}</small> }
      <span #endMarker class="end-marker" aria-hidden="true"></span>
    </section>
    }
  `,
  styles: [`
    .training-video{overflow:hidden;margin:20px 0 12px;border:1px solid #dce5ef;border-radius:11px;background:#fff}.training-heading{display:flex;align-items:center;gap:10px;padding:11px 12px}.training-icon{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:9px;background:#fff0e2;color:#b95a13}.training-icon mat-icon{width:20px;height:20px;font-size:20px}.training-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:3px}.training-copy strong{color:#243a58;font-size:12px}.training-copy small,.training-note{overflow:hidden;color:#7d8fa8;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.training-button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:34px;padding:0 10px;border:1px solid #e6b17f;border-radius:8px;background:#fff8f1;color:#a95715;font:inherit;font-size:10px;font-weight:700;white-space:nowrap;cursor:pointer}.training-button mat-icon{width:17px;height:17px;font-size:17px}.training-button:disabled{opacity:.6;cursor:wait}.training-secondary{border-color:#dce4ed;background:#fff;color:#596d87}.training-upload{border-color:#d9e3ef;background:#fff;color:#475e7a}.training-note{margin:0;padding:0 14px 12px;white-space:normal}.training-error{color:#b42318}.training-player{display:block;width:100%;max-height:520px;aspect-ratio:16/9;border-top:1px solid #e8eef5;background:#101827}.read-confirm{position:relative;display:flex;align-items:center;gap:12px;margin:22px 0 6px;padding:14px 16px;border:1px solid #dce5ef;border-radius:11px;background:#f8fafc}.read-done{border-color:#bde7d0;background:#f1fbf5}.read-icon{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border-radius:10px;background:#fff0e2;color:#c26215}.read-done .read-icon{background:#dcf5e7;color:#16814d}.read-copy{min-width:0;display:flex;flex:1;flex-direction:column;gap:4px}.read-copy strong{color:#243a58;font-size:12px}.read-copy small{color:#72839b;font-size:10px;line-height:1.4}.read-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:37px;padding:0 13px;border:1px solid #e87922;border-radius:8px;background:#fff;color:#a95512;font:inherit;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}.read-button:hover:not(:disabled){background:#fff2e7}.read-button:disabled{border-color:#d9e0e8;background:#eef1f5;color:#98a5b5;cursor:not-allowed}.read-button mat-icon{width:18px;height:18px;font-size:18px}.read-error{position:absolute;left:64px;bottom:-17px;color:#b42318;font-size:10px}.end-marker{position:absolute;right:0;bottom:0;width:1px;height:1px;pointer-events:none}@media(max-width:620px){.training-heading{flex-wrap:wrap}.training-copy{flex-basis:calc(100% - 54px)}.training-button{margin-left:44px}.read-confirm{align-items:flex-start;flex-wrap:wrap}.read-copy{flex-basis:calc(100% - 52px)}.read-button{margin-left:48px}}
  `],
})
export class ManualLecturaComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input({ required: true }) manualKey = '';
  @Input() version = '1';
  @Input() videoOnly = false;
  @Input() showVideo = true;
  @ViewChild('endMarker') endMarker?: ElementRef<HTMLElement>;
  private readonly service = inject(ManualesService);
  private readonly auth = inject(AuthService);
  private observer?: IntersectionObserver;
  private videoInfoRequest?: Subscription;
  private videoRequest?: Subscription;
  private uploadRequest?: Subscription;
  atEnd = false;
  saving = false;
  readAt: string | null = null;
  error = '';
  videoInfo: VideoManualInfo | null = null;
  videoInfoError = false;
  videoInfoLoading = false;
  videoLoading = false;
  videoOpen = false;
  videoUrl: string | null = null;
  videoError = '';
  uploading = false;
  maxVideoMb = 10;
  get isAdmin(): boolean { return this.auth.rol?.id_rol === 2; }

  ngOnInit(): void {
    if (!this.videoOnly) this.loadStatus();
    if (this.showVideo) this.loadVideoInfo();
  }

  ngAfterViewInit(): void {
    if (this.videoOnly || !this.endMarker) return;
    this.observer = new IntersectionObserver(entries => this.atEnd = entries.some(entry => entry.isIntersecting), { threshold: 0.1 });
    this.observer.observe(this.endMarker.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manualKey'] && !changes['manualKey'].firstChange) {
      if (!this.videoOnly) this.loadStatus();
      this.uploadRequest?.unsubscribe();
      this.uploadRequest = undefined;
      this.uploading = false;
      this.resetVideo();
      if (this.showVideo) this.loadVideoInfo();
    }
  }

  private loadStatus(): void {
    if (!this.manualKey) return;
    this.readAt = null;
    this.service.mias().subscribe({
      next: records => this.readAt = records.find(item => item.manual_key === this.manualKey && item.version === this.version)?.leido_en ?? null,
      error: () => this.error = 'No se pudo consultar el estado de lectura. Verifica tu conexión.',
    });
  }

  confirmRead(): void {
    if (!this.atEnd || this.saving || this.readAt) return;
    this.saving = true;
    this.error = '';
    this.service.marcarLeido(this.manualKey, this.version).subscribe({
      next: record => { this.readAt = record.leido_en; this.saving = false; },
      error: () => { this.error = 'No se pudo guardar la confirmación. Inténtalo nuevamente.'; this.saving = false; },
    });
  }

  private loadVideoInfo(): void {
    if (!this.manualKey) return;
    this.videoInfoRequest?.unsubscribe();
    this.videoInfoLoading = true;
    this.videoInfoRequest = this.service.videoInfo(this.manualKey).subscribe({
      next: response => {
        this.videoInfo = response.success ? response.data : null;
        this.videoInfoError = !response.success;
        this.maxVideoMb = response.data?.max_size_mb || 10;
        this.videoInfoLoading = false;
        this.videoInfoRequest = undefined;
      },
      error: () => {
        this.videoInfo = null;
        this.videoInfoError = true;
        this.videoInfoLoading = false;
        this.videoInfoRequest = undefined;
      },
    });
  }

  reproducirVideo(): void {
    if (!this.videoInfo?.disponible || this.videoLoading) return;
    this.videoOpen = true;
    this.videoError = '';
    if (this.videoUrl) return;
    this.videoLoading = true;
    this.videoRequest = this.service.video(this.manualKey).subscribe({
      next: blob => {
        if (!this.videoOpen) return;
        this.videoUrl = URL.createObjectURL(blob);
        this.videoLoading = false;
        this.videoRequest = undefined;
      },
      error: () => {
        this.videoLoading = false;
        this.videoError = 'No se pudo cargar el video. Inténtalo nuevamente.';
        this.videoRequest = undefined;
      },
    });
  }

  cerrarVideo(): void { this.resetVideo(); }

  subirVideo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith('.mp4')) {
      this.videoError = 'Selecciona un archivo MP4.';
      return;
    }
    if (archivo.size > this.maxVideoMb * 1024 * 1024) {
      this.videoError = `El video supera el máximo permitido de ${this.maxVideoMb} MB.`;
      return;
    }

    this.videoError = '';
    this.uploading = true;
    this.uploadRequest = this.service.subirVideo(this.manualKey, archivo).subscribe({
      next: response => {
        this.uploading = false;
        if (!response.success) {
          this.videoError = response.message || 'No se pudo asociar el video al manual.';
          return;
        }
        this.resetVideo();
        this.videoInfo = {
          disponible: true,
          nombre: response.data.nombre,
          tamano_bytes: response.data.tamano_bytes,
          actualizado_en: response.data.actualizado_en,
          max_size_mb: this.maxVideoMb,
        };
        this.uploadRequest = undefined;
      },
      error: err => {
        this.uploading = false;
        this.videoError = err?.error?.message || 'No se pudo subir el video. Revisa el formato y el tamaño.';
        this.uploadRequest = undefined;
      },
    });
  }

  private resetVideo(): void {
    this.videoRequest?.unsubscribe();
    this.videoRequest = undefined;
    if (this.videoUrl) URL.revokeObjectURL(this.videoUrl);
    this.videoUrl = null;
    this.videoOpen = false;
    this.videoLoading = false;
    this.videoError = '';
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.videoInfoRequest?.unsubscribe();
    this.uploadRequest?.unsubscribe();
    this.resetVideo();
  }
}
