import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth.service';
import { CuentaPos, CuentaService, PreferenciasCuenta } from '../../core/cuenta.service';

@Component({
  selector: 'app-cuenta', standalone: true, imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="head"><div><h1>Mi cuenta</h1><p>Personaliza cómo trabajas en el Punto de Venta.</p></div></div>
    <div class="layout" *ngIf="!loading; else wait">
      <section class="card profile"><div class="avatar">{{ iniciales }}</div><div><h2>{{ auth.user?.nombre }}</h2><p>{{ auth.user?.email }}</p><span>Usuario {{ auth.user?.login }}</span></div></section>
      <section class="card"><h2>Preferencias</h2><p class="hint">Estas opciones se guardan exclusivamente para tu usuario.</p>
        <label>Apariencia</label><div class="choices"><button *ngFor="let t of temas" [class.selected]="config.apariencia===t.id" (click)="config.apariencia=t.id">{{t.label}}</button></div>
        <label for="inicio">Vista al iniciar sesión</label><select id="inicio" [(ngModel)]="config.inicio"><option value="dashboard">Inicio</option><option value="caja">Apertura / Cierre de Caja</option><option value="cambio">Cambio de moneda</option></select>
        <button class="primary" (click)="guardar()" [disabled]="saving">{{ saving ? 'Guardando…' : 'Guardar preferencias' }}</button>
      </section>
      <section class="card signature"><h2>Firma digital</h2><p class="hint">Se incorporará en los reportes generados desde el POS, como apertura y cierre de caja.</p>
        <div class="sign-status" *ngIf="cuenta?.firma; else noFirma"><b>{{ cuenta?.firma?.nombre }}</b><span>Firma registrada</span></div><ng-template #noFirma><div class="sign-status empty">Aún no registraste una firma.</div></ng-template>
        <label class="upload"><input type="file" accept="image/png,.png" (change)="seleccionarFirma($event)"><span>Seleccionar firma PNG</span><small>PNG · máximo 2 MB</small></label>
        <button class="primary" (click)="subirFirma()" [disabled]="!archivo || uploading">{{ uploading ? 'Cargando…' : 'Guardar firma digital' }}</button>
      </section>
    </div><ng-template #wait><div class="loading">Cargando cuenta…</div></ng-template>
  `,
  styles: [`:host{display:block}.head{margin-bottom:24px}.head h1{margin:0;color:#14223d;font-size:26px}.head p,.hint{color:#71819a;margin:6px 0 0}.layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{background:#fff;border:1px solid #e1e7ef;border-radius:14px;padding:24px;box-shadow:0 4px 18px #19345b0a}.profile{grid-column:1/-1;display:flex;align-items:center;gap:16px}.avatar{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#ff8700;color:#fff;font-weight:800;font-size:18px}.profile h2,.card h2{margin:0;color:#1b2a45;font-size:18px}.profile p{margin:4px 0;color:#61708a}.profile span{font-size:12px;color:#8a98ad}.card label{display:block;font-size:13px;font-weight:700;color:#40516b;margin:20px 0 8px}.choices{display:flex;gap:8px}.choices button{border:1px solid #d7e0ea;background:#f8fafc;border-radius:8px;padding:9px 14px;color:#516079;cursor:pointer}.choices button.selected{background:#17253f;color:#fff;border-color:#17253f}select{width:100%;border:1px solid #d7e0ea;border-radius:8px;padding:10px;background:#fff;color:#334155}.check{font-weight:500!important}.check input{accent-color:#ff8700}.primary{margin-top:20px;border:0;border-radius:8px;padding:10px 15px;background:#ff8700;color:#fff;font-weight:700;cursor:pointer}.primary:disabled{opacity:.55;cursor:wait}.upload{border:1px dashed #b9c6d5;border-radius:10px;padding:17px;text-align:center;cursor:pointer;background:#f8fafc}.upload input{display:none}.upload span{display:block;color:#1f5fa5;font-weight:700}.upload small{display:block;color:#71819a;margin-top:5px}.sign-status{border-left:3px solid #20a65a;background:#f3fbf6;padding:11px 13px;margin:15px 0}.sign-status b,.sign-status span{display:block}.sign-status span{font-size:12px;color:#548166;margin-top:3px}.sign-status.empty{border-color:#b6c0cd;background:#f7f9fb;color:#71819a}.loading{padding:50px;text-align:center;color:#71819a}@media(max-width:760px){.layout{grid-template-columns:1fr}.profile{grid-column:auto}}`],
})
export class CuentaComponent implements OnInit {
  auth = inject(AuthService); private cuentaService = inject(CuentaService); private snack = inject(MatSnackBar);
  loading = true; saving = false; uploading = false; archivo: File | null = null; cuenta: CuentaPos | null = null;
  config: PreferenciasCuenta = { apariencia: 'system', inicio: 'dashboard', menu_compacto: false };
  temas: { id: PreferenciasCuenta['apariencia']; label: string }[] = [{id:'light',label:'Claro'},{id:'dark',label:'Oscuro'},{id:'system',label:'Sistema'}];
  get iniciales(): string { return (this.auth.user?.nombre || '?').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
  ngOnInit(): void { this.cuentaService.obtener().subscribe({next: c=>{this.cuenta=c;this.config={...c.configuracion};this.loading=false;},error: e=>{this.loading=false;this.msg(e.message || 'No se pudo cargar la cuenta');}}); }
  guardar(): void { this.saving=true; this.cuentaService.guardar(this.config).subscribe({next:c=>{this.cuenta=c;this.saving=false;try{localStorage.setItem('pos_theme_mode',this.config.apariencia);const dark=this.config.apariencia==='dark'||(this.config.apariencia==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light');window.dispatchEvent(new Event('pos-preferences-updated'));}catch{}this.msg('Preferencias guardadas');},error:e=>{this.saving=false;this.msg(e.message || 'No se pudieron guardar');}}); }
  seleccionarFirma(e: Event): void { const f=(e.target as HTMLInputElement).files?.[0] || null; if(f && f.type!=='image/png'){this.msg('La firma debe estar en formato PNG');return;} if(f && f.size>2*1024*1024){this.msg('La firma no puede superar 2 MB');return;} this.archivo=f; }
  subirFirma(): void { if(!this.archivo)return;this.uploading=true;this.cuentaService.subirFirma(this.archivo).subscribe({next:c=>{this.cuenta=c;this.archivo=null;this.uploading=false;this.msg('Firma digital actualizada');},error:e=>{this.uploading=false;this.msg(e.message || 'No se pudo cargar la firma');}}); }
  private msg(message:string):void{this.snack.open(message,'Cerrar',{duration:3500});}
}
