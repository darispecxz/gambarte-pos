import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';

type BancosSeccion = 'cuentas' | 'banca' | 'traspasos' | 'depositos' | 'movimientos' | 'cheques' | 'conciliacion' | 'reportes';

/** Contenedor del módulo. Cada sección se resuelve en una subruta propia. */
@Component({
  selector: 'app-bancos',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ConfirmDialogComponent],
  templateUrl: './bancos.component.html',
  styles: [`
    :host { display: block; }
    .ban-page { padding: 16px; margin: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: var(--text-primary, #373435); margin: 0 0 16px; }
  `],
})
export class BancosComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private routeSub?: Subscription;

  private readonly secciones: BancosSeccion[] = [
    'cuentas', 'banca', 'traspasos', 'depositos', 'movimientos', 'cheques', 'conciliacion', 'reportes',
  ];

  ngOnInit(): void {
    // Compatibilidad con enlaces antiguos como /bancos?tab=movimientos&cuenta=...
    // Se convierten a subruta solo si aún no hay una sección en la URL. Si ya
    // existe, la subruta tiene prioridad y simplemente se elimina el tab redundante.
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const urlTree = this.router.parseUrl(this.router.url);
      const segmentos = urlTree.root.children['primary']?.segments.map(segmento => segmento.path) ?? [];
      const seccionActual = segmentos[1] as BancosSeccion | undefined;
      const destinoLegacy = params.get('tab') as BancosSeccion | null;

      if (params.has('tab')) {
        const queryParams = { ...this.route.snapshot.queryParams };
        delete queryParams['tab'];
        const seccion = !seccionActual && destinoLegacy && this.secciones.includes(destinoLegacy)
          ? destinoLegacy
          : seccionActual;

        this.router.navigate(seccion ? ['/bancos', seccion] : ['/bancos', 'cuentas'], {
          queryParams,
          replaceUrl: true,
        });
        return;
      }

      // La ruta raíz del módulo lleva al listado principal de cuentas.
      if (!seccionActual && segmentos.length <= 1) {
        this.router.navigate(['/bancos', 'cuentas'], { replaceUrl: true });
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }
}
