import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SnackSwal } from '../shared/notify';
import {
  BankingService, EstadoBanca, GrupoBanca, CuentaBancaEstado, CuentaBanco,
} from '../../../core/banking.service';
import { BancosStore } from '../bancos.store';
import { BankLogoComponent } from '../shared/bank-logo.component';
import { ConciliacionComponent } from '../conciliacion/conciliacion.component';

/**
 * Apertura y cierre de banca (arqueo). El monto de apertura/cierre es el saldo
 * absoluto de la cuenta, no un movimiento; el descuadre del cierre se registra
 * con su motivo y se arrastra al día siguiente.
 */
@Component({
  selector: 'app-bancos-banca',
  standalone: true,
  imports: [CommonModule, FormsModule, BankLogoComponent, ConciliacionComponent],
  styleUrls: ['../bancos-ui.scss'],
  templateUrl: './banca.component.html',
})
export class BancaComponent implements OnInit {
  private banking = inject(BankingService);
  store = inject(BancosStore);
  private snack = inject(SnackSwal);

  banca: EstadoBanca | null = null;
  montosBanca: { [clave: string]: number | string | null } = {};
  motivosBanca: { [clave: string]: string } = {};
  errorBanca = '';
  guardando = false;

  /** Claves de bancos con parser de extracto (p. ej. 'ganadero', 'bisa'). */
  private clavesSoportadas: string[] = [];
  /** Cuenta cuyo panel de conciliación está abierto en el cierre. */
  conciliando: string | null = null;

  ngOnInit(): void {
    this.loadBanca();
    this.store.cargarCatalogos();
    this.store.refrescarCuentas();
    this.banking.conciliacionCatalogos().subscribe({
      next: r => this.clavesSoportadas = r.bancos.map(b => b.clave),
      error: () => { /* la conciliación simplemente no se ofrece */ },
    });
  }

  /** ¿La entidad tiene parser de extracto para conciliar al cerrar? */
  soportaConciliacion(entidad: string): boolean {
    const e = (entidad || '').toUpperCase();
    return this.clavesSoportadas.some(k => e.includes(k.toUpperCase()));
  }

  /** Resuelve la cuenta completa (con codsubcuenta) de una cuenta del arqueo. */
  cuentaBancoDe(c: CuentaBancaEstado): CuentaBanco | undefined {
    return this.store.cuentas().find(x =>
      x.num_cuenta === c.num_cuenta && x.id_moneda === c.id_moneda && x.id_entidad === c.id_entidad);
  }

  toggleConciliar(c: CuentaBancaEstado): void {
    this.conciliando = this.conciliando === c.clave ? null : c.clave;
  }

  loadBanca(): void {
    this.banking.estadoBanca().subscribe({
      next: r => {
        this.banca = r;
        for (const c of r.cuentas) {
          if (!(c.clave in this.montosBanca) || this.montosBanca[c.clave] === null) {
            this.montosBanca[c.clave] = c.saldo_actual;
          }
          if (!(c.clave in this.motivosBanca)) this.motivosBanca[c.clave] = '';
        }
      },
      error: e => this.snack.open(e.message || 'Error al cargar el estado de la banca', 'OK', { duration: 5000 }),
    });
  }

  cuentasDeGrupo(g: GrupoBanca): CuentaBancaEstado[] {
    if (!this.banca) return [];
    return this.banca.cuentas.filter(c => g.claves.includes(c.clave));
  }

  bancaLabel(estado: string): string {
    switch (estado) {
      case 'abierta': return 'Abierta';
      case 'cerrada': return 'Cerrada';
      case 'parcial': return 'Parcial';
      default:        return 'Sin abrir';
    }
  }

  bancaClass(e: string): string {
    switch (e) {
      case 'abierta': return 'ok';
      case 'cerrada': return 'info';
      case 'parcial': return 'warn';
      default:        return '';
    }
  }

  diferenciaCuenta(c: CuentaBancaEstado): number | null {
    if (c.estado === 'cerrada') return c.diferencia;
    if (c.estado !== 'abierta') return null;
    const v = this.montosBanca[c.clave];
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    return Number((n - Number(c.saldo_actual)).toFixed(2));
  }

  descuadreCuenta(c: CuentaBancaEstado): boolean {
    const d = this.diferenciaCuenta(c);
    return d !== null && Math.abs(d) > 0.009;
  }

  private clavesParaAbrir(g: GrupoBanca): string[] {
    return this.cuentasDeGrupo(g).filter(c => c.estado === 'sin_abrir').map(c => c.clave);
  }

  private clavesParaCerrar(g: GrupoBanca): string[] {
    return this.cuentasDeGrupo(g).filter(c => c.estado === 'abierta').map(c => c.clave);
  }

  abrirGrupo(g: GrupoBanca): void { this.abrirBanca(this.clavesParaAbrir(g)); }

  abrirTodo(): void {
    if (!this.banca) return;
    this.abrirBanca(this.banca.cuentas.filter(c => c.estado === 'sin_abrir').map(c => c.clave));
  }

  private abrirBanca(claves: string[]): void {
    if (!claves.length) { this.errorBanca = 'No hay cuentas pendientes de apertura.'; return; }
    const montos: { [k: string]: number } = {};
    for (const k of claves) {
      const v = this.montosBanca[k];
      if (v !== null && v !== undefined && v !== '' && !isNaN(Number(v))) montos[k] = Number(v);
    }
    this.errorBanca = '';
    this.guardando = true;
    this.banking.abrirBanca(claves, montos).subscribe({
      next: r => {
        this.guardando = false;
        this.snack.open(r?.message || 'Banca abierta', 'OK', { duration: 5000 });
        if (r?.faltantes?.length) {
          this.errorBanca = 'Atención: ' + r.faltantes.length + ' cuenta(s) sin arqueo anterior. El saldo de apertura se tomó del libro.';
        }
        this.loadBanca(); this.store.refrescarCuentas();
      },
      error: e => { this.guardando = false; this.errorBanca = e.message || 'No se pudo abrir la banca'; },
    });
  }

  cerrarGrupo(g: GrupoBanca): void { this.cerrarBanca(this.clavesParaCerrar(g)); }

  private cerrarBanca(claves: string[]): void {
    if (!claves.length) { this.errorBanca = 'No hay cuentas abiertas para cerrar.'; return; }
    const montos: { [k: string]: number } = {};
    const glosas: { [k: string]: string } = {};
    const sinMonto: string[] = [];
    for (const k of claves) {
      const v = this.montosBanca[k];
      if (v === null || v === undefined || v === '') { sinMonto.push(k); continue; }
      const n = Number(v);
      if (isNaN(n)) { sinMonto.push(k); continue; }
      montos[k] = n;
      const motivo = (this.motivosBanca[k] || '').trim();
      if (motivo) glosas[k] = motivo;
    }
    if (sinMonto.length) { this.errorBanca = 'Falta el monto contado en ' + sinMonto.length + ' cuenta(s).'; return; }

    const faltanMotivos: string[] = [];
    for (const k of claves) {
      const c = (this.banca?.cuentas || []).find(x => x.clave === k);
      if (!c) continue;
      const dif = Number((montos[k] - Number(c.saldo_actual)).toFixed(2));
      if (Math.abs(dif) > 0.009 && !(glosas[k] || '').trim()) faltanMotivos.push(c.num_cuenta);
    }
    if (faltanMotivos.length) { this.errorBanca = 'Indique el motivo del descuadre en: ' + faltanMotivos.join(', ') + '.'; return; }

    this.errorBanca = '';
    this.guardando = true;
    this.banking.cerrarBanca(claves, montos, glosas).subscribe({
      next: r => {
        this.guardando = false;
        this.snack.open(r?.message || 'Banca cerrada', 'OK', { duration: 6000 });
        const det = (r?.detalle || []).filter(d => d.descuadrado);
        if (det.length) {
          const txt = det.map(d => `${d.num_cuenta}: ${d.diferencia > 0 ? 'sobrante' : 'faltante'} ${Math.abs(d.diferencia).toFixed(2)}`).join(' · ');
          this.snack.open('Diferencias: ' + txt, 'OK', { duration: 9000 });
        }
        for (const k of claves) { this.montosBanca[k] = null; this.motivosBanca[k] = ''; }
        this.loadBanca(); this.store.refrescarCuentas();
      },
      error: e => { this.guardando = false; this.errorBanca = e.message || 'No se pudo cerrar la banca'; },
    });
  }
}
