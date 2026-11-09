import { DatePipe } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ManualesService } from '../../core/manuales.service';

@Component({
  selector: 'app-manual-lectura',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  template: `
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
  `,
  styles: [`
    .read-confirm{position:relative;display:flex;align-items:center;gap:12px;margin:22px 0 6px;padding:14px 16px;border:1px solid #dce5ef;border-radius:11px;background:#f8fafc}.read-done{border-color:#bde7d0;background:#f1fbf5}.read-icon{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border-radius:10px;background:#fff0e2;color:#c26215}.read-done .read-icon{background:#dcf5e7;color:#16814d}.read-copy{min-width:0;display:flex;flex:1;flex-direction:column;gap:4px}.read-copy strong{color:#243a58;font-size:12px}.read-copy small{color:#72839b;font-size:10px;line-height:1.4}.read-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:37px;padding:0 13px;border:1px solid #e87922;border-radius:8px;background:#fff;color:#a95512;font:inherit;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}.read-button:hover:not(:disabled){background:#fff2e7}.read-button:disabled{border-color:#d9e0e8;background:#eef1f5;color:#98a5b5;cursor:not-allowed}.read-button mat-icon{width:18px;height:18px;font-size:18px}.read-error{position:absolute;left:64px;bottom:-17px;color:#b42318;font-size:10px}.end-marker{position:absolute;right:0;bottom:0;width:1px;height:1px;pointer-events:none}@media(max-width:620px){.read-confirm{align-items:flex-start;flex-wrap:wrap}.read-copy{flex-basis:calc(100% - 52px)}.read-button{margin-left:48px}}
  `],
})
export class ManualLecturaComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) manualKey = '';
  @Input() version = '1';
  @ViewChild('endMarker', { static: true }) endMarker!: ElementRef<HTMLElement>;
  private readonly service = inject(ManualesService);
  private observer?: IntersectionObserver;
  atEnd = false;
  saving = false;
  readAt: string | null = null;
  error = '';

  ngOnInit(): void {
    this.observer = new IntersectionObserver(entries => this.atEnd = entries.some(entry => entry.isIntersecting), { threshold: 0.1 });
    this.observer.observe(this.endMarker.nativeElement);
    this.loadStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manualKey'] && !changes['manualKey'].firstChange) this.loadStatus();
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

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
