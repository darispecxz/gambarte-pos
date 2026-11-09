import { Injectable, computed, inject, signal } from '@angular/core';
import { BankingService, CuentaBanco, AgenciaOpcion } from '../../core/banking.service';
import { CajeroService } from '../../core/cajero.service';
import { CajaInfo } from '../../core/models';

/**
 * Estado compartido del módulo Bancos.
 *
 * Varias pestañas necesitan los mismos catálogos (cuentas, agencias, cajas).
 * Centralizarlos aquí evita que cada componente los vuelva a pedir al cambiar
 * de pestaña y mantiene una sola fuente de verdad: cuando una operación mueve
 * saldos, basta con llamar `refrescarCuentas()` y todas las vistas reaccionan.
 */
@Injectable({ providedIn: 'root' })
export class BancosStore {
  private banking = inject(BankingService);
  private cajero = inject(CajeroService);

  readonly cuentas = signal<CuentaBanco[]>([]);
  readonly agencias = signal<AgenciaOpcion[]>([]);
  readonly misAgencias = signal<AgenciaOpcion[]>([]);
  readonly cajas = signal<CajaInfo[]>([]);
  readonly cargandoCuentas = signal(false);
  readonly verTodas = signal(false);

  /** Primera agencia propia del cajero (la "mía"). */
  readonly miAgencia = computed(() => this.misAgencias()[0]?.id_agencia ?? 0);

  /** Cajas con sesión abierta hoy. */
  readonly cajasAbiertas = computed(() => this.cajas().filter(c => c.sesion_hoy?.estado === 'abierta'));

  private catalogosListos = false;

  /** Carga agencias y cajas una sola vez por sesión del módulo. */
  cargarCatalogos(forzar = false): void {
    if (this.catalogosListos && !forzar) return;
    this.catalogosListos = true;

    this.banking.agencias().subscribe({
      next: r => this.agencias.set(r.agencias),
      error: () => { this.catalogosListos = false; },
    });
    this.refrescarCajas();
  }

  refrescarCajas(): void {
    this.cajero.misCajas().subscribe({
      next: cajas => {
        this.cajas.set(cajas);
        const mias: AgenciaOpcion[] = [];
        for (const caja of cajas) {
          if (!mias.some(a => a.id_agencia === caja.id_agencia)) {
            mias.push({ id_agencia: caja.id_agencia, descripcion: caja.agencia });
          }
        }
        this.misAgencias.set(mias);
      },
      error: () => { /* el usuario puede no tener cajas */ },
    });
  }

  /** (Re)carga las cuentas bancarias; respeta el modo "ver todas las agencias". */
  refrescarCuentas(): void {
    this.cargandoCuentas.set(true);
    this.banking.cuentas(this.verTodas()).subscribe({
      next: r => { this.cuentas.set(r.cuentas); this.cargandoCuentas.set(false); },
      error: () => { this.cargandoCuentas.set(false); },
    });
  }

  setVerTodas(v: boolean): void {
    this.verTodas.set(v);
    this.refrescarCuentas();
  }

  /** Clave canónica de una cuenta (usada por traspasos y depósitos). */
  static keyCuenta(c: CuentaBanco): string {
    return `${c.id_agencia}|${c.id_entidad}|${c.id_tipo_cuenta}|${c.num_cuenta}|${c.id_moneda}`;
  }
}
