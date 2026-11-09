import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackSwal } from '../shared/notify';
import { BankingService } from '../../../core/banking.service';
import { BancosStore } from '../bancos.store';
import { BankLogoComponent } from '../shared/bank-logo.component';

/** Resumen de cuentas: KPIs, saldos por entidad × moneda y exportación. */
@Component({
  selector: 'app-bancos-reportes',
  standalone: true,
  imports: [CommonModule, BankLogoComponent],
  styleUrls: ['../bancos-ui.scss'],
  templateUrl: './reportes.component.html',
})
export class ReportesComponent implements OnInit {
  store = inject(BancosStore);
  private banking = inject(BankingService);
  private snack = inject(SnackSwal);

  pendientes = 0;
  chequesCirc = 0;
  chequesRecibir = 0;

  ngOnInit(): void { this.store.cargarCatalogos(); this.recargar(); }

  recargar(): void {
    this.store.refrescarCuentas();
    this.banking.traspasosPendientes().subscribe({ next: r => this.pendientes = r.total, error: () => {} });
    this.banking.enviosPendientes().subscribe({ next: r => this.chequesRecibir = r.total, error: () => {} });
    this.banking.chequesAgencia().subscribe({ next: r => this.chequesCirc = r.total, error: () => {} });
  }

  get monedas(): string[] {
    const set = new Set<string>();
    for (const c of this.store.cuentas()) set.add(c.moneda);
    return Array.from(set).sort();
  }

  get filas(): { entidad: string; cuentas: number; porMoneda: Record<string, number> }[] {
    const map = new Map<string, { entidad: string; cuentas: number; porMoneda: Record<string, number> }>();
    for (const c of this.store.cuentas()) {
      let f = map.get(c.entidad);
      if (!f) { f = { entidad: c.entidad, cuentas: 0, porMoneda: {} }; map.set(c.entidad, f); }
      f.cuentas++;
      f.porMoneda[c.moneda] = (f.porMoneda[c.moneda] || 0) + c.saldo;
    }
    return Array.from(map.values()).sort((a, b) => a.entidad.localeCompare(b.entidad));
  }

  totalMoneda(m: string): number {
    return this.store.cuentas().filter(c => c.moneda === m).reduce((s, c) => s + c.saldo, 0);
  }

  exportarCsv(): void {
    const filas = this.store.cuentas();
    if (!filas.length) return;
    const encabezado = ['Agencia', 'Entidad', 'Cuenta', 'Tipo', 'Moneda', 'Saldo', 'Subcuenta'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lineas = [encabezado.join(',')];
    for (const c of filas) {
      lineas.push([c.agencia, c.entidad, c.num_cuenta, c.tipo_cuenta_abr, c.moneda, c.saldo.toFixed(2), c.codsubcuenta].map(esc).join(','));
    }
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuentas-bancarias-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.snack.open('CSV generado', 'OK', { duration: 3000 });
  }
}
