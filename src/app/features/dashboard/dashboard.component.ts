import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface QuickOperation {
  title: string;
  description: string;
  iconPath: string;
  route: string;
  queryParams?: Record<string, string>;
  accent: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="dash">
      <div class="welcome-banner">
        <div class="wb-content">
          <div class="wb-text">
            <h1>Buenos {{ saludo }}, {{ nombreCorto }}</h1>
            <p>{{ fechaHoy }}</p>
          </div>
          <span class="welcome-lock" aria-hidden="true"><mat-icon>lock_outline</mat-icon></span>
        </div>
      </div>

      <section class="quick-operations" aria-label="Accesos r\u00e1pidos">
        <div class="operations-grid">
          @for (operation of operations; track operation.title) {
            <button class="operation-card" type="button" (click)="ir(operation)" [disabled]="operation.disabled" [attr.title]="operation.description" [attr.aria-label]="operation.title + ': ' + operation.description">
              <span class="operation-icon" [style.--accent]="operation.accent"><img [src]="operation.iconPath" alt="" aria-hidden="true"></span>
              <span class="operation-copy">
                <strong>{{ operation.title }}</strong>
              </span>
              <mat-icon class="operation-arrow" aria-hidden="true">chevron_right</mat-icon>
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dash { width: 100%; max-width: none; margin: 0; }
    .welcome-banner { background: linear-gradient(100deg, #f58634 0%, #e16c1c 55%, #c85d18 100%); border-radius: 10px; padding: 10px 18px; margin-bottom: 14px; position: relative; overflow: hidden; }
    .welcome-banner::after { content: ''; position: absolute; width: 210px; height: 210px; right: -75px; top: -90px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.12), transparent 68%); }
    .wb-content { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; }
    .wb-text h1 { margin: 0 0 2px; color: #fff; font-size: 16px; font-weight: 800; letter-spacing: -.2px; }
    .wb-text p { margin: 0; color: rgba(255,255,255,.88); font-size: 10px; font-weight: 600; text-transform: capitalize; }
    .welcome-lock { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; color: rgba(255,255,255,.9); background: rgba(255,255,255,.13); }
    .welcome-lock mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }
    .quick-operations { background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 14px; padding: 18px; }
    .operations-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .operation-card { min-height: 124px; width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px; text-align: left; border: 1px solid var(--border, #e3e8ef); border-radius: 14px; background: var(--card-bg, #fff); color: inherit; cursor: pointer; transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, background .16s ease; }
    .operation-card:hover, .operation-card:focus-visible { border-color: #f1a15d; background: #fffaf5; box-shadow: 0 7px 18px rgba(42, 52, 69, .09); transform: translateY(-2px); outline: none; }
    .operation-card:disabled { cursor: not-allowed; border-color: color-mix(in srgb, var(--text-secondary, #64748b) 18%, var(--card-bg, #fff)); background: color-mix(in srgb, var(--text-secondary, #64748b) 8%, var(--card-bg, #fff)); }
    .operation-card:disabled:hover { border-color: color-mix(in srgb, var(--text-secondary, #64748b) 18%, var(--card-bg, #fff)); background: color-mix(in srgb, var(--text-secondary, #64748b) 8%, var(--card-bg, #fff)); box-shadow: none; transform: none; }
    .operation-card:disabled .operation-icon img { filter: grayscale(.35); opacity: .72; }
    .operation-card:disabled .operation-copy strong { color: var(--text-secondary, #64748b); }
    .operation-icon { --accent: #2563eb; flex: 0 0 7.5vw; display: grid; place-items: center; width: 7.5vw; height: 7.5vw; overflow: hidden; border: 1px solid color-mix(in srgb, var(--accent) 18%, white); border-radius: 15px; background: #fff; }
    .operation-icon img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .operation-copy { min-width: 0; flex: 1; display: flex; align-items: center; }
    .operation-copy strong { color: var(--text-primary, #14213d); font-size: 18px; line-height: 1.2; font-weight: 750; }
    .operation-arrow { flex: 0 0 auto; color: #9aa5b5; transform: scale(1.22); }
    :host-context(html[data-theme='dark']) .quick-operations, :host-context(html[data-theme='dark']) .operation-card { background: var(--card-bg, #1d2633); }
    :host-context(html[data-theme='dark']) .operation-card:not(:disabled):hover, :host-context(html[data-theme='dark']) .operation-card:not(:disabled):focus-visible { background: rgba(245,134,52,.08); border-color: rgba(245,134,52,.6); }
    @media (max-width: 1050px) { .operations-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 620px) { .quick-operations { padding: 12px; } .operations-grid { grid-template-columns: 1fr; gap: 8px; } .operation-card { min-height: 82px; gap: 11px; padding: 10px; } .operation-icon { flex-basis: 60px; width: 60px; height: 60px; border-radius: 12px; } .operation-copy strong { font-size: 14px; } .welcome-banner { margin-bottom: 10px; } }
  `],
})
export class DashboardComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly operations: QuickOperation[] = [
    { title: 'Cambio de moneda', description: 'Compra y venta de divisas', iconPath: '/assets/iconos_servicios_pos/cambios_monedas.png', route: '/cambio', accent: '#2563eb' },
    { title: 'Pagar remesa', description: 'Pagar remesas por ventanilla', iconPath: '/assets/iconos_servicios_pos/pago_remesa.png', route: '/pago-remesa', queryParams: { tipo: 'efectivo' }, accent: '#d97706' },
    { title: 'Pago de Giro Nacional', description: 'Pagar giro por ventanilla', iconPath: '/assets/iconos_servicios_pos/pago_giro_nacional.png', route: '/giro', queryParams: { tab: 'pagar' }, accent: '#7c3aed' },
    { title: 'Recargas de Crédito Pendientes', description: 'Gestionar recargas de crédito', iconPath: '/assets/iconos_servicios_pos/recargas_pendientes.png', route: '/recargas', accent: '#0891b2' },
    { title: 'Ingresos / Egresos de Caja', description: 'Registrar movimiento de caja', iconPath: '/assets/iconos_servicios_pos/ingresos_egresos_dinero.png', route: '/egresos-ingresos', accent: '#16a34a' },
    { title: 'Enviar giro internacional', description: 'Enviar dinero al exterior', iconPath: '/assets/iconos_servicios_pos/remesa.png', route: '/remesa', accent: '#7c3aed' },
    { title: 'Enviar giro nacional', description: 'Giros dentro de Bolivia', iconPath: '/assets/iconos_servicios_pos/giro_nacional.png', route: '/giro', queryParams: { tab: 'enviar' }, accent: '#db2777' },
    { title: 'Recargar de Crédito', description: 'Registrar y pagar una recarga de crédito', iconPath: '/assets/iconos_servicios_pos/nueva_recarga.png', route: '/recargas', queryParams: { vista: 'realizadas', nueva: '1' }, accent: '#0f766e' },
    { title: 'Pago de Servicios', description: 'Pr\u00f3ximamente', iconPath: '/assets/iconos_servicios_pos/pago_servicios.png', route: '', accent: '#f97316', disabled: true },
  ];

  get nombreCorto(): string { return this.auth.user?.nombre?.split(' ').filter(Boolean)[0] || 'Usuario'; }

  get saludo(): string {
    const hour = new Date().getHours();
    return hour < 12 ? 'días' : hour < 18 ? 'tardes' : 'noches';
  }

  get fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  ir(operation: QuickOperation): void {
    if (operation.disabled || !operation.route) return;
    this.router.navigate([operation.route], { queryParams: operation.queryParams });
  }
}
