import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  template: `
    <main class="page">
      <header class="page-head">
        <div class="eyebrow">ADMINISTRACIÓN</div>
        <h1>Centro de configuración</h1>
        <p>Accede únicamente a las opciones habilitadas para tu rol.</p>
      </header>

      <section class="access-summary">
        <span class="summary-icon"><mat-icon>verified_user</mat-icon></span>
        <div>
          <strong>{{ roleLabel }}</strong>
          <p>{{ accessDescription }}</p>
        </div>
        <span class="scope">{{ scopeLabel }}</span>
      </section>

      <section class="settings-section">
        <div class="section-head">
          <div><span class="section-kicker">CONFIGURACIÓN OPERATIVA</span><h2>Cotizaciones</h2></div>
          <span class="available">2 opciones disponibles</span>
        </div>

        <div class="settings-grid">
          <a class="setting-card" routerLink="/gestion-cotizaciones">
            <span class="card-icon rates"><mat-icon>currency_exchange</mat-icon></span>
            <span class="card-copy">
              <strong>Cotizaciones de monedas</strong>
              <small>{{ ratesDescription }}</small>
              <span class="card-scope"><mat-icon>location_on</mat-icon>{{ scopeLabel }}</span>
            </span>
            <mat-icon class="arrow">arrow_forward</mat-icon>
          </a>

          <a class="setting-card" routerLink="/cotizaciones-programadas">
            <span class="card-icon schedule"><mat-icon>event_repeat</mat-icon></span>
            <span class="card-copy">
              <strong>Cotizaciones programadas</strong>
              <small>{{ scheduledDescription }}</small>
              <span class="card-scope"><mat-icon>location_on</mat-icon>{{ scopeLabel }}</span>
            </span>
            <mat-icon class="arrow">arrow_forward</mat-icon>
          </a>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:#f7f9fc}.page{max-width:1120px;margin:0 auto;padding:34px 34px 54px}.page-head{margin-bottom:22px}.eyebrow,.section-kicker{color:#a75b17;font-size:10px;font-weight:800;letter-spacing:.08em}.page-head h1{margin:6px 0 7px;color:#172b4d;font-size:27px;letter-spacing:-.02em}.page-head p{margin:0;color:#788aa2;font-size:13px}.access-summary{display:flex;align-items:center;gap:13px;padding:15px 17px;margin-bottom:24px;border:1px solid #dfe7ef;border-radius:12px;background:#fff;box-shadow:0 3px 12px rgba(33,59,89,.04)}.summary-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:#fff1e7;color:#c76116}.summary-icon mat-icon{width:21px;height:21px;font-size:21px}.access-summary div{flex:1}.access-summary strong{display:block;color:#243a58;font-size:13px}.access-summary p{margin:3px 0 0;color:#7d8fa5;font-size:11px}.scope,.card-scope,.available{display:inline-flex;align-items:center;border-radius:20px;white-space:nowrap}.scope{padding:6px 10px;background:#edf4ff;color:#376c9e;font-size:10px;font-weight:700}.settings-section{padding:20px;border:1px solid #dfe7ef;border-radius:14px;background:#fff}.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:15px}.section-head h2{margin:5px 0 0;color:#243a58;font-size:17px}.available{padding:6px 9px;background:#f2f5f8;color:#71849a;font-size:10px}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.setting-card{display:grid;grid-template-columns:48px minmax(0,1fr) 24px;align-items:center;gap:13px;min-height:116px;padding:16px;border:1px solid #dfe7ef;border-radius:12px;background:#fbfcfe;color:inherit;text-decoration:none;transition:border-color .15s,box-shadow .15s,transform .15s}.setting-card:hover{border-color:#efaa77;box-shadow:0 7px 20px rgba(33,59,89,.09);transform:translateY(-1px)}.card-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:11px}.card-icon.rates{background:#eaf4ff;color:#3471ad}.card-icon.schedule{background:#fff1e5;color:#c8661c}.card-icon mat-icon{width:23px;height:23px;font-size:23px}.card-copy strong,.card-copy small{display:block}.card-copy strong{color:#213754;font-size:14px}.card-copy small{min-height:31px;margin-top:5px;color:#7e90a6;font-size:11px;line-height:1.4}.card-scope{gap:3px;margin-top:9px;padding:4px 8px;background:#f0f4f8;color:#60758d;font-size:9px;font-weight:700}.card-scope mat-icon{width:12px;height:12px;font-size:12px}.arrow{color:#93a2b4;font-size:20px}.setting-card:hover .arrow{color:#e87928}@media(max-width:720px){.page{padding:22px 17px 40px}.access-summary{align-items:flex-start;flex-wrap:wrap}.scope{margin-left:53px}.settings-section{padding:15px}.settings-grid{grid-template-columns:1fr}.section-head{align-items:flex-start;flex-direction:column}.available{display:none}}@media(max-width:420px){.setting-card{grid-template-columns:42px minmax(0,1fr) 20px;padding:13px}.card-icon{width:40px;height:40px}}
  `],
})
export class ConfiguracionComponent {
  private auth = inject(AuthService);

  get roleId(): number { return this.auth.rol?.id_rol ?? 0; }
  get isAdmin(): boolean { return [1, 2].includes(this.roleId); }
  get roleLabel(): string {
    if (this.isAdmin) return 'Acceso administrativo';
    if (this.roleId === 4) return 'Acceso de responsable de agencia';
    return 'Acceso operativo de cajero';
  }
  get scopeLabel(): string { return this.isAdmin ? 'Todas las agencias' : 'Mi agencia'; }
  get accessDescription(): string {
    if (this.isAdmin) return 'Puedes consultar agencias, publicar tasas globales y revisar todo el historial.';
    if (this.roleId === 4) return 'Puedes administrar las cotizaciones de la agencia que tienes asignada.';
    return 'Solo puedes consultar y actualizar las cotizaciones correspondientes a tu agencia.';
  }
  get ratesDescription(): string {
    return this.isAdmin
      ? 'Consulta, actualiza y publica tasas por agencia o de forma global.'
      : 'Consulta y ajusta las tasas vigentes de tu propia agencia.';
  }
  get scheduledDescription(): string {
    return this.isAdmin
      ? 'Consulta y programa publicaciones para todas las agencias.'
      : 'Consulta, programa y descarga cotizaciones de tu agencia.';
  }
}
